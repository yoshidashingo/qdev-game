document.addEventListener('DOMContentLoaded', () => {
    // キャンバスの設定
    const canvas = document.getElementById('tetris');
    const ctx = canvas.getContext('2d');
    const nextCanvas = document.getElementById('next');
    const nextCtx = nextCanvas.getContext('2d');
    
    // ブロックのサイズ
    const BLOCK_SIZE = 20;
    const BOARD_WIDTH = 12;
    const BOARD_HEIGHT = 20;
    
    // ゲーム状態
    let score = 0;
    let level = 1;
    let lines = 0;
    let gameOver = false;
    let isPaused = false;
    let dropCounter = 0;
    let dropInterval = 1000; // 初期の落下速度（ミリ秒）
    let lastTime = 0;
    
    // ボード初期化
    const board = Array.from({ length: BOARD_HEIGHT }, () => Array(BOARD_WIDTH).fill(0));
    
    // テトロミノの形状と色
    const TETROMINOS = {
        'I': {
            shape: [
                [0, 0, 0, 0],
                [1, 1, 1, 1],
                [0, 0, 0, 0],
                [0, 0, 0, 0]
            ],
            color: '#00FFFF'
        },
        'J': {
            shape: [
                [1, 0, 0],
                [1, 1, 1],
                [0, 0, 0]
            ],
            color: '#0000FF'
        },
        'L': {
            shape: [
                [0, 0, 1],
                [1, 1, 1],
                [0, 0, 0]
            ],
            color: '#FF7F00'
        },
        'O': {
            shape: [
                [1, 1],
                [1, 1]
            ],
            color: '#FFFF00'
        },
        'S': {
            shape: [
                [0, 1, 1],
                [1, 1, 0],
                [0, 0, 0]
            ],
            color: '#00FF00'
        },
        'T': {
            shape: [
                [0, 1, 0],
                [1, 1, 1],
                [0, 0, 0]
            ],
            color: '#800080'
        },
        'Z': {
            shape: [
                [1, 1, 0],
                [0, 1, 1],
                [0, 0, 0]
            ],
            color: '#FF0000'
        }
    };
    
    // テトロミノのランダム生成
    function getRandomTetromino() {
        const tetrominos = 'IJLOSTZ';
        const randTetromino = tetrominos[Math.floor(Math.random() * tetrominos.length)];
        return TETROMINOS[randTetromino];
    }
    
    // プレイヤーの初期化
    let player = {
        pos: { x: 0, y: 0 },
        tetromino: null,
        next: getRandomTetromino()
    };
    
    // 新しいテトロミノを生成
    function playerReset() {
        player.tetromino = player.next;
        player.next = getRandomTetromino();
        player.pos.y = 0;
        player.pos.x = Math.floor(BOARD_WIDTH / 2) - Math.floor(player.tetromino.shape.length / 2);
        
        // 衝突チェック（ゲームオーバー判定）
        if (checkCollision()) {
            gameOver = true;
            alert('ゲームオーバー！スコア: ' + score);
        }
        
        // 次のテトロミノを表示
        drawNext();
    }
    
    // 次のテトロミノを描画
    function drawNext() {
        nextCtx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        nextCtx.fillStyle = '#111';
        nextCtx.fillRect(0, 0, nextCanvas.width, nextCanvas.height);
        
        const nextTetromino = player.next;
        const size = nextTetromino.shape.length;
        const offsetX = (nextCanvas.width / 2) - (size * BLOCK_SIZE / 2);
        const offsetY = (nextCanvas.height / 2) - (size * BLOCK_SIZE / 2);
        
        nextTetromino.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    nextCtx.fillStyle = nextTetromino.color;
                    nextCtx.fillRect(
                        offsetX + x * BLOCK_SIZE,
                        offsetY + y * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            });
        });
    }
    
    // 衝突チェック
    function checkCollision() {
        const tetromino = player.tetromino.shape;
        for (let y = 0; y < tetromino.length; y++) {
            for (let x = 0; x < tetromino[y].length; x++) {
                if (tetromino[y][x] !== 0) {
                    const newX = player.pos.x + x;
                    const newY = player.pos.y + y;
                    
                    if (
                        newX < 0 || 
                        newX >= BOARD_WIDTH || 
                        newY >= BOARD_HEIGHT ||
                        (newY >= 0 && board[newY][newX] !== 0)
                    ) {
                        return true;
                    }
                }
            }
        }
        return false;
    }
    
    // テトロミノを回転
    function rotate() {
        const tetromino = player.tetromino.shape;
        const newTetromino = [];
        
        for (let i = 0; i < tetromino.length; i++) {
            newTetromino.push([]);
            for (let j = 0; j < tetromino[i].length; j++) {
                newTetromino[i][j] = tetromino[tetromino.length - 1 - j][i];
            }
        }
        
        const originalShape = player.tetromino.shape;
        player.tetromino.shape = newTetromino;
        
        // 回転後に衝突する場合は元に戻す
        if (checkCollision()) {
            player.tetromino.shape = originalShape;
        }
    }
    
    // テトロミノを移動
    function playerMove(dir) {
        player.pos.x += dir;
        if (checkCollision()) {
            player.pos.x -= dir;
        }
    }
    
    // テトロミノを落下
    function playerDrop() {
        player.pos.y++;
        if (checkCollision()) {
            player.pos.y--;
            mergeBoard();
            playerReset();
            removeRows();
        }
        dropCounter = 0;
    }
    
    // テトロミノを即時落下
    function playerHardDrop() {
        while (!checkCollision()) {
            player.pos.y++;
        }
        player.pos.y--;
        mergeBoard();
        playerReset();
        removeRows();
        dropCounter = 0;
    }
    
    // テトロミノをボードにマージ
    function mergeBoard() {
        player.tetromino.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    const boardY = player.pos.y + y;
                    if (boardY >= 0) { // ボード上部の境界チェック
                        board[boardY][player.pos.x + x] = {
                            value: 1,
                            color: player.tetromino.color
                        };
                    }
                }
            });
        });
    }
    
    // 完成した行を削除
    function removeRows() {
        let rowsCleared = 0;
        
        outer: for (let y = BOARD_HEIGHT - 1; y >= 0; y--) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                if (board[y][x] === 0) {
                    continue outer;
                }
            }
            
            // 行が揃った場合
            const row = board.splice(y, 1)[0].fill(0);
            board.unshift(row);
            y++;
            rowsCleared++;
        }
        
        if (rowsCleared > 0) {
            // スコア計算
            const linePoints = [40, 100, 300, 1200]; // 1, 2, 3, 4行消しの点数
            score += linePoints[rowsCleared - 1] * level;
            lines += rowsCleared;
            
            // レベルアップ
            level = Math.floor(lines / 10) + 1;
            dropInterval = 1000 - (level - 1) * 50; // レベルに応じて落下速度を上げる
            
            // スコア表示更新
            document.getElementById('score').textContent = score;
            document.getElementById('level').textContent = level;
            document.getElementById('lines').textContent = lines;
        }
    }
    
    // ボードを描画
    function drawBoard() {
        ctx.fillStyle = '#111';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        board.forEach((row, y) => {
            row.forEach((cell, x) => {
                if (cell !== 0) {
                    ctx.fillStyle = cell.color;
                    ctx.fillRect(
                        x * BLOCK_SIZE,
                        y * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            });
        });
    }
    
    // テトロミノを描画
    function drawTetromino() {
        player.tetromino.shape.forEach((row, y) => {
            row.forEach((value, x) => {
                if (value !== 0) {
                    ctx.fillStyle = player.tetromino.color;
                    ctx.fillRect(
                        (player.pos.x + x) * BLOCK_SIZE,
                        (player.pos.y + y) * BLOCK_SIZE,
                        BLOCK_SIZE - 1,
                        BLOCK_SIZE - 1
                    );
                }
            });
        });
    }
    
    // ゲームループ
    function update(time = 0) {
        if (gameOver || isPaused) {
            return;
        }
        
        const deltaTime = time - lastTime;
        lastTime = time;
        
        dropCounter += deltaTime;
        if (dropCounter > dropInterval) {
            playerDrop();
        }
        
        drawBoard();
        drawTetromino();
        
        requestAnimationFrame(update);
    }
    
    // キーボード操作
    document.addEventListener('keydown', event => {
        if (gameOver) return;
        
        switch (event.keyCode) {
            case 37: // 左矢印
                playerMove(-1);
                break;
            case 39: // 右矢印
                playerMove(1);
                break;
            case 40: // 下矢印
                playerDrop();
                break;
            case 38: // 上矢印
                rotate();
                break;
            case 32: // スペース
                playerHardDrop();
                break;
            case 80: // P
                isPaused = !isPaused;
                if (!isPaused) {
                    lastTime = 0;
                    update();
                }
                break;
        }
    });
    
    // ゲーム開始ボタン
    document.getElementById('start-button').addEventListener('click', () => {
        if (!player.tetromino) {
            playerReset();
            gameOver = false;
            isPaused = false;
            update();
        } else if (isPaused) {
            isPaused = false;
            update();
        }
    });
    
    // リセットボタン
    document.getElementById('reset-button').addEventListener('click', () => {
        // ゲームをリセット
        score = 0;
        level = 1;
        lines = 0;
        gameOver = false;
        isPaused = false;
        dropCounter = 0;
        dropInterval = 1000;
        
        // ボードをクリア
        for (let y = 0; y < BOARD_HEIGHT; y++) {
            for (let x = 0; x < BOARD_WIDTH; x++) {
                board[y][x] = 0;
            }
        }
        
        // スコア表示をリセット
        document.getElementById('score').textContent = score;
        document.getElementById('level').textContent = level;
        document.getElementById('lines').textContent = lines;
        
        // 新しいテトロミノを生成
        player = {
            pos: { x: 0, y: 0 },
            tetromino: null,
            next: getRandomTetromino()
        };
        
        playerReset();
        update();
    });
    
    // 初期描画
    drawBoard();
});
