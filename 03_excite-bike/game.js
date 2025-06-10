// ゲームの基本設定
document.addEventListener('DOMContentLoaded', () => {
    // キャンバスの設定
    const canvas = document.getElementById('game-canvas');
    const ctx = canvas.getContext('2d');
    
    // ゲーム状態
    let gameStarted = false;
    let gameOver = false;
    let gamePaused = false;
    let score = 0;
    let distance = 0;
    let gameTime = 0;
    let lastTime = 0;
    let animationFrameId = null;
    let difficulty = 1; // 難易度係数（時間とともに上昇）
    
    // コンボシステム
    const combo = {
        count: 0,
        multiplier: 1.0,
        lastActionTime: 0,
        comboTimeout: 3000, // 3秒
        actionHistory: [], // アクション履歴
        specialCombos: {
            'perfectLanding': { count: 0, threshold: 3, bonus: 100 },
            'speedDemon': { count: 0, threshold: 5, bonus: 200 },
            'airMaster': { count: 0, threshold: 4, bonus: 150 },
            'obstacleSlalom': { count: 0, threshold: 6, bonus: 250 },
            'turboMaster': { count: 0, threshold: 3, bonus: 180 }
        },
        
        // コンボ倍率の計算
        getMultiplier: function() {
            if (this.count === 0) return 1.0;
            if (this.count === 1) return 1.0;
            if (this.count === 2) return 1.5;
            if (this.count === 3) return 2.0;
            if (this.count === 4) return 2.5;
            if (this.count >= 5 && this.count < 10) return 3.0;
            if (this.count >= 10 && this.count < 15) return 4.0;
            return 5.0; // 15連続以上
        },
        
        // コンボアクションの追加
        addAction: function(actionType, points = 10, extraData = {}) {
            const currentTime = Date.now();
            
            // コンボタイムアウトチェック
            if (currentTime - this.lastActionTime > this.comboTimeout) {
                this.count = 0;
                this.actionHistory = [];
            }
            
            this.count++;
            this.lastActionTime = currentTime;
            this.multiplier = this.getMultiplier();
            
            // アクション履歴に追加
            this.actionHistory.push({
                type: actionType,
                time: currentTime,
                data: extraData
            });
            
            // 履歴を最新10件に制限
            if (this.actionHistory.length > 10) {
                this.actionHistory.shift();
            }
            
            // 特殊コンボのチェック
            this.checkSpecialCombos(actionType, extraData);
            
            // スコア加算
            const comboPoints = Math.floor(points * this.multiplier);
            score += comboPoints;
            
            // コンボ音を再生
            if (this.count > 1) {
                sound.playCombo(this.count);
            }
            
            // UI更新
            this.updateDisplay();
            
            // エフェクト表示
            this.showEffect(actionType, comboPoints);
            
            // パーティクルエフェクト
            this.createComboParticles();
            
            return comboPoints;
        },
        
        // 特殊コンボのチェック
        checkSpecialCombos: function(actionType, extraData) {
            // Perfect Landing: 連続3回のジャンプ成功
            if (actionType === 'ジャンプ') {
                const recentJumps = this.actionHistory.filter(a => 
                    a.type === 'ジャンプ' && 
                    Date.now() - a.time < 5000
                ).length;
                
                if (recentJumps >= 3) {
                    this.triggerSpecialCombo('perfectLanding', 'Perfect Landing!');
                }
            }
            
            // Speed Demon: 高速での連続回避
            if (actionType === '回避' && extraData.speed > 12) {
                this.specialCombos.speedDemon.count++;
                if (this.specialCombos.speedDemon.count >= this.specialCombos.speedDemon.threshold) {
                    this.triggerSpecialCombo('speedDemon', 'Speed Demon!');
                }
            }
            
            // Air Master: ランプジャンプの連続成功
            if (actionType === 'ランプジャンプ') {
                this.specialCombos.airMaster.count++;
                if (this.specialCombos.airMaster.count >= this.specialCombos.airMaster.threshold) {
                    this.triggerSpecialCombo('airMaster', 'Air Master!');
                }
            }
            
            // Obstacle Slalom: 多様な障害物の連続回避
            if (actionType === '回避') {
                const recentAvoids = this.actionHistory.filter(a => 
                    a.type === '回避' && 
                    Date.now() - a.time < 8000
                );
                
                const uniqueObstacles = new Set(recentAvoids.map(a => a.data.obstacleType));
                if (uniqueObstacles.size >= 4 && recentAvoids.length >= 6) {
                    this.triggerSpecialCombo('obstacleSlalom', 'Obstacle Slalom!');
                }
            }
        },
        
        // 特殊コンボの発動
        triggerSpecialCombo: function(comboType, displayText) {
            const bonus = this.specialCombos[comboType].bonus;
            score += bonus;
            
            // 特殊コンボ音を再生
            sound.playSpecialCombo();
            
            // 特殊エフェクト
            this.showSpecialEffect(displayText, bonus);
            
            // 特殊パーティクル
            this.createSpecialParticles(comboType);
            
            // UI特殊アニメーション
            const comboContainer = document.getElementById('combo').parentElement;
            comboContainer.classList.add('special-active');
            setTimeout(() => {
                comboContainer.classList.remove('special-active');
            }, 500);
            
            // カウンターリセット
            this.specialCombos[comboType].count = 0;
        },
        
        // コンボリセット
        reset: function() {
            this.count = 0;
            this.multiplier = 1.0;
            this.lastActionTime = 0;
            this.actionHistory = [];
            
            // 特殊コンボカウンターもリセット
            for (let key in this.specialCombos) {
                this.specialCombos[key].count = 0;
            }
            
            this.updateDisplay();
        },
        
        // コンボタイムアウトチェック
        update: function() {
            const currentTime = Date.now();
            if (this.count > 0 && currentTime - this.lastActionTime > this.comboTimeout) {
                this.reset();
            }
            
            // 特殊コンボの時間制限チェック
            this.updateSpecialCombos();
        },
        
        // 特殊コンボの時間制限更新
        updateSpecialCombos: function() {
            const currentTime = Date.now();
            
            // Speed Demon: 10秒以内に達成する必要がある
            const recentHighSpeedAvoids = this.actionHistory.filter(a => 
                a.type === '回避' && 
                a.data.speed > 12 && 
                currentTime - a.time < 10000
            ).length;
            
            if (recentHighSpeedAvoids === 0) {
                this.specialCombos.speedDemon.count = 0;
            }
            
            // Air Master: 15秒以内に達成する必要がある
            const recentRampJumps = this.actionHistory.filter(a => 
                a.type === 'ランプジャンプ' && 
                currentTime - a.time < 15000
            ).length;
            
            if (recentRampJumps === 0) {
                this.specialCombos.airMaster.count = 0;
            }
        },
        
        // UI表示更新
        updateDisplay: function() {
            const comboElement = document.getElementById('combo');
            let displayText = this.count > 1 ? `${this.count}x (${this.multiplier.toFixed(1)}x)` : '0x';
            
            // 特殊コンボの進行状況を表示
            const activeSpecials = [];
            for (let key in this.specialCombos) {
                const special = this.specialCombos[key];
                if (special.count > 0) {
                    activeSpecials.push(`${key}:${special.count}/${special.threshold}`);
                }
            }
            
            if (activeSpecials.length > 0) {
                displayText += ` [${activeSpecials.join(', ')}]`;
            }
            
            comboElement.textContent = displayText;
            
            // アクティブ状態の表示
            const comboContainer = comboElement.parentElement;
            if (this.count > 1) {
                comboContainer.classList.add('active');
                setTimeout(() => {
                    comboContainer.classList.remove('active');
                }, 200);
            }
        },
        
        // エフェクト表示
        showEffect: function(actionType, points) {
            // キャンバス上にエフェクトを表示
            const effectText = `${actionType} +${points}`;
            
            // エフェクト用のパーティクルを作成
            particles.add(
                bike.x + bike.width / 2,
                bike.y - 20,
                0,
                -2,
                20,
                'rgba(255, 215, 0, 1.0)',
                effectText
            );
        },
        
        // 特殊エフェクト表示
        showSpecialEffect: function(text, bonus) {
            // 大きな特殊エフェクト
            particles.add(
                canvas.width / 2,
                canvas.height / 2 - 50,
                0,
                -1,
                30,
                'rgba(255, 0, 255, 1.0)',
                text
            );
            
            particles.add(
                canvas.width / 2,
                canvas.height / 2 - 20,
                0,
                -0.5,
                24,
                'rgba(255, 215, 0, 1.0)',
                `+${bonus} BONUS!`
            );
        },
        
        // コンボパーティクルの生成
        createComboParticles: function() {
            if (this.count > 1) {
                const colors = ['#ffd700', '#ffb703', '#fb8500'];
                const particleCount = Math.min(this.count, 10);
                
                for (let i = 0; i < particleCount; i++) {
                    particles.add(
                        bike.x + bike.width / 2 + Math.random() * 40 - 20,
                        bike.y + bike.height / 2 + Math.random() * 20 - 10,
                        Math.random() * 4 - 2,
                        -Math.random() * 3 - 1,
                        8 + Math.random() * 5,
                        colors[Math.floor(Math.random() * colors.length)]
                    );
                }
            }
        },
        
        // 特殊パーティクルの生成
        createSpecialParticles: function(comboType) {
            let colors, count, pattern;
            
            switch(comboType) {
                case 'perfectLanding':
                    colors = ['#00ff00', '#32cd32', '#90ee90'];
                    count = 15;
                    pattern = 'circle';
                    break;
                case 'speedDemon':
                    colors = ['#ff0000', '#ff4500', '#ff6347'];
                    count = 20;
                    pattern = 'burst';
                    break;
                case 'airMaster':
                    colors = ['#00bfff', '#87ceeb', '#b0e0e6'];
                    count = 18;
                    pattern = 'spiral';
                    break;
                case 'obstacleSlalom':
                    colors = ['#ff00ff', '#da70d6', '#dda0dd'];
                    count = 25;
                    pattern = 'explosion';
                    break;
            }
            
            for (let i = 0; i < count; i++) {
                let vx, vy;
                
                switch(pattern) {
                    case 'circle':
                        const angle = (i / count) * Math.PI * 2;
                        vx = Math.cos(angle) * 3;
                        vy = Math.sin(angle) * 3;
                        break;
                    case 'burst':
                        vx = (Math.random() - 0.5) * 8;
                        vy = -Math.random() * 6 - 2;
                        break;
                    case 'spiral':
                        const spiralAngle = (i / count) * Math.PI * 4;
                        const radius = (i / count) * 4;
                        vx = Math.cos(spiralAngle) * radius;
                        vy = Math.sin(spiralAngle) * radius - 2;
                        break;
                    case 'explosion':
                        const explosionAngle = Math.random() * Math.PI * 2;
                        const explosionSpeed = Math.random() * 6 + 2;
                        vx = Math.cos(explosionAngle) * explosionSpeed;
                        vy = Math.sin(explosionAngle) * explosionSpeed;
                        break;
                }
                
                particles.add(
                    canvas.width / 2 + Math.random() * 100 - 50,
                    canvas.height / 2 + Math.random() * 100 - 50,
                    vx,
                    vy,
                    12 + Math.random() * 8,
                    colors[Math.floor(Math.random() * colors.length)]
                );
            }
        }
    };
    
    // サウンドシステム
    const sound = {
        enabled: true,
        bgmVolume: 0.4,
        sfxVolume: 0.6,
        enginePitch: 1.0,
        
        init: function() {
            // 音声ファイルが存在しない場合のフォールバック
            try {
                this.bgm = document.getElementById('bgm');
                this.jumpSound = document.getElementById('jump-sound');
                this.landSound = document.getElementById('land-sound');
                this.comboSound = document.getElementById('combo-sound');
                this.specialComboSound = document.getElementById('special-combo-sound');
                this.crashSound = document.getElementById('crash-sound');
                this.turboSound = document.getElementById('turbo-sound');
                this.engineSound = document.getElementById('engine-sound');
                
                // 音量設定
                if (this.bgm) this.bgm.volume = this.bgmVolume;
                if (this.engineSound) this.engineSound.volume = this.bgmVolume;
                
                [this.jumpSound, this.landSound, this.comboSound, 
                 this.specialComboSound, this.crashSound, this.turboSound
                ].forEach(sound => {
                    if (sound) sound.volume = this.sfxVolume;
                });
                
                // エンジン音の初期設定
                if (this.engineSound) {
                    this.engineSound.playbackRate = 1.0;
                    this.engineSound.loop = true;
                }
            } catch (error) {
                console.log('Audio files not found, running in silent mode');
                this.enabled = false;
            }
        },
        
        toggle: function() {
            this.enabled = !this.enabled;
            const button = document.getElementById('sound-toggle');
            
            if (this.enabled) {
                button.textContent = '🔊 サウンド';
                button.classList.remove('muted');
                if (gameStarted && !gameOver && !gamePaused) {
                    this.startGame();
                }
            } else {
                button.textContent = '🔇 サウンド';
                button.classList.add('muted');
                this.stopGame();
            }
        },
        
        startGame: function() {
            if (this.enabled && this.bgm) {
                this.bgm.currentTime = 0;
                this.bgm.play().catch(() => {});
                if (this.engineSound) {
                    this.engineSound.currentTime = 0;
                    this.engineSound.play().catch(() => {});
                }
            }
        },
        
        pauseGame: function() {
            if (this.enabled) {
                if (this.bgm) this.bgm.pause();
                if (this.engineSound) this.engineSound.pause();
            }
        },
        
        resumeGame: function() {
            if (this.enabled) {
                if (this.bgm) this.bgm.play().catch(() => {});
                if (this.engineSound) this.engineSound.play().catch(() => {});
            }
        },
        
        stopGame: function() {
            if (this.bgm) {
                this.bgm.pause();
                this.bgm.currentTime = 0;
            }
            if (this.engineSound) {
                this.engineSound.pause();
                this.engineSound.currentTime = 0;
            }
        },
        
        updateEngine: function(speed) {
            if (this.enabled && this.engineSound) {
                // エンジン音のピッチを速度に応じて変更
                const targetPitch = 0.5 + (speed / bike.maxSpeed) * 1.5;
                this.enginePitch = this.enginePitch * 0.95 + targetPitch * 0.05;
                this.engineSound.playbackRate = this.enginePitch;
                
                // エンジン音量も速度に応じて調整
                this.engineSound.volume = this.bgmVolume * (0.5 + speed / bike.maxSpeed * 0.5);
            }
        },
        
        playJump: function() {
            if (this.enabled && this.jumpSound) {
                this.jumpSound.currentTime = 0;
                this.jumpSound.play().catch(() => {});
            }
        },
        
        playLand: function() {
            if (this.enabled && this.landSound) {
                this.landSound.currentTime = 0;
                this.landSound.play().catch(() => {});
            }
        },
        
        playCombo: function(count) {
            if (this.enabled && this.comboSound) {
                this.comboSound.currentTime = 0;
                // コンボ数に応じてピッチを上げる
                this.comboSound.playbackRate = 1.0 + Math.min(count * 0.1, 1.0);
                this.comboSound.play().catch(() => {});
            }
        },
        
        playSpecialCombo: function() {
            if (this.enabled && this.specialComboSound) {
                this.specialComboSound.currentTime = 0;
                this.specialComboSound.play().catch(() => {});
            }
        },
        
        playCrash: function() {
            if (this.enabled && this.crashSound) {
                this.crashSound.currentTime = 0;
                this.crashSound.play().catch(() => {});
            }
        },
        
        playTurbo: function(start) {
            if (this.enabled && this.turboSound) {
                if (start) {
                    this.turboSound.currentTime = 0;
                    this.turboSound.play().catch(() => {});
                } else {
                    this.turboSound.pause();
                    this.turboSound.currentTime = 0;
                }
            }
        }
    };
    
    // バイクの設定
    const bike = {
        x: 100,
        y: 300,
        width: 80,
        height: 50,
        speed: 0,
        maxSpeed: 15,
        acceleration: 0.3,
        deceleration: 0.15,
        gravity: 0.6,
        jumpForce: -12,
        velocityY: 0,
        isJumping: false,
        wasJumping: false,  // ジャンプ成功判定用
        isCrouching: false,
        turbo: false,
        turboStartTime: null,  // ターボ開始時間
        crashAnimation: 0,
        wheelRotation: 0,
        suspensionOffset: 0,
        
        update: function() {
            if (!gameStarted || gameOver || gamePaused) return;
            
            // 重力の適用
            if (this.isJumping) {
                this.velocityY += this.gravity;
                this.y += this.velocityY;
                
                // 地面との衝突判定
                if (this.y >= 300) {
                    this.y = 300;
                    this.isJumping = false;
                    this.velocityY = 0;
                    
                    // 着地時の衝撃エフェクト
                    this.suspensionOffset = 5;
                    
                    // 着地音を再生
                    sound.playLand();
                    
                    // 着地時にコンボアクション（ジャンプ成功）
                    if (this.wasJumping) {
                        combo.addAction('ジャンプ', 15);
                        this.wasJumping = false;
                    }
                }
            } else {
                // サスペンションの回復
                if (this.suspensionOffset > 0) {
                    this.suspensionOffset -= 0.5;
                }
            }
            
            // 速度の更新
            if (this.turbo && this.speed < this.maxSpeed * 1.5) {
                this.speed += this.acceleration * 2;
            } else if (keys['ArrowRight'] && this.speed < this.maxSpeed) {
                this.speed += this.acceleration;
            } else if (keys['ArrowLeft'] && this.speed > 0) {
                this.speed -= this.acceleration * 2;
            } else if (this.speed > 0) {
                this.speed -= this.deceleration;
            }
            
            if (this.speed < 0) this.speed = 0;
            if (this.speed > this.maxSpeed * 1.5) this.speed = this.maxSpeed * 1.5;
            
            // タイヤの回転
            this.wheelRotation += this.speed * 0.2;
            if (this.wheelRotation > Math.PI * 2) {
                this.wheelRotation -= Math.PI * 2;
            }
            
            // 距離の更新
            distance += this.speed;
            
            // スコアの更新（基本スコア）
            const baseScore = Math.floor(distance / 10);
            if (baseScore > score) {
                score = baseScore;
                document.getElementById('score').textContent = score;
            }
            
            // 速度表示の更新
            document.getElementById('speed').textContent = Math.floor(this.speed * 10);
            
            // 難易度の更新
            difficulty = 1 + Math.floor(distance / 5000) * 0.2; // 5000距離ごとに20%ずつ難易度上昇
        },
        
        draw: function() {
            ctx.save();
            
            // バイクの位置と姿勢
            const bikeY = this.y + this.suspensionOffset;
            let rotation = 0;
            
            // ジャンプ中は前傾姿勢
            if (this.isJumping) {
                rotation = this.velocityY * 0.02;
            }
            
            ctx.translate(this.x + this.width / 2, bikeY + this.height / 2);
            ctx.rotate(rotation);
            
            // ゲームオーバー時のアニメーション
            if (gameOver) {
                this.crashAnimation += 0.1;
                ctx.rotate(Math.sin(this.crashAnimation) * 0.5);
                
                // 衝突エフェクト（閃光）
                if (this.crashAnimation < 1) {
                    ctx.fillStyle = `rgba(255, 255, 255, ${1 - this.crashAnimation})`;
                    ctx.fillRect(-this.width, -this.height, this.width * 2, this.height * 2);
                }
            }
            
            // バイクのフレーム
            ctx.fillStyle = '#e63946';
            
            // しゃがんでいる場合は姿勢を変える
            const bikeHeight = this.isCrouching ? this.height * 0.7 : this.height;
            
            // バイクの本体（フレーム）
            ctx.beginPath();
            ctx.moveTo(-this.width / 2, 0); // 左中央
            ctx.lineTo(-this.width / 3, -bikeHeight / 2); // 左上
            ctx.lineTo(this.width / 3, -bikeHeight / 2); // 右上
            ctx.lineTo(this.width / 2, 0); // 右中央
            ctx.lineTo(this.width / 3, bikeHeight / 3); // 右下
            ctx.lineTo(-this.width / 3, bikeHeight / 3); // 左下
            ctx.closePath();
            ctx.fill();
            
            // エンジン部分
            ctx.fillStyle = '#1d3557';
            ctx.fillRect(-this.width / 4, -bikeHeight / 4, this.width / 2, bikeHeight / 2);
            
            // 前フォーク
            ctx.strokeStyle = '#457b9d';
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.moveTo(this.width / 3, -bikeHeight / 3);
            ctx.lineTo(this.width / 3, bikeHeight / 2);
            ctx.stroke();
            
            // 後ろフォーク
            ctx.beginPath();
            ctx.moveTo(-this.width / 3, -bikeHeight / 4);
            ctx.lineTo(-this.width / 3, bikeHeight / 2);
            ctx.stroke();
            
            // タイヤ（前輪）
            ctx.save();
            ctx.translate(this.width / 3, bikeHeight / 2);
            ctx.rotate(this.wheelRotation);
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            
            // スポーク
            ctx.strokeStyle = '#999';
            ctx.lineWidth = 2;
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(i * Math.PI / 2) * 15, Math.sin(i * Math.PI / 2) * 15);
                ctx.stroke();
            }
            ctx.restore();
            
            // タイヤ（後輪）
            ctx.save();
            ctx.translate(-this.width / 3, bikeHeight / 2);
            ctx.rotate(this.wheelRotation);
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(0, 0, 15, 0, Math.PI * 2);
            ctx.fill();
            
            // スポーク
            ctx.strokeStyle = '#999';
            for (let i = 0; i < 4; i++) {
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(Math.cos(i * Math.PI / 2) * 15, Math.sin(i * Math.PI / 2) * 15);
                ctx.stroke();
            }
            ctx.restore();
            
            // ライダー
            const riderHeight = this.isCrouching ? -bikeHeight / 4 : -bikeHeight;
            ctx.fillStyle = '#457b9d';
            
            // 体
            ctx.fillRect(-10, riderHeight, 20, bikeHeight / 2);
            
            // 頭
            ctx.fillStyle = '#333';
            ctx.beginPath();
            ctx.arc(0, riderHeight - 10, 10, 0, Math.PI * 2);
            ctx.fill();
            
            // ヘルメットバイザー
            ctx.fillStyle = '#666';
            ctx.beginPath();
            ctx.ellipse(5, riderHeight - 10, 8, 5, 0, 0, Math.PI * 2);
            ctx.fill();
            
            // 腕
            ctx.strokeStyle = '#457b9d';
            ctx.lineWidth = 5;
            ctx.beginPath();
            ctx.moveTo(0, riderHeight + 15);
            ctx.lineTo(20, riderHeight + 5);
            ctx.stroke();
            
            // ターボエフェクト
            if (this.turbo && this.speed > this.maxSpeed / 2) {
                // 火花エフェクト
                const colors = ['#ff7b00', '#ff5500', '#ff0000'];
                for (let i = 0; i < 5; i++) {
                    const length = 30 + Math.random() * 20;
                    const width = 5 + Math.random() * 8;
                    const yOffset = Math.random() * 10 - 5;
                    
                    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
                    ctx.beginPath();
                    ctx.moveTo(-this.width / 2, yOffset);
                    ctx.lineTo(-this.width / 2 - length, yOffset - width);
                    ctx.lineTo(-this.width / 2 - length, yOffset + width);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            
            // 排気ガスエフェクト
            if (this.speed > 0) {
                ctx.fillStyle = 'rgba(200, 200, 200, 0.5)';
                for (let i = 0; i < 3; i++) {
                    const size = 5 + Math.random() * 5 * (this.speed / this.maxSpeed);
                    const xOffset = -this.width / 2 - 10 - Math.random() * 20 * (this.speed / this.maxSpeed);
                    const yOffset = Math.random() * 6 - 3;
                    
                    ctx.beginPath();
                    ctx.arc(xOffset, yOffset, size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
            
            ctx.restore();
        },
        
        jump: function() {
            if (!this.isJumping && !this.isCrouching && gameStarted && !gameOver && !gamePaused) {
                this.isJumping = true;
                this.wasJumping = true;  // ジャンプ開始フラグ
                this.velocityY = this.jumpForce;
                
                // ジャンプ音を再生
                sound.playJump();
                
                // ジャンプエフェクト（砂埃）
                for (let i = 0; i < 5; i++) {
                    particles.add(
                        this.x + Math.random() * this.width,
                        this.y + this.height,
                        Math.random() * 2 - 1,
                        -Math.random() * 2,
                        10 + Math.random() * 5,
                        'rgba(200, 180, 150, 0.7)'
                    );
                }
            }
        },
        
        crouch: function() {
            if (!this.isJumping && gameStarted && !gameOver && !gamePaused) {
                this.isCrouching = true;
            }
        },
        
        stand: function() {
            this.isCrouching = false;
        },
        
        accelerate: function() {
            if (gameStarted && !gameOver && !gamePaused && this.speed < this.maxSpeed) {
                this.speed += this.acceleration;
            }
        },
        
        brake: function() {
            if (gameStarted && !gameOver && !gamePaused && this.speed > 0) {
                this.speed -= this.acceleration * 2;
                if (this.speed < 0) this.speed = 0;
                
                // ブレーキエフェクト（砂埃）
                if (this.speed > 5) {
                    for (let i = 0; i < 2; i++) {
                        particles.add(
                            this.x + Math.random() * this.width,
                            this.y + this.height,
                            Math.random() * 1 - 0.5,
                            -Math.random() * 1,
                            5 + Math.random() * 3,
                            'rgba(200, 180, 150, 0.5)'
                        );
                    }
                }
            }
        },
        
        activateTurbo: function() {
            if (gameStarted && !gameOver && !gamePaused) {
                this.turbo = true;
                this.turboStartTime = Date.now();
                
                // ターボ音を再生
                sound.playTurbo(true);
            }
        },
        
        deactivateTurbo: function() {
            if (this.turbo && this.turboStartTime) {
                const turboDuration = Date.now() - this.turboStartTime;
                
                // 長時間ターボを使用した場合のコンボ
                if (turboDuration > 2000) { // 2秒以上
                    combo.addAction('ターボマスター', 25, {
                        duration: turboDuration,
                        speed: this.speed
                    });
                }
            }
            
            this.turbo = false;
            this.turboStartTime = null;
            
            // ターボ音を停止
            sound.playTurbo(false);
        }
    };
    
    // パーティクルシステム
    const particles = {
        list: [],
        
        add: function(x, y, vx, vy, size, color, text = null) {
            this.list.push({
                x: x,
                y: y,
                vx: vx,
                vy: vy,
                size: size,
                color: color,
                life: 1.0,
                text: text,
                fontSize: text ? 16 : 0
            });
        },
        
        update: function() {
            for (let i = 0; i < this.list.length; i++) {
                const p = this.list[i];
                
                p.x += p.vx;
                p.y += p.vy;
                
                if (!p.text) {
                    p.size *= 0.95;
                }
                
                p.life -= 0.02;
                
                if (p.life <= 0 || (!p.text && p.size < 0.5)) {
                    this.list.splice(i, 1);
                    i--;
                }
            }
        },
        
        draw: function() {
            for (let i = 0; i < this.list.length; i++) {
                const p = this.list[i];
                
                if (p.text) {
                    // テキストパーティクル
                    ctx.save();
                    ctx.fillStyle = p.color.replace(')', `, ${p.life})`);
                    ctx.font = `${p.fontSize}px Arial`;
                    ctx.textAlign = 'center';
                    ctx.fillText(p.text, p.x, p.y);
                    ctx.restore();
                } else {
                    // 通常のパーティクル
                    ctx.fillStyle = p.color.replace(')', `, ${p.life})`);
                    ctx.beginPath();
                    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
                    ctx.fill();
                }
            }
        }
    };
    
    // 障害物の設定
    const obstacles = {
        list: [],
        types: [
            { width: 40, height: 30, type: 'rock', name: '岩' },
            { width: 35, height: 25, type: 'log', name: '倒木' },
            { width: 60, height: 40, type: 'wall', name: '低い壁' },
            { width: 55, height: 35, type: 'puddle', name: '水たまり' },
            { width: 80, height: 50, type: 'bigrock', name: '大きな岩' },
            { width: 70, height: 45, type: 'highwall', name: '高い壁' },
            { width: 120, height: 30, type: 'mud', name: '泥沼' },
            { width: 110, height: 25, type: 'sand', name: '砂地' },
            { width: 50, height: 70, type: 'fence', name: 'フェンス' },
            { width: 45, height: 65, type: 'sign', name: '看板' }
        ],
        lastObstacleTime: 0,
        minObstacleInterval: 800, // ミリ秒
        
        reset: function() {
            this.list = [];
            this.lastObstacleTime = 0;
        },
        
        generate: function(currentTime) {
            if (!gameStarted || gameOver || gamePaused) return;
            
            // 最後の障害物生成からの経過時間をチェック
            const timeSinceLastObstacle = currentTime - this.lastObstacleTime;
            
            // 一定の間隔と速度に応じた確率で障害物を生成
            const speedFactor = bike.speed / bike.maxSpeed;
            const generateProbability = 0.05 * speedFactor * difficulty; // 難易度に応じて確率上昇
            const minInterval = this.minObstacleInterval * (1 - speedFactor * 0.5); // 速度が上がると間隔が短くなる
            
            if (timeSinceLastObstacle > minInterval && Math.random() < generateProbability) {
                // 障害物の種類をランダムに選択
                const typeIndex = Math.floor(Math.random() * this.types.length);
                const type = this.types[typeIndex];
                
                // 前の障害物との距離を確保
                let canGenerate = true;
                for (const obstacle of this.list) {
                    if (obstacle.x > canvas.width - 150) {
                        canGenerate = false;
                        break;
                    }
                }
                
                if (canGenerate) {
                    const obstacle = {
                        x: canvas.width,
                        y: 300 - type.height,
                        width: type.width,
                        height: type.height,
                        type: type.type,
                        name: type.name,
                        passed: false  // コンボ判定用
                    };
                    
                    this.list.push(obstacle);
                    this.lastObstacleTime = currentTime;
                }
            }
            
            // ランプの生成（ジャンプ用）- 障害物とは別のロジックで生成
            if (timeSinceLastObstacle > minInterval * 1.5 && Math.random() < 0.02 * speedFactor) {
                // 前の障害物との距離を確保
                let canGenerateRamp = true;
                for (const obstacle of this.list) {
                    if (obstacle.x > canvas.width - 200) {
                        canGenerateRamp = false;
                        break;
                    }
                }
                
                if (canGenerateRamp) {
                    const ramp = {
                        x: canvas.width,
                        y: 280,
                        width: 70,
                        height: 30,
                        type: 'ramp',
                        name: 'ジャンプ台'
                    };
                    
                    this.list.push(ramp);
                    this.lastObstacleTime = currentTime;
                }
            }
            
            // 難易度に応じたパターン生成
            if (difficulty > 1.5 && timeSinceLastObstacle > minInterval * 3 && Math.random() < 0.1) {
                this.generatePattern(currentTime);
            }
        },
        
        // 障害物パターンの生成
        generatePattern: function(currentTime) {
            // 前の障害物との距離を確保
            let canGenerate = true;
            for (const obstacle of this.list) {
                if (obstacle.x > canvas.width - 300) {
                    canGenerate = false;
                    break;
                }
            }
            
            if (!canGenerate) return;
            
            // パターンの種類
            const patterns = [
                // パターン1: ランプと高い障害物
                () => {
                    const ramp = {
                        x: canvas.width,
                        y: 280,
                        width: 70,
                        height: 30,
                        type: 'ramp',
                        name: 'ジャンプ台'
                    };
                    
                    const highObstacle = {
                        x: canvas.width + 150,
                        y: 300 - 70,
                        width: 50,
                        height: 70,
                        type: 'fence',
                        name: 'フェンス'
                    };
                    
                    this.list.push(ramp, highObstacle);
                },
                
                // パターン2: 連続した低い障害物
                () => {
                    for (let i = 0; i < 3; i++) {
                        const obstacle = {
                            x: canvas.width + i * 100,
                            y: 300 - 30,
                            width: 40,
                            height: 30,
                            type: 'rock',
                            name: '岩'
                        };
                        this.list.push(obstacle);
                    }
                },
                
                // パターン3: 交互に配置された障害物
                () => {
                    const types = ['rock', 'log', 'puddle'];
                    const heights = [30, 25, 35];
                    
                    for (let i = 0; i < 3; i++) {
                        const obstacle = {
                            x: canvas.width + i * 120,
                            y: 300 - heights[i],
                            width: 40,
                            height: heights[i],
                            type: types[i],
                            name: i === 0 ? '岩' : i === 1 ? '倒木' : '水たまり'
                        };
                        this.list.push(obstacle);
                    }
                }
            ];
            
            // ランダムにパターンを選択して生成
            const pattern = patterns[Math.floor(Math.random() * patterns.length)];
            pattern();
            
            this.lastObstacleTime = currentTime;
        },
        
        update: function() {
            if (!gameStarted || gameOver || gamePaused) return;
            
            for (let i = 0; i < this.list.length; i++) {
                const obstacle = this.list[i];
                obstacle.x -= bike.speed;
                
                // 画面外の障害物を削除
                if (obstacle.x + obstacle.width < 0) {
                    this.list.splice(i, 1);
                    i--;
                    continue;
                }
                
                // 近接通過判定（コンボ用）
                if (!obstacle.passed && 
                    obstacle.x + obstacle.width < bike.x && 
                    obstacle.x + obstacle.width > bike.x - 20) {
                    obstacle.passed = true;
                    if (obstacle.type !== 'ramp') {
                        // 障害物の回避でコンボ加算（速度情報を含める）
                        combo.addAction('回避', 20, {
                            speed: bike.speed,
                            obstacleType: obstacle.type
                        });
                    }
                }
                
                // 衝突判定
                if (this.checkCollision(bike, obstacle)) {
                    if (obstacle.type === 'ramp') {
                        // ランプに乗ったらジャンプ
                        if (!bike.isJumping) {
                            bike.jump();
                            // ランプジャンプでコンボ加算
                            combo.addAction('ランプジャンプ', 30);
                            // ランプエフェクト
                            for (let j = 0; j < 8; j++) {
                                particles.add(
                                    obstacle.x + obstacle.width / 2 + Math.random() * 20 - 10,
                                    obstacle.y + Math.random() * 10,
                                    Math.random() * 3 - 1.5,
                                    -Math.random() * 3 - 1,
                                    8 + Math.random() * 5,
                                    'rgba(255, 220, 150, 0.8)'
                                );
                            }
                        }
                    } else {
                        // 障害物に衝突
                        gameOver = true;
                        combo.reset();
                        
                        // クラッシュ音を再生
                        sound.playCrash();
                        
                        // 衝突エフェクト
                        for (let j = 0; j < 20; j++) {
                            particles.add(
                                bike.x + bike.width / 2,
                                bike.y + bike.height / 2,
                                Math.random() * 6 - 3,
                                Math.random() * 6 - 3,
                                10 + Math.random() * 10,
                                'rgba(255, 100, 100, 0.8)'
                            );
                        }
                    }
                }
                
                // 走行エフェクト（砂埃）
                if (bike.speed > 5 && Math.random() < 0.1) {
                    particles.add(
                        bike.x + Math.random() * bike.width,
                        bike.y + bike.height,
                        Math.random() * 1 - 0.5,
                        -Math.random() * 0.5,
                        3 + Math.random() * 2,
                        'rgba(200, 180, 150, 0.4)'
                    );
                }
            }
        },
        
        draw: function() {
            for (let i = 0; i < this.list.length; i++) {
                const obstacle = this.list[i];
                
                if (obstacle.type === 'ramp') {
                    // ランプの描画
                    const gradient = ctx.createLinearGradient(obstacle.x, obstacle.y, obstacle.x + obstacle.width, obstacle.y);
                    gradient.addColorStop(0, '#fca311');
                    gradient.addColorStop(1, '#ffb703');
                    
                    ctx.fillStyle = gradient;
                    ctx.beginPath();
                    ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
                    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y);
                    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                    ctx.closePath();
                    ctx.fill();
                    
                    // ランプのハイライト
                    ctx.strokeStyle = '#ffb703';
                    ctx.lineWidth = 3;
                    ctx.beginPath();
                    ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
                    ctx.lineTo(obstacle.x + obstacle.width, obstacle.y);
                    ctx.stroke();
                    
                    // ランプの支柱
                    ctx.fillStyle = '#e76f51';
                    ctx.fillRect(obstacle.x + obstacle.width * 0.7, obstacle.y + obstacle.height * 0.3, 5, obstacle.height * 0.7);
                    
                    // 名前表示（デバッグ用、必要に応じて削除）
                    // ctx.fillStyle = 'white';
                    // ctx.font = '12px Arial';
                    // ctx.fillText(obstacle.name, obstacle.x, obstacle.y - 5);
                } else {
                    // 通常の障害物
                    switch(obstacle.type) {
                        case 'rock':
                        case 'bigrock':
                            // 岩
                            const rockColor = obstacle.type === 'rock' ? '#6c757d' : '#495057';
                            ctx.fillStyle = rockColor;
                            
                            // 不規則な岩の形状
                            ctx.beginPath();
                            ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
                            ctx.lineTo(obstacle.x, obstacle.y + obstacle.height * 0.3);
                            ctx.lineTo(obstacle.x + obstacle.width * 0.3, obstacle.y);
                            ctx.lineTo(obstacle.x + obstacle.width * 0.7, obstacle.y + obstacle.height * 0.2);
                            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height * 0.4);
                            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                            ctx.closePath();
                            ctx.fill();
                            
                            // 岩の質感（ハイライト）
                            ctx.fillStyle = obstacle.type === 'rock' ? '#adb5bd' : '#6c757d';
                            ctx.beginPath();
                            ctx.moveTo(obstacle.x + obstacle.width * 0.2, obstacle.y + obstacle.height * 0.3);
                            ctx.lineTo(obstacle.x + obstacle.width * 0.4, obstacle.y + obstacle.height * 0.1);
                            ctx.lineTo(obstacle.x + obstacle.width * 0.6, obstacle.y + obstacle.height * 0.2);
                            ctx.lineTo(obstacle.x + obstacle.width * 0.3, obstacle.y + obstacle.height * 0.5);
                            ctx.closePath();
                            ctx.fill();
                            break;
                            
                        case 'log':
                            // 倒木
                            ctx.fillStyle = '#774936';
                            ctx.fillRect(obstacle.x, obstacle.y + obstacle.height * 0.3, obstacle.width, obstacle.height * 0.7);
                            
                            // 木の質感
                            ctx.fillStyle = '#a47148';
                            for (let j = 0; j < 3; j++) {
                                ctx.fillRect(
                                    obstacle.x + j * obstacle.width / 3 + 5,
                                    obstacle.y + obstacle.height * 0.3 - 5,
                                    obstacle.width / 4,
                                    5
                                );
                            }
                            
                            // 枝
                            ctx.fillStyle = '#774936';
                            ctx.fillRect(
                                obstacle.x + obstacle.width * 0.7,
                                obstacle.y,
                                obstacle.width * 0.1,
                                obstacle.height * 0.4
                            );
                            break;
                            
                        case 'wall':
                        case 'highwall':
                            // 壁
                            const wallColor = obstacle.type === 'wall' ? '#6d597a' : '#355070';
                            ctx.fillStyle = wallColor;
                            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                            
                            // レンガの質感
                            ctx.strokeStyle = '#e56b6f';
                            ctx.lineWidth = 1;
                            
                            const brickHeight = 10;
                            const brickWidth = 20;
                            const rows = Math.floor(obstacle.height / brickHeight);
                            const cols = Math.floor(obstacle.width / brickWidth);
                            
                            for (let r = 0; r < rows; r++) {
                                const offset = r % 2 === 0 ? 0 : brickWidth / 2;
                                for (let c = 0; c < cols + 1; c++) {
                                    const x = obstacle.x + c * brickWidth - offset;
                                    const y = obstacle.y + r * brickHeight;
                                    
                                    if (x >= obstacle.x && x + brickWidth <= obstacle.x + obstacle.width) {
                                        ctx.strokeRect(x, y, brickWidth, brickHeight);
                                    }
                                }
                            }
                            break;
                            
                        case 'puddle':
                            // 水たまり
                            ctx.fillStyle = '#457b9d';
                            ctx.beginPath();
                            ctx.ellipse(
                                obstacle.x + obstacle.width / 2,
                                obstacle.y + obstacle.height * 0.8,
                                obstacle.width / 2,
                                obstacle.height / 3,
                                0,
                                0,
                                Math.PI * 2
                            );
                            ctx.fill();
                            
                            // 水の反射
                            ctx.fillStyle = '#a8dadc';
                            ctx.beginPath();
                            ctx.ellipse(
                                obstacle.x + obstacle.width * 0.3,
                                obstacle.y + obstacle.height * 0.7,
                                obstacle.width / 6,
                                obstacle.height / 6,
                                0,
                                0,
                                Math.PI * 2
                            );
                            ctx.fill();
                            break;
                            
                        case 'mud':
                        case 'sand':
                            // 泥沼/砂地
                            const groundColor = obstacle.type === 'mud' ? '#6b705c' : '#ddbea9';
                            ctx.fillStyle = groundColor;
                            
                            // 不規則な地形
                            ctx.beginPath();
                            ctx.moveTo(obstacle.x, obstacle.y + obstacle.height);
                            
                            // 波打つ上部
                            const segments = 8;
                            const segmentWidth = obstacle.width / segments;
                            
                            for (let j = 0; j <= segments; j++) {
                                const waveHeight = Math.sin(j * Math.PI / 2) * obstacle.height * 0.2;
                                ctx.lineTo(
                                    obstacle.x + j * segmentWidth,
                                    obstacle.y + obstacle.height - waveHeight
                                );
                            }
                            
                            ctx.lineTo(obstacle.x + obstacle.width, obstacle.y + obstacle.height);
                            ctx.closePath();
                            ctx.fill();
                            
                            // 質感（点々）
                            const spotColor = obstacle.type === 'mud' ? '#b7b7a4' : '#ffe8d6';
                            ctx.fillStyle = spotColor;
                            for (let j = 0; j < 10; j++) {
                                ctx.beginPath();
                                ctx.arc(
                                    obstacle.x + Math.random() * obstacle.width,
                                    obstacle.y + obstacle.height - Math.random() * obstacle.height * 0.3,
                                    2 + Math.random() * 3,
                                    0,
                                    Math.PI * 2
                                );
                                ctx.fill();
                            }
                            break;
                            
                        case 'fence':
                            // フェンス
                            ctx.fillStyle = '#6c757d';
                            
                            // 支柱
                            ctx.fillRect(obstacle.x + 5, obstacle.y, 5, obstacle.height);
                            ctx.fillRect(obstacle.x + obstacle.width - 10, obstacle.y, 5, obstacle.height);
                            
                            // 横棒
                            const barCount = 5;
                            const barHeight = 5;
                            const barSpacing = (obstacle.height - barCount * barHeight) / (barCount - 1);
                            
                            for (let j = 0; j < barCount; j++) {
                                ctx.fillRect(
                                    obstacle.x,
                                    obstacle.y + j * (barHeight + barSpacing),
                                    obstacle.width,
                                    barHeight
                                );
                            }
                            break;
                            
                        case 'sign':
                            // 看板
                            ctx.fillStyle = '#e63946';
                            
                            // 支柱
                            ctx.fillRect(obstacle.x + obstacle.width / 2 - 5, obstacle.y + obstacle.height / 2, 10, obstacle.height / 2);
                            
                            // 看板部分
                            ctx.fillStyle = '#f1faee';
                            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height / 2);
                            
                            // 枠線
                            ctx.strokeStyle = '#e63946';
                            ctx.lineWidth = 3;
                            ctx.strokeRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height / 2);
                            
                            // テキスト
                            ctx.fillStyle = '#1d3557';
                            ctx.font = '14px Arial';
                            ctx.textAlign = 'center';
                            ctx.fillText('STOP', obstacle.x + obstacle.width / 2, obstacle.y + obstacle.height / 4 + 5);
                            break;
                            
                        default:
                            // デフォルト（未定義の障害物）
                            ctx.fillStyle = '#1d3557';
                            ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
                    }
                    
                    // 名前表示（デバッグ用、必要に応じて削除）
                    // ctx.fillStyle = 'white';
                    // ctx.font = '12px Arial';
                    // ctx.fillText(obstacle.name, obstacle.x, obstacle.y - 5);
                }
            }
        },
        
        checkCollision: function(bike, obstacle) {
            // しゃがんでいる場合はバイクの高さを調整
            const bikeHeight = bike.isCrouching ? bike.height * 0.7 : bike.height;
            const bikeY = bike.isCrouching ? bike.y + bike.height * 0.3 : bike.y;
            
            // バイクの実際の衝突判定領域を調整（視覚的に合わせる）
            const collisionMargin = 10;
            const bikeCollisionX = bike.x + collisionMargin;
            const bikeCollisionWidth = bike.width - collisionMargin * 2;
            
            // ランプの場合は特別な判定（上部のみ）
            if (obstacle.type === 'ramp') {
                // ランプの斜面の方程式: y = mx + b
                const m = (obstacle.y - (obstacle.y + obstacle.height)) / obstacle.width;
                const b = obstacle.y - m * (obstacle.x + obstacle.width);
                
                // バイクの前輪と後輪の位置
                const frontWheelX = bike.x + bike.width * 0.7;
                const frontWheelY = bike.y + bike.height;
                const rearWheelX = bike.x + bike.width * 0.3;
                const rearWheelY = bike.y + bike.height;
                
                // 前輪または後輪がランプの上にあるかチェック
                if (frontWheelX >= obstacle.x && frontWheelX <= obstacle.x + obstacle.width) {
                    const rampYAtFrontWheel = m * frontWheelX + b;
                    if (Math.abs(frontWheelY - rampYAtFrontWheel) < 10) {
                        return true;
                    }
                }
                
                if (rearWheelX >= obstacle.x && rearWheelX <= obstacle.x + obstacle.width) {
                    const rampYAtRearWheel = m * rearWheelX + b;
                    if (Math.abs(rearWheelY - rampYAtRearWheel) < 10) {
                        return true;
                    }
                }
                
                return false;
            }
            
            // 障害物の種類に応じた衝突判定の調整
            let obstacleCollisionX = obstacle.x;
            let obstacleCollisionY = obstacle.y;
            let obstacleCollisionWidth = obstacle.width;
            let obstacleCollisionHeight = obstacle.height;
            
            // 岩や倒木などの不規則な形状の障害物は衝突判定を調整
            if (obstacle.type === 'rock' || obstacle.type === 'log') {
                obstacleCollisionX += 5;
                obstacleCollisionWidth -= 10;
                obstacleCollisionHeight -= 5;
            }
            
            // 水たまりは低い障害物なので、ジャンプ中は衝突しない
            if (obstacle.type === 'puddle' && bike.isJumping) {
                return false;
            }
            
            // 通常の障害物との衝突判定
            return (
                bikeCollisionX < obstacleCollisionX + obstacleCollisionWidth &&
                bikeCollisionX + bikeCollisionWidth > obstacleCollisionX &&
                bikeY < obstacleCollisionY + obstacleCollisionHeight &&
                bikeY + bikeHeight > obstacleCollisionY
            );
        }
    };
    
    // 背景の設定
    const background = {
        layers: [
            { speed: 0.1, elements: [] },  // 空と雲
            { speed: 0.3, elements: [] },  // 遠くの山
            { speed: 0.5, elements: [] },  // 近くの山
            { speed: 0.8, elements: [] }   // 前景
        ],
        timeOfDay: 0, // 0: 朝, 1: 昼, 2: 夕方
        
        // 雲の初期化
        initClouds: function() {
            for (let i = 0; i < 5; i++) {
                this.layers[0].elements.push({
                    x: Math.random() * canvas.width,
                    y: 30 + Math.random() * 70,
                    width: 60 + Math.random() * 40,
                    height: 30 + Math.random() * 20,
                    type: 'cloud'
                });
            }
        },
        
        // 遠くの山の初期化
        initFarMountains: function() {
            for (let i = 0; i < 3; i++) {
                this.layers[1].elements.push({
                    x: i * 300,
                    height: 100 + Math.random() * 50,
                    width: 300,
                    type: 'mountain'
                });
            }
        },
        
        // 近くの山の初期化
        initNearMountains: function() {
            for (let i = 0; i < 4; i++) {
                this.layers[2].elements.push({
                    x: i * 250 - 50,
                    height: 150 + Math.random() * 70,
                    width: 250,
                    type: 'mountain'
                });
            }
        },
        
        // 前景の初期化
        initForeground: function() {
            // 木
            for (let i = 0; i < 8; i++) {
                this.layers[3].elements.push({
                    x: i * 200 - 100,
                    y: 220,
                    height: 80,
                    width: 40,
                    type: 'tree'
                });
            }
            
            // 岩
            for (let i = 0; i < 5; i++) {
                this.layers[3].elements.push({
                    x: i * 300 + 150,
                    y: 270,
                    height: 30,
                    width: 50,
                    type: 'rock'
                });
            }
        },
        
        update: function() {
            if (!gameStarted || gamePaused) return;
            
            // 時間経過による背景変化
            if (gameTime > 60000 && gameTime < 120000) {
                this.timeOfDay = 1; // 昼
            } else if (gameTime >= 120000) {
                this.timeOfDay = 2; // 夕方
            }
            
            // 各レイヤーの更新
            for (let l = 0; l < this.layers.length; l++) {
                const layer = this.layers[l];
                
                for (let i = 0; i < layer.elements.length; i++) {
                    const element = layer.elements[i];
                    element.x -= layer.speed * bike.speed;
                    
                    // 画面外に出たら反対側に配置
                    if (element.x + (element.width || 0) < -100) {
                        if (element.type === 'cloud') {
                            element.x = canvas.width + Math.random() * 100;
                            element.y = 30 + Math.random() * 70;
                            element.width = 60 + Math.random() * 40;
                            element.height = 30 + Math.random() * 20;
                        } else if (element.type === 'mountain') {
                            element.x = canvas.width + Math.random() * 50;
                            if (l === 1) { // 遠くの山
                                element.height = 100 + Math.random() * 50;
                            } else { // 近くの山
                                element.height = 150 + Math.random() * 70;
                            }
                        } else if (element.type === 'tree') {
                            element.x = canvas.width + Math.random() * 100;
                        } else if (element.type === 'rock') {
                            element.x = canvas.width + Math.random() * 200;
                        }
                    }
                }
            }
        },
        
        draw: function() {
            // 空のグラデーション（時間帯によって変化）
            let skyColors;
            if (this.timeOfDay === 0) {
                // 朝
                skyColors = ['#caf0f8', '#90e0ef', '#48cae4'];
            } else if (this.timeOfDay === 1) {
                // 昼
                skyColors = ['#48cae4', '#00b4d8', '#0096c7'];
            } else {
                // 夕方
                skyColors = ['#ffb703', '#fb8500', '#dc2f02'];
            }
            
            const gradient = ctx.createLinearGradient(0, 0, 0, 300);
            gradient.addColorStop(0, skyColors[0]);
            gradient.addColorStop(0.5, skyColors[1]);
            gradient.addColorStop(1, skyColors[2]);
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, canvas.width, 300);
            
            // 太陽/月
            if (this.timeOfDay === 0) {
                // 朝日
                ctx.fillStyle = '#ffb703';
                ctx.beginPath();
                ctx.arc(100, 80, 30, 0, Math.PI * 2);
                ctx.fill();
                
                // 光線
                ctx.strokeStyle = '#ffb703';
                ctx.lineWidth = 2;
                for (let i = 0; i < 8; i++) {
                    const angle = i * Math.PI / 4;
                    ctx.beginPath();
                    ctx.moveTo(100 + Math.cos(angle) * 35, 80 + Math.sin(angle) * 35);
                    ctx.lineTo(100 + Math.cos(angle) * 50, 80 + Math.sin(angle) * 50);
                    ctx.stroke();
                }
            } else if (this.timeOfDay === 1) {
                // 昼の太陽
                ctx.fillStyle = '#ffb703';
                ctx.beginPath();
                ctx.arc(canvas.width - 100, 80, 40, 0, Math.PI * 2);
                ctx.fill();
            } else {
                // 夕日
                ctx.fillStyle = '#d00000';
                ctx.beginPath();
                ctx.arc(canvas.width - 150, 200, 50, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 雲
            for (const cloud of this.layers[0].elements) {
                // 時間帯による雲の色変化
                let cloudColor;
                if (this.timeOfDay === 0) {
                    cloudColor = 'rgba(255, 255, 255, 0.8)';
                } else if (this.timeOfDay === 1) {
                    cloudColor = 'rgba(255, 255, 255, 0.9)';
                } else {
                    cloudColor = 'rgba(255, 220, 200, 0.8)';
                }
                
                ctx.fillStyle = cloudColor;
                ctx.beginPath();
                ctx.ellipse(cloud.x, cloud.y, cloud.width / 2, cloud.height / 2, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(cloud.x + cloud.width * 0.2, cloud.y - cloud.height * 0.1, cloud.width * 0.3, cloud.height * 0.4, 0, 0, Math.PI * 2);
                ctx.fill();
                ctx.beginPath();
                ctx.ellipse(cloud.x - cloud.width * 0.2, cloud.y - cloud.height * 0.05, cloud.width * 0.25, cloud.height * 0.3, 0, 0, Math.PI * 2);
                ctx.fill();
            }
            
            // 遠くの山
            for (const mountain of this.layers[1].elements) {
                // 時間帯による山の色変化
                let mountainColor;
                if (this.timeOfDay === 0) {
                    mountainColor = '#457b9d';
                } else if (this.timeOfDay === 1) {
                    mountainColor = '#1d3557';
                } else {
                    mountainColor = '#6a4c93';
                }
                
                ctx.fillStyle = mountainColor;
                ctx.beginPath();
                ctx.moveTo(mountain.x, 300);
                ctx.lineTo(mountain.x + mountain.width / 2, 300 - mountain.height);
                ctx.lineTo(mountain.x + mountain.width, 300);
                ctx.closePath();
                ctx.fill();
            }
            
            // 近くの山
            for (const mountain of this.layers[2].elements) {
                // 時間帯による山の色変化
                let mountainColor, detailColor;
                if (this.timeOfDay === 0) {
                    mountainColor = '#2a9d8f';
                    detailColor = '#264653';
                } else if (this.timeOfDay === 1) {
                    mountainColor = '#3d5a80';
                    detailColor = '#293241';
                } else {
                    mountainColor = '#560bad';
                    detailColor = '#3c096c';
                }
                
                ctx.fillStyle = mountainColor;
                ctx.beginPath();
                ctx.moveTo(mountain.x, 300);
                ctx.lineTo(mountain.x + mountain.width / 2, 300 - mountain.height);
                ctx.lineTo(mountain.x + mountain.width, 300);
                ctx.closePath();
                ctx.fill();
                
                // 山の詳細
                ctx.fillStyle = detailColor;
                ctx.beginPath();
                ctx.moveTo(mountain.x + mountain.width / 2, 300 - mountain.height);
                ctx.lineTo(mountain.x + mountain.width * 0.65, 300 - mountain.height * 0.7);
                ctx.lineTo(mountain.x + mountain.width * 0.75, 300 - mountain.height * 0.8);
                ctx.lineTo(mountain.x + mountain.width * 0.9, 300 - mountain.height * 0.6);
                ctx.lineTo(mountain.x + mountain.width, 300);
                ctx.closePath();
                ctx.fill();
            }
            
            // 前景の要素
            for (const element of this.layers[3].elements) {
                if (element.type === 'tree') {
                    // 木
                    // 幹
                    ctx.fillStyle = '#774936';
                    ctx.fillRect(element.x + element.width / 2 - 5, element.y, 10, element.height);
                    
                    // 葉
                    let leafColor;
                    if (this.timeOfDay === 0) {
                        leafColor = '#52b788';
                    } else if (this.timeOfDay === 1) {
                        leafColor = '#40916c';
                    } else {
                        leafColor = '#2d6a4f';
                    }
                    
                    ctx.fillStyle = leafColor;
                    ctx.beginPath();
                    ctx.moveTo(element.x, element.y);
                    ctx.lineTo(element.x + element.width / 2, element.y - element.height * 0.7);
                    ctx.lineTo(element.x + element.width, element.y);
                    ctx.closePath();
                    ctx.fill();
                    
                    ctx.beginPath();
                    ctx.moveTo(element.x, element.y - element.height * 0.3);
                    ctx.lineTo(element.x + element.width / 2, element.y - element.height);
                    ctx.lineTo(element.x + element.width, element.y - element.height * 0.3);
                    ctx.closePath();
                    ctx.fill();
                } else if (element.type === 'rock') {
                    // 岩
                    ctx.fillStyle = '#6c757d';
                    ctx.beginPath();
                    ctx.moveTo(element.x, element.y + element.height);
                    ctx.lineTo(element.x, element.y + element.height * 0.3);
                    ctx.lineTo(element.x + element.width * 0.3, element.y);
                    ctx.lineTo(element.x + element.width * 0.7, element.y + element.height * 0.2);
                    ctx.lineTo(element.x + element.width, element.y + element.height * 0.4);
                    ctx.lineTo(element.x + element.width, element.y + element.height);
                    ctx.closePath();
                    ctx.fill();
                }
            }
            
            // 地面
            let groundColor, markingColor;
            if (this.timeOfDay === 0) {
                groundColor = '#8d99ae';
                markingColor = 'white';
            } else if (this.timeOfDay === 1) {
                groundColor = '#6c757d';
                markingColor = 'white';
            } else {
                groundColor = '#495057';
                markingColor = '#adb5bd';
            }
            
            ctx.fillStyle = groundColor;
            ctx.fillRect(0, 300, canvas.width, 100);
            
            // 地面のテクスチャ
            ctx.fillStyle = '#6c757d';
            for (let i = 0; i < 40; i++) {
                const x = (i * 20 - (distance % 20));
                ctx.fillRect(x, 300, 10, 2);
            }
            
            // 地面のマーキング
            ctx.strokeStyle = markingColor;
            ctx.lineWidth = 2;
            for (let i = 0; i < 20; i++) {
                const markX = (i * 50 - (distance % 50));
                ctx.beginPath();
                ctx.moveTo(markX, 330);
                ctx.lineTo(markX + 20, 330);
                ctx.stroke();
            }
        }
    };
    
    // ゲームオーバー画面
    function drawGameOver() {
        if (gameOver) {
            // 半透明の背景
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // ゲームオーバーテキスト
            ctx.fillStyle = 'white';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('ゲームオーバー', canvas.width / 2, canvas.height / 2 - 40);
            
            // スコア表示
            ctx.font = '24px Arial';
            ctx.fillText(`スコア: ${score}`, canvas.width / 2, canvas.height / 2 + 10);
            ctx.fillText(`走行距離: ${Math.floor(distance / 100)} m`, canvas.width / 2, canvas.height / 2 + 50);
            
            // リスタート案内
            ctx.font = '18px Arial';
            ctx.fillText('リセットボタンを押してリスタート', canvas.width / 2, canvas.height / 2 + 100);
            
            // 点滅するリスタートボタン案内
            const blinkRate = Math.sin(Date.now() / 300) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${blinkRate})`;
            ctx.fillText('↓', canvas.width / 2, canvas.height / 2 + 130);
        }
    }
    
    // スタート画面
    function drawStartScreen() {
        if (!gameStarted) {
            // 半透明の背景
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // タイトル
            ctx.fillStyle = 'white';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('エキサイトバイク', canvas.width / 2, canvas.height / 2 - 40);
            
            // 操作説明
            ctx.font = '18px Arial';
            ctx.fillText('↑: ジャンプ  ↓: しゃがむ  ←→: 減速/加速  スペース: ターボ', canvas.width / 2, canvas.height / 2 + 10);
            
            // スタート案内
            ctx.font = '24px Arial';
            
            // 点滅効果
            const blinkRate = Math.sin(Date.now() / 300) * 0.5 + 0.5;
            ctx.fillStyle = `rgba(255, 255, 255, ${blinkRate})`;
            ctx.fillText('スタートボタンを押してゲーム開始', canvas.width / 2, canvas.height / 2 + 60);
        }
    }
    
    // 一時停止画面
    function drawPauseScreen() {
        if (gamePaused && gameStarted && !gameOver) {
            ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            ctx.fillStyle = 'white';
            ctx.font = '36px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('一時停止', canvas.width / 2, canvas.height / 2);
            
            ctx.font = '24px Arial';
            ctx.fillText('Pキーで再開', canvas.width / 2, canvas.height / 2 + 50);
        }
    }
    
    // タイマーの更新
    function updateTimer(deltaTime) {
        if (gameStarted && !gameOver && !gamePaused) {
            gameTime += deltaTime;
            
            const minutes = Math.floor(gameTime / 60000);
            const seconds = Math.floor((gameTime % 60000) / 1000);
            
            document.getElementById('time').textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    // ゲームのリセット
    function resetGame() {
        score = 0;
        distance = 0;
        gameTime = 0;
        gameOver = false;
        difficulty = 1;
        background.timeOfDay = 0;
        
        document.getElementById('score').textContent = '0';
        document.getElementById('time').textContent = '0:00';
        document.getElementById('speed').textContent = '0';
        document.getElementById('combo').textContent = '0x';
        
        bike.x = 100;
        bike.y = 300;
        bike.speed = 0;
        bike.velocityY = 0;
        bike.isJumping = false;
        bike.wasJumping = false;
        bike.isCrouching = false;
        bike.turbo = false;
        bike.crashAnimation = 0;
        bike.wheelRotation = 0;
        bike.suspensionOffset = 0;
        
        obstacles.reset();
        particles.list = [];
        combo.reset();
        
        // 背景要素の初期化
        background.layers[0].elements = [];
        background.layers[1].elements = [];
        background.layers[2].elements = [];
        background.layers[3].elements = [];
        background.initClouds();
        background.initFarMountains();
        background.initNearMountains();
        background.initForeground();
    }
    
    // ゲームループ
    function gameLoop(timestamp) {
        // デルタタイムの計算
        const deltaTime = timestamp - lastTime || 0;
        lastTime = timestamp;
        
        // 背景のクリア
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // 背景の更新と描画
        background.update();
        background.draw();
        
        // 障害物の生成と更新
        obstacles.generate(timestamp);
        obstacles.update();
        obstacles.draw();
        
        // パーティクルの更新と描画
        particles.update();
        particles.draw();
        
        // バイクの更新と描画
        bike.update();
        bike.draw();
        
        // エンジン音の更新
        sound.updateEngine(bike.speed);
        
        // コンボの更新
        combo.update();
        
        // タイマーの更新
        updateTimer(deltaTime);
        
        // ゲームオーバー画面
        if (gameOver) {
            drawGameOver();
        }
        
        // スタート画面
        if (!gameStarted) {
            drawStartScreen();
        }
        
        // 一時停止画面
        if (gamePaused) {
            drawPauseScreen();
        }
        
        // 次のフレームをリクエスト
        animationFrameId = requestAnimationFrame(gameLoop);
    }
    
    // キーボード操作
    const keys = {};
    
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        
        switch (e.code) {
            case 'ArrowUp':
                bike.jump();
                break;
            case 'ArrowDown':
                bike.crouch();
                break;
            case 'Space':
                bike.activateTurbo();
                break;
            case 'KeyP':
                // ゲームが開始されていて、ゲームオーバーでない場合のみ一時停止を切り替え
                if (gameStarted && !gameOver) {
                    gamePaused = !gamePaused;
                    if (!gamePaused) {
                        // 一時停止解除時にlastTimeをリセットして、大きなデルタタイムを防ぐ
                        lastTime = performance.now();
                        sound.resumeGame();
                    } else {
                        sound.pauseGame();
                    }
                }
                break;
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
        
        switch (e.code) {
            case 'ArrowDown':
                bike.stand();
                break;
            case 'Space':
                bike.deactivateTurbo();
                break;
        }
    });
    
    // 継続的なキー入力の処理
    function handleKeys() {
        if (!gamePaused && gameStarted && !gameOver) {
            if (keys['ArrowRight']) {
                bike.accelerate();
            }
            
            if (keys['ArrowLeft']) {
                bike.brake();
            }
        }
        
        setTimeout(handleKeys, 30);
    }
    
    // ボタン操作
    document.getElementById('start-button').addEventListener('click', () => {
        if (!gameStarted) {
            gameStarted = true;
            gamePaused = false;
            resetGame();
            lastTime = performance.now();
            sound.startGame();
        } else if (gamePaused) {
            gamePaused = false;
            lastTime = performance.now();
            sound.resumeGame();
        }
    });
    
    document.getElementById('reset-button').addEventListener('click', () => {
        gameStarted = false;
        gamePaused = false;
        resetGame();
        sound.stopGame();
    });
    
    document.getElementById('sound-toggle').addEventListener('click', () => {
        sound.toggle();
    });
    
    // 初期化
    background.initClouds();
    background.initFarMountains();
    background.initNearMountains();
    background.initForeground();
    
    // サウンドシステムの初期化
    sound.init();
    
    // ゲーム開始
    handleKeys();
    gameLoop(0);
});
