document.addEventListener('DOMContentLoaded', () => {
    // キャンバスの設定
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // ゲーム状態
    let gameStarted = false;
    let gameOver = false;
    let score = 0;
    let highScore = localStorage.getItem('flappyHighScore') || 0;
    
    // 画像の読み込み
    const sprites = new Image();
    sprites.src = 'sprites.png';
    
    // ゲーム設定
    const gravity = 0.25;
    const jumpForce = -4.6;
    const pipeGap = 85;
    const pipeWidth = 52;
    
    // 背景
    const background = {
        x: 0,
        y: 0,
        width: 320,
        height: 480,
        draw: function() {
            ctx.fillStyle = '#70c5ce';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    };
    
    // 地面
    const ground = {
        x: 0,
        y: canvas.height - 112,
        width: canvas.width,
        height: 112,
        dx: 2,
        
        update: function() {
            if (gameStarted && !gameOver) {
                this.x = (this.x - this.dx) % (this.width / 2);
            }
        },
        
        draw: function() {
            ctx.fillStyle = '#ded895';
            ctx.fillRect(0, this.y, canvas.width, this.height);
            
            ctx.fillStyle = '#33a357';
            ctx.fillRect(0, this.y, canvas.width, 20);
        }
    };
    
    // 鳥
    const bird = {
        x: 50,
        y: 150,
        width: 34,
        height: 24,
        radius: 12,
        frame: 0,
        velocity: 0,
        animation: [0, 1, 2, 1],
        animationSpeed: 0,
        rotation: 0,
        gravity: gravity,
        jump: jumpForce,
        
        update: function() {
            // 羽ばたきアニメーション
            const period = gameStarted ? 5 : 10;
            this.animationSpeed++;
            if (this.animationSpeed % period === 0) {
                this.frame = (this.frame + 1) % this.animation.length;
            }
            
            if (gameStarted) {
                this.velocity += this.gravity;
                this.y += this.velocity;
                
                // 回転
                if (this.velocity >= 5) {
                    this.rotation = Math.PI / 4;
                } else if (this.velocity >= 0) {
                    this.rotation = 0;
                } else {
                    this.rotation = -Math.PI / 6;
                }
                
                // 地面との衝突
                if (this.y + this.height >= ground.y) {
                    this.y = ground.y - this.height;
                    if (!gameOver) {
                        gameOver = true;
                        checkHighScore();
                    }
                }
                
                // 画面上部との衝突
                if (this.y <= 0) {
                    this.y = 0;
                    this.velocity = 0;
                }
            }
        },
        
        flap: function() {
            if (gameOver) return;
            
            this.velocity = this.jump;
            
            if (!gameStarted) {
                gameStarted = true;
                resetGame();
            }
        },
        
        draw: function() {
            ctx.save();
            ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
            ctx.rotate(this.rotation);
            
            // 鳥を描画
            ctx.fillStyle = '#f8e71c';
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2);
            ctx.fill();
            
            // 目
            ctx.fillStyle = 'white';
            ctx.beginPath();
            ctx.arc(this.radius / 2, -this.radius / 3, this.radius / 3, 0, Math.PI * 2);
            ctx.fill();
            
            // 瞳
            ctx.fillStyle = 'black';
            ctx.beginPath();
            ctx.arc(this.radius / 2 + 1, -this.radius / 3, this.radius / 6, 0, Math.PI * 2);
            ctx.fill();
            
            // くちばし
            ctx.fillStyle = '#ff6b6b';
            ctx.beginPath();
            ctx.moveTo(this.radius, 0);
            ctx.lineTo(this.radius + 10, 0);
            ctx.lineTo(this.radius, 5);
            ctx.closePath();
            ctx.fill();
            
            // 羽
            ctx.fillStyle = '#f8e71c';
            ctx.beginPath();
            ctx.arc(-this.radius / 2, this.radius / 3, this.radius / 2, 0, Math.PI * 2);
            ctx.fill();
            
            ctx.restore();
        }
    };
    
    // パイプ
    const pipes = {
        position: [],
        
        reset: function() {
            this.position = [];
        },
        
        update: function() {
            if (!gameStarted || gameOver) return;
            
            // 新しいパイプを追加
            if (frames % 100 === 0) {
                const topPipeY = Math.floor(Math.random() * (canvas.height - ground.height - pipeGap)) - 270;
                
                this.position.push({
                    x: canvas.width,
                    y: topPipeY,
                    width: pipeWidth,
                    counted: false
                });
            }
            
            // パイプを移動
            for (let i = 0; i < this.position.length; i++) {
                const p = this.position[i];
                
                p.x -= 2;
                
                // スコア加算
                if (p.x + p.width < bird.x && !p.counted) {
                    score++;
                    document.getElementById('score').textContent = score;
                    p.counted = true;
                }
                
                // 衝突判定
                // 上のパイプとの衝突
                if (
                    bird.x + bird.radius > p.x &&
                    bird.x - bird.radius < p.x + p.width &&
                    bird.y - bird.radius < p.y + 270
                ) {
                    gameOver = true;
                    checkHighScore();
                }
                
                // 下のパイプとの衝突
                if (
                    bird.x + bird.radius > p.x &&
                    bird.x - bird.radius < p.x + p.width &&
                    bird.y + bird.radius > p.y + 270 + pipeGap
                ) {
                    gameOver = true;
                    checkHighScore();
                }
                
                // 画面外のパイプを削除
                if (p.x + p.width < 0) {
                    this.position.shift();
                }
            }
        },
        
        draw: function() {
            for (let i = 0; i < this.position.length; i++) {
                const p = this.position[i];
                
                // 上のパイプ
                ctx.fillStyle = '#73bf2e';
                ctx.fillRect(p.x, p.y, p.width, 270);
                
                // 上のパイプの口
                ctx.fillStyle = '#8ed61e';
                ctx.fillRect(p.x - 2, p.y + 270 - 20, p.width + 4, 20);
                
                // 下のパイプ
                ctx.fillStyle = '#73bf2e';
                ctx.fillRect(p.x, p.y + 270 + pipeGap, p.width, canvas.height);
                
                // 下のパイプの口
                ctx.fillStyle = '#8ed61e';
                ctx.fillRect(p.x - 2, p.y + 270 + pipeGap, p.width + 4, 20);
            }
        }
    };
    
    // ゲームオーバー画面
    function drawGameOver() {
        if (gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = 'white';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('ゲームオーバー', canvas.width / 2, canvas.height / 2 - 30);
            
            ctx.font = '20px Arial';
            ctx.fillText(`スコア: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
            ctx.fillText(`ハイスコア: ${highScore}`, canvas.width / 2, canvas.height / 2 + 40);
            
            ctx.font = '16px Arial';
            ctx.fillText('クリックでリスタート', canvas.width / 2, canvas.height / 2 + 80);
        }
    }
    
    // スタート画面
    function drawGetReady() {
        if (!gameStarted) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = 'white';
            ctx.font = '30px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('準備OK', canvas.width / 2, canvas.height / 2 - 30);
            
            ctx.font = '16px Arial';
            ctx.fillText('クリックでスタート', canvas.width / 2, canvas.height / 2 + 20);
        }
    }
    
    // ハイスコアの確認と更新
    function checkHighScore() {
        if (score > highScore) {
            highScore = score;
            localStorage.setItem('flappyHighScore', highScore);
            document.getElementById('high-score').textContent = highScore;
        }
    }
    
    // ゲームのリセット
    function resetGame() {
        score = 0;
        document.getElementById('score').textContent = score;
        document.getElementById('high-score').textContent = highScore;
        
        bird.y = 150;
        bird.velocity = 0;
        bird.rotation = 0;
        
        pipes.reset();
        
        gameOver = false;
        gameStarted = true;
    }
    
    // フレームカウンター
    let frames = 0;
    
    // ゲームループ
    function loop() {
        frames++;
        
        // 更新
        bird.update();
        ground.update();
        pipes.update();
        
        // 描画
        background.draw();
        pipes.draw();
        ground.draw();
        bird.draw();
        
        if (!gameStarted) {
            drawGetReady();
        }
        
        if (gameOver) {
            drawGameOver();
        }
        
        requestAnimationFrame(loop);
    }
    
    // イベントリスナー
    canvas.addEventListener('click', () => {
        if (gameOver) {
            gameOver = false;
            gameStarted = false;
            resetGame();
        } else {
            bird.flap();
        }
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.code === 'Space') {
            if (gameOver) {
                gameOver = false;
                gameStarted = false;
                resetGame();
            } else {
                bird.flap();
            }
        }
    });
    
    document.getElementById('start-button').addEventListener('click', () => {
        if (gameOver) {
            gameOver = false;
            gameStarted = false;
            resetGame();
        } else if (!gameStarted) {
            bird.flap();
        }
    });
    
    // ハイスコアの表示
    document.getElementById('high-score').textContent = highScore;
    
    // ゲーム開始
    loop();
});
