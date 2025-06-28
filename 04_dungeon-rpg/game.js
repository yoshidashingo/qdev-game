// ダンジョン・クリッカー RPG
class DungeonRPG {
    constructor() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // ゲーム状態
        this.gameState = 'playing'; // playing, gameOver
        this.currentFloor = 1;
        
        // マップサイズ
        this.mapWidth = 20;
        this.mapHeight = 15;
        this.tileSize = 30;
        
        // プレイヤー
        this.player = {
            x: 1,
            y: 1,
            level: 1,
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            exp: 0,
            nextExp: 100,
            attack: 20,
            defense: 5,
            inventory: [],
            equipment: {
                weapon: null,
                armor: null
            }
        };
        
        // 敵リスト
        this.enemies = [];
        
        // アイテムリスト
        this.items = [];
        
        // ダンジョンマップ (0: 床, 1: 壁, 2: 階段)
        this.dungeon = [];
        
        // UI要素
        this.showInventory = true;
        this.showMinimap = false;
        
        // メッセージログ
        this.messageLog = [];
        
        this.init();
    }
    
    init() {
        this.generateDungeon();
        this.spawnEnemies();
        this.spawnItems();
        this.setupEventListeners();
        this.updateUI();
        this.gameLoop();
    }
    
    // ダンジョン生成
    generateDungeon() {
        // 初期化（全て壁）
        this.dungeon = Array(this.mapHeight).fill().map(() => Array(this.mapWidth).fill(1));
        
        // 簡単な部屋生成アルゴリズム
        const rooms = [];
        const numRooms = 5 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numRooms; i++) {
            const room = {
                x: Math.floor(Math.random() * (this.mapWidth - 6)) + 2,
                y: Math.floor(Math.random() * (this.mapHeight - 6)) + 2,
                width: 3 + Math.floor(Math.random() * 4),
                height: 3 + Math.floor(Math.random() * 4)
            };
            
            // 部屋を作成
            for (let y = room.y; y < room.y + room.height && y < this.mapHeight - 1; y++) {
                for (let x = room.x; x < room.x + room.width && x < this.mapWidth - 1; x++) {
                    this.dungeon[y][x] = 0;
                }
            }
            
            rooms.push(room);
        }
        
        // 部屋を廊下で繋ぐ
        for (let i = 0; i < rooms.length - 1; i++) {
            const roomA = rooms[i];
            const roomB = rooms[i + 1];
            
            const centerAX = Math.floor(roomA.x + roomA.width / 2);
            const centerAY = Math.floor(roomA.y + roomA.height / 2);
            const centerBX = Math.floor(roomB.x + roomB.width / 2);
            const centerBY = Math.floor(roomB.y + roomB.height / 2);
            
            // 水平廊下
            const startX = Math.min(centerAX, centerBX);
            const endX = Math.max(centerAX, centerBX);
            for (let x = startX; x <= endX; x++) {
                this.dungeon[centerAY][x] = 0;
            }
            
            // 垂直廊下
            const startY = Math.min(centerAY, centerBY);
            const endY = Math.max(centerAY, centerBY);
            for (let y = startY; y <= endY; y++) {
                this.dungeon[y][centerBX] = 0;
            }
        }
        
        // プレイヤーの開始位置を設定
        this.player.x = rooms[0].x + 1;
        this.player.y = rooms[0].y + 1;
        
        // 階段を最後の部屋に配置
        const lastRoom = rooms[rooms.length - 1];
        const stairX = lastRoom.x + Math.floor(lastRoom.width / 2);
        const stairY = lastRoom.y + Math.floor(lastRoom.height / 2);
        this.dungeon[stairY][stairX] = 2;
    }
    
    // 敵を配置
    spawnEnemies() {
        this.enemies = [];
        const numEnemies = 3 + Math.floor(Math.random() * 5);
        
        for (let i = 0; i < numEnemies; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * this.mapWidth);
                y = Math.floor(Math.random() * this.mapHeight);
            } while (this.dungeon[y][x] !== 0 || (x === this.player.x && y === this.player.y));
            
            const enemyTypes = ['スライム', 'ゴブリン', 'スケルトン'];
            const type = enemyTypes[Math.floor(Math.random() * enemyTypes.length)];
            
            const enemy = {
                x: x,
                y: y,
                type: type,
                hp: 30 + this.currentFloor * 10,
                maxHp: 30 + this.currentFloor * 10,
                attack: 10 + this.currentFloor * 3,
                exp: 20 + this.currentFloor * 5,
                alive: true
            };
            
            this.enemies.push(enemy);
        }
    }
    
    // アイテムを配置
    spawnItems() {
        this.items = [];
        const numItems = 2 + Math.floor(Math.random() * 3);
        
        for (let i = 0; i < numItems; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * this.mapWidth);
                y = Math.floor(Math.random() * this.mapHeight);
            } while (this.dungeon[y][x] !== 0 || (x === this.player.x && y === this.player.y) || 
                     this.enemies.some(e => e.x === x && e.y === y));
            
            const itemTypes = [
                { name: 'ポーション', type: 'consumable', effect: 'heal', value: 50 },
                { name: 'マナポーション', type: 'consumable', effect: 'mana', value: 30 },
                { name: '剣', type: 'weapon', attack: 5 + this.currentFloor * 2 },
                { name: '盾', type: 'armor', defense: 3 + this.currentFloor }
            ];
            
            const itemType = itemTypes[Math.floor(Math.random() * itemTypes.length)];
            const item = {
                x: x,
                y: y,
                ...itemType
            };
            
            this.items.push(item);
        }
    }
    
    // イベントリスナー設定
    setupEventListeners() {
        // マウスクリック
        this.canvas.addEventListener('click', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            const x = Math.floor((e.clientX - rect.left) / this.tileSize);
            const y = Math.floor((e.clientY - rect.top) / this.tileSize);
            this.handleClick(x, y);
        });
        
        // キーボード
        document.addEventListener('keydown', (e) => {
            this.handleKeyPress(e.key);
        });
        
        // スキルボタン
        document.getElementById('skill1').addEventListener('click', () => this.useSkill(1));
        document.getElementById('skill2').addEventListener('click', () => this.useSkill(2));
        document.getElementById('skill3').addEventListener('click', () => this.useSkill(3));
        
        // リスタートボタン
        document.getElementById('restartBtn').addEventListener('click', () => {
            this.restart();
        });
    }
    
    // クリック処理
    handleClick(x, y) {
        if (this.gameState !== 'playing') return;
        
        // 範囲チェック
        if (x < 0 || x >= this.mapWidth || y < 0 || y >= this.mapHeight) return;
        
        // 壁チェック
        if (this.dungeon[y][x] === 1) return;
        
        // 敵との戦闘
        const enemy = this.enemies.find(e => e.x === x && e.y === y && e.alive);
        if (enemy) {
            this.attackEnemy(enemy);
            return;
        }
        
        // アイテム取得
        const item = this.items.find(i => i.x === x && i.y === y);
        if (item) {
            this.collectItem(item);
            return;
        }
        
        // 階段チェック
        if (this.dungeon[y][x] === 2) {
            this.nextFloor();
            return;
        }
        
        // 移動
        this.movePlayer(x, y);
    }
    
    // プレイヤー移動
    movePlayer(x, y) {
        this.player.x = x;
        this.player.y = y;
        this.addMessage(`(${x}, ${y})に移動しました。`);
    }
    
    // 敵攻撃
    attackEnemy(enemy) {
        const damage = Math.max(1, this.player.attack - Math.floor(Math.random() * 5));
        enemy.hp -= damage;
        this.addMessage(`${enemy.type}に${damage}のダメージを与えた！`);
        
        if (enemy.hp <= 0) {
            enemy.alive = false;
            this.player.exp += enemy.exp;
            this.addMessage(`${enemy.type}を倒した！ ${enemy.exp}EXP獲得！`);
            this.checkLevelUp();
        } else {
            // 敵の反撃
            const enemyDamage = Math.max(1, enemy.attack - this.player.defense);
            this.player.hp -= enemyDamage;
            this.addMessage(`${enemy.type}から${enemyDamage}のダメージを受けた！`);
            
            if (this.player.hp <= 0) {
                this.gameOver();
            }
        }
        
        this.updateUI();
    }
    
    // アイテム取得
    collectItem(item) {
        if (item.type === 'consumable') {
            if (item.effect === 'heal') {
                this.player.hp = Math.min(this.player.maxHp, this.player.hp + item.value);
                this.addMessage(`${item.name}を使用してHP${item.value}回復！`);
            } else if (item.effect === 'mana') {
                this.player.mp = Math.min(this.player.maxMp, this.player.mp + item.value);
                this.addMessage(`${item.name}を使用してMP${item.value}回復！`);
            }
        } else {
            this.player.inventory.push(item);
            this.addMessage(`${item.name}を取得した！`);
        }
        
        // アイテムを削除
        const index = this.items.indexOf(item);
        this.items.splice(index, 1);
        
        this.updateUI();
    }
    
    // レベルアップチェック
    checkLevelUp() {
        if (this.player.exp >= this.player.nextExp) {
            this.player.level++;
            this.player.exp -= this.player.nextExp;
            this.player.nextExp = Math.floor(this.player.nextExp * 1.5);
            
            // ステータス上昇
            const hpIncrease = 20;
            const mpIncrease = 10;
            this.player.maxHp += hpIncrease;
            this.player.maxMp += mpIncrease;
            this.player.hp = this.player.maxHp; // 全回復
            this.player.mp = this.player.maxMp;
            this.player.attack += 3;
            this.player.defense += 2;
            
            this.addMessage(`レベルアップ！ Lv.${this.player.level}になった！`);
            this.addMessage(`HP+${hpIncrease}, MP+${mpIncrease}, ATK+3, DEF+2`);
        }
    }
    
    // スキル使用
    useSkill(skillNum) {
        if (this.gameState !== 'playing') return;
        
        switch (skillNum) {
            case 1: // 攻撃スキル
                if (this.player.mp >= 5) {
                    this.player.mp -= 5;
                    // 周囲の敵にダメージ
                    const nearbyEnemies = this.enemies.filter(e => 
                        e.alive && Math.abs(e.x - this.player.x) <= 1 && Math.abs(e.y - this.player.y) <= 1
                    );
                    
                    if (nearbyEnemies.length > 0) {
                        nearbyEnemies.forEach(enemy => {
                            const damage = this.player.attack + 10;
                            enemy.hp -= damage;
                            this.addMessage(`${enemy.type}に${damage}のダメージ！`);
                            
                            if (enemy.hp <= 0) {
                                enemy.alive = false;
                                this.player.exp += enemy.exp;
                                this.addMessage(`${enemy.type}を倒した！`);
                                this.checkLevelUp();
                            }
                        });
                    } else {
                        this.addMessage('近くに敵がいません。');
                    }
                    this.updateUI();
                }
                break;
                
            case 2: // 回復スキル
                if (this.player.mp >= 10) {
                    this.player.mp -= 10;
                    const healAmount = 40;
                    this.player.hp = Math.min(this.player.maxHp, this.player.hp + healAmount);
                    this.addMessage(`回復スキルでHP${healAmount}回復！`);
                    this.updateUI();
                }
                break;
                
            case 3: // 魔法攻撃
                if (this.player.mp >= 15) {
                    this.player.mp -= 15;
                    // 遠距離攻撃
                    const allEnemies = this.enemies.filter(e => e.alive);
                    if (allEnemies.length > 0) {
                        const target = allEnemies[Math.floor(Math.random() * allEnemies.length)];
                        const damage = this.player.attack + 20;
                        target.hp -= damage;
                        this.addMessage(`${target.type}に魔法で${damage}のダメージ！`);
                        
                        if (target.hp <= 0) {
                            target.alive = false;
                            this.player.exp += target.exp;
                            this.addMessage(`${target.type}を倒した！`);
                            this.checkLevelUp();
                        }
                    } else {
                        this.addMessage('敵がいません。');
                    }
                    this.updateUI();
                }
                break;
        }
    }
    
    // キー入力処理
    handleKeyPress(key) {
        switch (key) {
            case '1':
                this.useSkill(1);
                break;
            case '2':
                this.useSkill(2);
                break;
            case '3':
                this.useSkill(3);
                break;
            case 'i':
            case 'I':
                this.showInventory = !this.showInventory;
                break;
            case 'm':
            case 'M':
                this.showMinimap = !this.showMinimap;
                break;
        }
    }
    
    // 次のフロアへ
    nextFloor() {
        this.currentFloor++;
        this.addMessage(`フロア${this.currentFloor}に進みました！`);
        
        // 新しいダンジョン生成
        this.generateDungeon();
        this.spawnEnemies();
        this.spawnItems();
        
        this.updateUI();
    }
    
    // メッセージ追加
    addMessage(message) {
        this.messageLog.push(message);
        if (this.messageLog.length > 10) {
            this.messageLog.shift();
        }
        
        const messageLogElement = document.getElementById('messageLog');
        messageLogElement.innerHTML = this.messageLog.map(msg => `<p>${msg}</p>`).join('');
        messageLogElement.scrollTop = messageLogElement.scrollHeight;
    }
    
    // UI更新
    updateUI() {
        document.getElementById('level').textContent = this.player.level;
        document.getElementById('hp').textContent = this.player.hp;
        document.getElementById('maxHp').textContent = this.player.maxHp;
        document.getElementById('mp').textContent = this.player.mp;
        document.getElementById('maxMp').textContent = this.player.maxMp;
        document.getElementById('exp').textContent = this.player.exp;
        document.getElementById('nextExp').textContent = this.player.nextExp;
        document.getElementById('floor').textContent = this.currentFloor;
        
        // スキルボタンの状態更新
        document.getElementById('skill1').disabled = this.player.mp < 5;
        document.getElementById('skill2').disabled = this.player.mp < 10;
        document.getElementById('skill3').disabled = this.player.mp < 15;
        
        // インベントリ更新
        const inventoryElement = document.getElementById('inventoryItems');
        inventoryElement.innerHTML = '';
        this.player.inventory.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'inventory-item';
            itemElement.textContent = item.name.charAt(0);
            itemElement.title = item.name;
            inventoryElement.appendChild(itemElement);
        });
    }
    
    // ゲームオーバー
    gameOver() {
        this.gameState = 'gameOver';
        document.getElementById('finalFloor').textContent = this.currentFloor;
        document.getElementById('finalLevel').textContent = this.player.level;
        document.getElementById('gameOverScreen').classList.remove('hidden');
    }
    
    // リスタート
    restart() {
        this.gameState = 'playing';
        this.currentFloor = 1;
        
        // プレイヤーリセット
        this.player = {
            x: 1,
            y: 1,
            level: 1,
            hp: 100,
            maxHp: 100,
            mp: 50,
            maxMp: 50,
            exp: 0,
            nextExp: 100,
            attack: 20,
            defense: 5,
            inventory: [],
            equipment: {
                weapon: null,
                armor: null
            }
        };
        
        this.messageLog = [];
        
        document.getElementById('gameOverScreen').classList.add('hidden');
        
        this.generateDungeon();
        this.spawnEnemies();
        this.spawnItems();
        this.updateUI();
        this.addMessage('新しい冒険が始まりました！');
    }
    
    // 描画
    draw() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // ダンジョン描画
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                const tileType = this.dungeon[y][x];
                
                switch (tileType) {
                    case 0: // 床
                        this.ctx.fillStyle = '#444';
                        break;
                    case 1: // 壁
                        this.ctx.fillStyle = '#222';
                        break;
                    case 2: // 階段
                        this.ctx.fillStyle = '#888';
                        break;
                }
                
                this.ctx.fillRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
                
                // グリッド線
                this.ctx.strokeStyle = '#666';
                this.ctx.lineWidth = 1;
                this.ctx.strokeRect(x * this.tileSize, y * this.tileSize, this.tileSize, this.tileSize);
            }
        }
        
        // アイテム描画
        this.items.forEach(item => {
            this.ctx.fillStyle = '#ffd700';
            this.ctx.fillRect(
                item.x * this.tileSize + 5,
                item.y * this.tileSize + 5,
                this.tileSize - 10,
                this.tileSize - 10
            );
        });
        
        // 敵描画
        this.enemies.forEach(enemy => {
            if (enemy.alive) {
                this.ctx.fillStyle = '#ff4444';
                this.ctx.fillRect(
                    enemy.x * this.tileSize + 2,
                    enemy.y * this.tileSize + 2,
                    this.tileSize - 4,
                    this.tileSize - 4
                );
                
                // 敵のHP表示
                this.ctx.fillStyle = '#fff';
                this.ctx.font = '10px monospace';
                this.ctx.fillText(
                    enemy.hp.toString(),
                    enemy.x * this.tileSize + 5,
                    enemy.y * this.tileSize + 15
                );
            }
        });
        
        // プレイヤー描画
        this.ctx.fillStyle = '#4444ff';
        this.ctx.fillRect(
            this.player.x * this.tileSize + 3,
            this.player.y * this.tileSize + 3,
            this.tileSize - 6,
            this.tileSize - 6
        );
        
        // 階段の表示
        for (let y = 0; y < this.mapHeight; y++) {
            for (let x = 0; x < this.mapWidth; x++) {
                if (this.dungeon[y][x] === 2) {
                    this.ctx.fillStyle = '#fff';
                    this.ctx.font = '16px monospace';
                    this.ctx.fillText('↓', x * this.tileSize + 8, y * this.tileSize + 20);
                }
            }
        }
    }
    
    // ゲームループ
    gameLoop() {
        this.draw();
        requestAnimationFrame(() => this.gameLoop());
    }
}

// ゲーム開始
window.addEventListener('load', () => {
    new DungeonRPG();
});
