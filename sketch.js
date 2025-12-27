﻿let spriteSheet;
let newSpriteSheet; // 新角色的精靈圖
let character;
let newCharacter; // 新角色物件
let quizTable; // 用於儲存 CSV 測驗題庫
let currentQuizTable; // 目前正在使用的題庫
let backgroundImage; // 用於儲存背景圖片
let gameState = 'START'; // 遊戲狀態：START (選單), PLAYING (遊戲中)
let btnStart, btnRestart; // 開始按鈕, 重新開始按鈕
let particles = []; // 背景粒子系統
let score = 0; // 玩家得分
let questionsAnswered = 0; // 目前已回答題數
const TOTAL_QUESTIONS = 10; // 總題數限制
let floatingTexts = []; // 浮動文字特效陣列
let monsterImage; // 怪物圖片
let monsters = []; // 怪物陣列
let shortcutNPCs = []; // 可解鎖捷徑的NPC
let healthPacks = []; // 血包陣列
let health = 3; // 玩家生命值
const MAX_HEALTH = 3; // 最大生命值
let maze = []; // 迷宮陣列
let cellSize = 60; // 迷宮格子大小
let cols, rows; // 迷宮行列數

// --- 對話系統變數 ---
let dialogState = 'IDLE'; // IDLE, ASKING, FEEDBACK, CHATTING
let currentDialog = { message: '', alpha: 0 };
let currentQuestion = null; // 目前的題目物件
let interactionActive = false; // 是否在互動範圍內

// --- 互動控制與特效變數 ---
let btnTrue, btnFalse; // 是非按鈕
let shakeTimer = 0;    // 震動計時器
let invincibilityTimer = 0; // 無敵計時器
let flashTimer = 0;    // 閃爍計時器
let flashColor;        // 閃爍顏色

function preload() {
  spriteSheet = loadImage('2/all-2.png');
  newSpriteSheet = loadImage('4/8-all.png'); // 載入新角色的圖檔
  quizTable = loadTable('TKU_ET_Quiz.csv', 'csv', 'header'); // 載入 CSV 題庫
  backgroundImage = loadImage('5/0.png'); // 載入背景圖片
  monsterImage = loadImage('下載.png'); // 載入怪物圖片 (原本的小熊)
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  noSmooth();

  // --- 初始化迷宮 ---
  cols = floor(width / cellSize);
  rows = floor(height / cellSize);
  // 確保行列數為奇數，以利迷宮生成演算法運作
  if (cols % 2 === 0) cols--;
  if (rows % 2 === 0) rows--;
  generateMaze();
  setupShortcuts();

  // 初始化角色，並傳入精靈圖
  character = new Character(spriteSheet);
  // 將角色放置在隨機的空地上
  let startPos = findOpenCell();
  character.x = startPos.x * cellSize + cellSize / 2;
  character.y = startPos.y * cellSize + cellSize / 2;

  // 建立新角色
  newCharacter = new SideCharacter(newSpriteSheet);
  // 將新角色放置在另一個隨機空地
  let npcPos = findOpenCell();
  newCharacter.x = npcPos.x * cellSize + cellSize / 2;
  newCharacter.y = npcPos.y * cellSize + cellSize / 2;

  // 初始化聖誕腳怪
  removeImageBackground(monsterImage, color(255, 255, 255)); // 去背
  for (let i = 0; i < 5; i++) { // 隨機產生 5 隻
    let mPos = findOpenCell();
    monsters.push(new Monster(mPos.x * cellSize + cellSize / 2, mPos.y * cellSize + cellSize / 2, monsterImage));
  }

  // 初始化血包
  for (let i = 0; i < 3; i++) { // 隨機產生 3 個血包
    let hpPos = findOpenCell();
    healthPacks.push(new HealthPack(hpPos.x * cellSize + cellSize / 2, hpPos.y * cellSize + cellSize / 2));
  }

  // 初始化背景粒子
  for (let i = 0; i < 50; i++) {
    particles.push(new Particle());
  }

  // 建立「開始冒險」按鈕
  btnStart = createButton('🚀 開始冒險');
  btnStart.position(width / 2 - 80, height / 2 + 30);
  btnStart.style('font-size', '24px');
  btnStart.style('padding', '15px 40px');
  btnStart.style('background-color', '#3498db');
  btnStart.style('color', 'white');
  btnStart.style('border', 'none');
  btnStart.style('border-radius', '10px');
  btnStart.style('cursor', 'pointer');
  btnStart.mousePressed(startGame);

  // 建立「重新挑戰」按鈕 (結算畫面用)
  btnRestart = createButton('🔄 重新挑戰');
  btnRestart.position(width / 2 - 80, height / 2 + 80);
  btnRestart.style('font-size', '24px');
  btnRestart.style('padding', '15px 40px');
  btnRestart.style('background-color', '#e67e22');
  btnRestart.style('color', 'white');
  btnRestart.style('border', 'none');
  btnRestart.style('border-radius', '10px');
  btnRestart.style('cursor', 'pointer');
  btnRestart.mousePressed(startGame);
  btnRestart.hide();

  // 建立「是」按鈕
  btnTrue = createButton('⭕ 是');
  btnTrue.position(0, 0);
  btnTrue.style('font-size', '20px');
  btnTrue.style('padding', '10px 30px');
  btnTrue.style('background-color', '#2ecc71'); // 綠色
  btnTrue.style('color', 'white');
  btnTrue.style('border', 'none');
  btnTrue.style('border-radius', '50px');
  btnTrue.style('cursor', 'pointer');
  btnTrue.mousePressed(() => checkAnswer('正確'));
  btnTrue.hide();

  // 建立「非」按鈕
  btnFalse = createButton('❌ 非');
  btnFalse.position(0, 0);
  btnFalse.style('font-size', '20px');
  btnFalse.style('padding', '10px 30px');
  btnFalse.style('background-color', '#e74c3c'); // 紅色
  btnFalse.style('color', 'white');
  btnFalse.style('border', 'none');
  btnFalse.style('border-radius', '50px');
  btnFalse.style('cursor', 'pointer');
  btnFalse.mousePressed(() => checkAnswer('錯誤'));
  btnFalse.hide();
}

function draw() {
  // 1. 繪製背景 (共用)
  image(backgroundImage, 0, 0, width, height);

  // 繪製迷宮牆壁
  drawMaze();

  // 2. 繪製動態粒子 (增加氛圍)
  for (let p of particles) {
    p.update();
    p.display();
  }

  // 3. 根據遊戲狀態決定顯示內容
  if (gameState === 'START') {
    drawMenu();
  } else if (gameState === 'SUMMARY') {
    drawSummary();
  } else {
    runGameLogic();
  }
}

/**
 * 繪製開始選單
 */
function drawMenu() {
  // 半透明黑色遮罩，讓文字更清楚
  fill(0, 150);
  rect(0, 0, width, height);

  // 標題文字
  fill(255);
  textAlign(CENTER, CENTER);
  textSize(60);
  textStyle(BOLD);
  text("淡江迷宮大冒險", width / 2, height / 2 - 80);
  
  // 確保遊戲按鈕隱藏
  btnTrue.hide();
  btnFalse.hide();
  btnStart.show();
}

/**
 * 繪製結算畫面
 */
function drawSummary() {
  // 簡單的純色背景
  background(30); // 深灰色背景，蓋過遊戲畫面

  // 結算文字
  fill(255);
  textAlign(CENTER, CENTER);
  
  textSize(50);
  textStyle(BOLD);
  text("遊戲結束", width / 2, height / 2 - 50);
  
  textSize(30);
  textStyle(NORMAL);
  text("最終得分: " + score, width / 2, height / 2 + 20);
}

/**
 * 執行主要的遊戲邏輯 (原本 draw 的內容)
 */
function runGameLogic() {
  // --- 特效：震動 ---
  push();
  if (shakeTimer > 0) {
    translate(random(-10, 10), random(-10, 10));
    shakeTimer--;
  }

  // 我們已經移除攝影機跟隨功能，所以角色會在畫面上自由移動

  // 更新並繪製角色
  character.update();
  character.display();

  // 更新並繪製新角色
  // 新角色現在是靜止的，只更新動畫
  newCharacter.update();
  newCharacter.display();

  // 更新並繪製聖誕腳怪
  for (let m of monsters) {
    m.update();
    m.display();
  }

  // 繪製血包
  for (let hp of healthPacks) {
    hp.display();
  }

  // 更新並繪製可解鎖捷徑的NPC
  for (let npc of shortcutNPCs) {
    npc.display();
  }

  // 繪製角色名牌
  drawCharacterLabel(newCharacter.x, newCharacter.y - 120, "角色一", color(52, 152, 219));

  // 更新並繪製浮動文字特效
  for (let i = floatingTexts.length - 1; i >= 0; i--) {
    floatingTexts[i].update();
    floatingTexts[i].display();
    if (floatingTexts[i].isDead()) {
      floatingTexts.splice(i, 1);
    }
  }

  pop(); // 結束震動影響範圍

  // 顯示分數
  drawScore();
  // 顯示血條
  drawHealthBar();

  // --- 碰撞偵測 ---
  if (invincibilityTimer > 0) {
    invincibilityTimer--;
  }

  // 怪物碰撞
  if (invincibilityTimer === 0) { // 只有在非無敵狀態下才會受傷
    for (let m of monsters) {
      let d = dist(character.x, character.y, m.x, m.y);
      if (d < 40) { // 碰到怪物
        health--;
        invincibilityTimer = 120; // 2 秒無敵
        shakeTimer = 20;
        playTone(150, 0.4); // 受傷音效
        if (health <= 0) {
          endGame(); // 生命歸零，遊戲結束
        }
        break; // 一次只受傷一次
      }
    }
  }

  // 捷徑NPC互動
  for (let i = shortcutNPCs.length - 1; i >= 0; i--) {
    let npc = shortcutNPCs[i];
    if (!npc.unlocked) {
      let d = dist(character.x, character.y, npc.x, npc.y);
      if (d < 50) {
        npc.unlock();
        playTone(1000, 0.3); // 解鎖音效
        floatingTexts.push(new FloatingText(npc.x, npc.y - 50, "捷徑已開啟!", color(255, 255, 0)));
        // NPC完成任務後消失
        shortcutNPCs.splice(i, 1);
      }
    }
  }

  // 血包碰撞
  for (let i = healthPacks.length - 1; i >= 0; i--) {
    let hp = healthPacks[i];
    let d = dist(character.x, character.y, hp.x, hp.y);
    if (d < 30 && health < MAX_HEALTH) { // 碰到血包且未滿血
      health++;
      healthPacks.splice(i, 1); // 移除血包
      playTone(1200, 0.2); // 補血音效
    }
  }

  // --- 互動偵測 ---
  // 計算玩家與各個角色之間的距離
  const distToNewCharacter = dist(character.x, character.y, newCharacter.x, newCharacter.y);

  if (distToNewCharacter < 80) {
    interactionActive = true;
    currentQuizTable = quizTable; // 左邊角色使用主要題庫
    if (dialogState === 'IDLE') startQuiz();
  } else {
    interactionActive = false;
  }

  // 繪製互動提示 (當靠近 NPC 且未對話時顯示跳動箭頭)
  if (interactionActive && dialogState === 'IDLE') {
    if (distToNewCharacter < 80) {
      drawInteractionCue(newCharacter.x, newCharacter.y - 150);
    }
  }

  if (!interactionActive && (dialogState === 'ASKING' || dialogState === 'FEEDBACK')) {
    // 離開互動範圍，重設一切
    resetDialog();
  }

  // --- 對話框淡入淡出邏輯 ---
  if (dialogState !== 'IDLE') {
    // 如果在對話中，顯示對話框
    if (currentDialog.alpha < 220) currentDialog.alpha += 15;
  } else {
    // 如果不在對話中，淡出對話框
    if (currentDialog.alpha > 0) currentDialog.alpha -= 15;
  }

  // 只有在透明度大於 0 時才繪製
  if (currentDialog.alpha > 0) {
    drawDialogBox(currentDialog.message, currentDialog.alpha);
  }

  // --- 按鈕位置與可見度 ---
  if (dialogState === 'ASKING') {
    btnTrue.show();
    btnFalse.show();
    // 將按鈕定位在畫面中央下方
    btnTrue.position(width / 2 - 120, height / 2 + 80);
    btnFalse.position(width / 2 + 20, height / 2 + 80);
  } else {
    btnTrue.hide();
    btnFalse.hide();
  }

  // --- 特效：閃爍 ---
  if (flashTimer > 0) {
    noStroke();
    fill(flashColor);
    rect(0, 0, width, height);
    flashTimer--;
  }
}

function startGame() {
  gameState = 'PLAYING';
  btnStart.hide();
  btnRestart.hide();
  score = 0; // 重置分數
  questionsAnswered = 0; // 重置答題數
  health = MAX_HEALTH; // 重置生命
  // 嘗試啟動音效環境 (瀏覽器通常需要使用者互動後才能播放聲音)
  if (getAudioContext().state !== 'running') {
    getAudioContext().resume();
  }
}

function keyPressed() {
  character.handleKeyPressed(keyCode);
  return false;
}

function keyReleased() {
  character.handleKeyReleased(keyCode);
  return false;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
}

/**
 * 開始一個新的問答
 */
function startQuiz() {
  dialogState = 'ASKING';
  // 從題庫中隨機抽取一題
  const table = currentQuizTable; // 使用當前互動角色的題庫

  // 安全性修正：如果沒有題庫 (例如正在與 AI 聊天)，則不執行問答邏輯，防止當機
  if (!table) {
    return;
  }
  
  // 安全性修正：過濾掉空行或格式錯誤的資料列，避免抽到 undefined 導致當機
  const validRows = table.getArray().filter(row => row && row.length > 1);
  if (validRows.length === 0) {
    console.error("錯誤：題庫中沒有有效的題目！");
    return;
  }
  const questionRow = validRows[floor(random(validRows.length))];
  
  let qText, aText, expText;

  // 根據不同的題庫來源讀取對應欄位
  if (table === quizTable) {
    // TKU_ET_Quiz.csv: 0=題號, 1=題目, 2=答案, 3=解析
    qText = questionRow[1];
    aText = questionRow[2];
    expText = questionRow[3];
  } else {
    // 提示.csv: 0=題目, 1=答案 (假設沒有解析欄位)
    qText = questionRow[0];
    aText = questionRow[1];
    expText = "（此題來自小夥伴，沒有額外解析）";
  }
  
  currentQuestion = {
    question: qText,
    answer: aText,
    explanation: expText
  };
  currentDialog.message = currentQuestion.question; // 設定對話內容為題目
}

/**
 * 檢查答案並觸發特效
 * @param {string} userAns 玩家選擇的答案 ('正確' 或 '錯誤')
 */
function checkAnswer(userAns) {
  if (userAns === currentQuestion.answer) {
    // 答對了
    score += 10; // 加分
    floatingTexts.push(new FloatingText(character.x, character.y - 80, "+10", color(255, 215, 0))); // 加入浮動得分特效
    currentDialog.message = "✨ 答對了！\n" + currentQuestion.explanation;
    flashColor = color(46, 204, 113, 100); // 綠色半透明
    flashTimer = 15; // 閃爍約 0.25 秒
    playTone(880, 0.1); // 播放高音 (答對)
  } else {
    // 答錯了
    currentDialog.message = "💥 答錯囉！\n" + currentQuestion.explanation;
    
    flashColor = color(231, 76, 60, 100); // 紅色半透明
    flashTimer = 15;
    shakeTimer = 20; // 震動約 0.3 秒
    playTone(200, 0.3); // 播放低音 (答錯)
  }
  
  questionsAnswered++; // 增加已答題數
  dialogState = 'FEEDBACK';
  
  // 顯示回饋 4 秒後，重新提問或結束
  setTimeout(() => {
    if (questionsAnswered >= TOTAL_QUESTIONS) {
      endGame(); // 題目做完，進入結算
    } else {
      if (interactionActive) startQuiz(); // 如果還在範圍內，問下一題
      else resetDialog(); // 如果已離開，結束對話
    }
  }, 4000);
}

/**
 * 遊戲結束處理
 */
function endGame() {
  gameState = 'SUMMARY';
  resetDialog(); // 隱藏對話框與按鈕
  btnRestart.show(); // 顯示重新開始按鈕
}

function resetDialog() {
  dialogState = 'IDLE';
  currentQuestion = null;
  btnTrue.hide();
  btnFalse.hide();
}

/**
 * 播放簡單的合成音效
 * @param {number} freq 頻率 (Hz)
 * @param {number} duration 持續時間 (秒)
 */
function playTone(freq, duration) {
  // 檢查 p5.Oscillator 是否可用 (依賴 p5.sound 函式庫)
  if (typeof p5.Oscillator !== 'undefined') {
    let osc = new p5.Oscillator('sine');
    osc.freq(freq);
    osc.amp(0.5);
    osc.start();
    osc.amp(0, duration);
    setTimeout(() => osc.stop(), duration * 1000 + 100);
  }
}

/**
 * 繪製分數顯示
 */
function drawScore() {
  push();
  fill(255, 255, 0); // 金黃色文字
  stroke(0);
  strokeWeight(3);
  textSize(28);
  textAlign(LEFT, TOP);
  text("🏆 得分: " + score + "  (第 " + (questionsAnswered + 1) + "/" + TOTAL_QUESTIONS + " 題)", 20, 20);
  pop();
}

/**
 * 繪製右上角的血條
 */
function drawHealthBar() {
  push();
  let heartSize = 30;
  let padding = 10;
  for (let i = 0; i < MAX_HEALTH; i++) {
    let x = width - (i + 1) * (heartSize + padding);
    let y = 30;
    if (i < health) {
      fill(255, 0, 0); // 紅色實心
    } else {
      fill(100); // 灰色空心
    }
    noStroke();
    // 畫愛心
    rect(x, y, heartSize, heartSize);
  }
}

/**
 * 生成迷宮 (使用遞迴回溯演算法)
 */
function generateMaze() {
  // 初始化迷宮，全部設為牆壁 (1)
  maze = [];
  for (let i = 0; i < cols; i++) {
    maze[i] = [];
    for (let j = 0; j < rows; j++) {
      maze[i][j] = 1;
    }
  }

  // 從 (1, 1) 開始挖掘
  let stack = [];
  let current = { x: 1, y: 1 };
  maze[1][1] = 0; // 0 代表路
  stack.push(current);

  while (stack.length > 0) {
    let neighbors = [];
    // 上下左右四個方向 (跨兩格)
    let dirs = [
      { x: 0, y: -2 }, { x: 0, y: 2 },
      { x: -2, y: 0 }, { x: 2, y: 0 }
    ];

    for (let d of dirs) {
      let nx = current.x + d.x;
      let ny = current.y + d.y;
      // 檢查是否在範圍內且為牆壁
      if (nx > 0 && nx < cols - 1 && ny > 0 && ny < rows - 1 && maze[nx][ny] === 1) {
        neighbors.push({ x: nx, y: ny, dx: d.x, dy: d.y });
      }
    }

    if (neighbors.length > 0) {
      let next = random(neighbors);
      // 打通中間的牆
      maze[current.x + next.dx / 2][current.y + next.dy / 2] = 0;
      maze[next.x][next.y] = 0;
      current = { x: next.x, y: next.y };
      stack.push(current);
    } else {
      current = stack.pop();
    }
  }
}

/**
 * 繪製迷宮
 */
function drawMaze() {
  noStroke();
  fill(44, 62, 80); // 深藍灰色牆壁
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows; j++) {
      if (maze[i][j] === 1) { // 一般牆壁
        rect(i * cellSize, j * cellSize, cellSize, cellSize);
        // 增加一點立體感
        fill(52, 73, 94);
        rect(i * cellSize, j * cellSize, cellSize, 10);
        fill(44, 62, 80);
      } else if (maze[i][j] === 2) { // 可解鎖的門
        // 畫一個看起來不一樣的牆
        fill(127, 140, 141); // 灰色
        rect(i * cellSize, j * cellSize, cellSize, cellSize);
        // 畫上鎖的符號
        fill(44, 62, 80);
        ellipse(i * cellSize + cellSize / 2, j * cellSize + cellSize / 2, 15);
        fill(44, 62, 80);
      }
    }
  }
}

/**
 * 尋找隨機的空地 (非牆壁)
 */
function findOpenCell() {
  let attempts = 0;
  while (attempts < 1000) {
    let c = floor(random(1, cols - 1));
    let r = floor(random(1, rows - 1));
    if (maze[c][r] === 0) return { x: c, y: r };
    attempts++;
  }
  return { x: 1, y: 1 }; // 備案
}

/**
 * 設置捷徑門和對應的NPC
 */
function setupShortcuts() {
  let potentialDoors = [];
  // 尋找潛在的門位置 (牆的兩邊是路)
  for (let j = 1; j < rows - 1; j++) {
    for (let i = 1; i < cols - 1; i++) {
      // 水平方向: 路-牆-路
      if (maze[i - 1][j] === 0 && maze[i][j] === 1 && maze[i + 1][j] === 0) {
        potentialDoors.push({ x: i, y: j });
      }
      // 垂直方向: 路-牆-路
      if (maze[i][j - 1] === 0 && maze[i][j] === 1 && maze[i][j + 1] === 0) {
        potentialDoors.push({ x: i, y: j });
      }
    }
  }

  shuffle(potentialDoors, true); // 將潛在門的位置隨機排序

  // 創建3個捷徑和對應的NPC
  const numShortcuts = 3;
  for (let i = 0; i < min(numShortcuts, potentialDoors.length); i++) {
    let doorCoord = potentialDoors[i];
    maze[doorCoord.x][doorCoord.y] = 2; // 在迷宮中標記為門(2)

    // 在門附近找一個空地放NPC
    let npcPos = findOpenCellNear(doorCoord.x, doorCoord.y);
    let npc = new ShortcutNPC(npcPos.x * cellSize + cellSize / 2, npcPos.y * cellSize + cellSize / 2, monsterImage, doorCoord);
    shortcutNPCs.push(npc);
  }
}

/**
 * 在指定座標附近尋找一個隨機空地
 */
function findOpenCellNear(x, y) {
    // 從近到遠搜索
    for (let r = 1; r < 10; r++) {
        for (let i = -r; i <= r; i++) {
            for (let j = -r; j <= r; j++) {
                let nx = x + i;
                let ny = y + j;
                if (nx > 0 && nx < cols -1 && ny > 0 && ny < rows - 1 && maze[nx][ny] === 0) {
                    return {x: nx, y: ny};
                }
            }
        }
    }
    return findOpenCell(); // 如果附近找不到，就隨機找一個
}

/**
 * 檢查指定座標是否碰到牆壁
 */
function checkWallCollision(x, y) {
  // 定義一個小的碰撞箱 (腳部位置)
  let halfW = 10;
  let h = 10;
  
  // 檢查四個角是否碰到牆壁
  if (isWall(x - halfW, y)) return true;
  if (isWall(x + halfW, y)) return true;
  if (isWall(x - halfW, y - h)) return true;
  if (isWall(x + halfW, y - h)) return true;
  
  return false;
}

function isWall(x, y) {
  let c = floor(x / cellSize);
  let r = floor(y / cellSize);
  // 超出邊界視為牆壁
  if (c < 0 || c >= cols || r < 0 || r >= rows) return true;
  return maze[c][r] === 1;
}

/**
 * 繪製復古風格的網格背景
 */
function drawRetroBackground() {
  const color1 = '#D2B48C'; // 復古的淺棕褐色 (Tan)
  const color2 = '#A08C6E'; // 較深的棕色
  const gridSize = 40;      // 棋盤格大小

  noStroke(); // 我們將直接繪製方塊，所以不需要邊線

  for (let y = 0; y < height; y += gridSize) {
    for (let x = 0; x < width; x += gridSize) {
      const i = x / gridSize;
      const j = y / gridSize;

      // 根據格子位置的奇偶性來決定顏色
      if ((i + j) % 2 === 0) {
        fill(color1);
      } else {
        fill(color2);
      }
      // 繪製一個格子
      rect(x, y, gridSize, gridSize);
    }
  }
}
/**
 * 在畫面上方繪製一個對話框
 * @param {string} message   要顯示的文字訊息
 * @param {number} alpha     對話框的透明度
 */
function drawDialogBox(message, alpha) {
  if (!message) return; // 安全性修正：防止訊息為空時導致 split 錯誤而當機

  push();
  textSize(18);
  textLeading(26); // 設定行高

  const maxBoxWidth = min(width * 0.8, 600);
  const padding = 20;
  const textMaxWidth = maxBoxWidth - (padding * 2);

  // 計算需要的行數以動態調整高度
  let lineCount = 0;
  const paragraphs = message.split('\n');

  for (let p of paragraphs) {
    if (p === "") {
      lineCount++;
      continue;
    }
    let currentLineW = 0;
    lineCount++;
    for (let i = 0; i < p.length; i++) {
      let charW = textWidth(p[i]);
      if (currentLineW + charW > textMaxWidth) {
        lineCount++;
        currentLineW = charW;
      } else {
        currentLineW += charW;
      }
    }
  }

  const lineHeight = 26;
  const boxHeight = (lineCount * lineHeight) + (padding * 2);
  const boxX = (width - maxBoxWidth) / 2;
  const boxY = 30;

  fill(255, 255, 255, alpha);
  stroke(100, alpha);
  strokeWeight(2);
  rect(boxX, boxY, maxBoxWidth, boxHeight, 15);

  noStroke();
  fill(0, alpha);
  textAlign(CENTER, TOP);
  text(message, boxX + padding, boxY + padding, textMaxWidth, boxHeight);
  pop();
}

/**
 * 繪製角色頭上的對話氣泡
 */
function drawSpeechBubble(x, y, message) {
  if (!message) return; // 安全性修正：防止訊息為空時導致 text 錯誤

  push();
  translate(x, y);
  
  const bubbleW = 220;
  const bubbleH = 100;
  
  // 氣泡本體
  fill(255);
  stroke(0);
  strokeWeight(2);
  rect(0 - bubbleW/2, 0 - bubbleH/2, bubbleW, bubbleH, 10);
  
  // 氣泡尖角
  fill(255);
  noStroke(); // 蓋掉線條
  triangle(-10, bubbleH/2 - 2, 10, bubbleH/2 - 2, 0, bubbleH/2 + 15);
  // 補畫尖角邊框
  stroke(0);
  strokeWeight(2);
  line(-10, bubbleH/2, 0, bubbleH/2 + 15);
  line(10, bubbleH/2, 0, bubbleH/2 + 15);

  // 文字
  noStroke();
  fill(0);
  textAlign(CENTER, CENTER);
  textSize(16);
  text(message, 0, 0, bubbleW - 20, bubbleH - 20);
  
  pop();
}

/**
 * 繪製角色名牌
 */
function drawCharacterLabel(x, y, name, bgColor) {
  push();
  translate(x, y);
  rectMode(CENTER);
  
  // 名牌背景
  fill(bgColor);
  stroke(255);
  strokeWeight(2);
  rect(0, 0, textWidth(name) + 20, 28, 8);
  
  // 名牌文字
  fill(255);
  noStroke();
  textAlign(CENTER, CENTER);
  textSize(14);
  textStyle(BOLD);
  text(name, 0, 0);
  pop();
}

/**
 * 繪製互動提示 (跳動箭頭)
 */
function drawInteractionCue(x, y) {
  push();
  // 上下跳動效果
  translate(x, y + sin(frameCount * 0.15) * 5); 
  
  fill(255, 255, 0); // 黃色
  stroke(0);
  strokeWeight(2);
  // 繪製倒三角形
  triangle(-8, -8, 8, -8, 0, 4);
  pop();
}

// ==================================================
// FloatingText Class (浮動文字特效)
// ==================================================
class FloatingText {
  constructor(x, y, txt, col) {
    this.x = x;
    this.y = y;
    this.txt = txt;
    this.col = col;
    this.alpha = 255;
    this.life = 60; // 存活時間 (frames)
  }

  update() {
    this.y -= 1.5; // 向上飄
    this.alpha -= 4; // 漸漸消失
    this.life--;
  }

  isDead() {
    return this.life <= 0;
  }

  display() {
    push();
    textAlign(CENTER, CENTER);
    textSize(24);
    textStyle(BOLD);
    fill(red(this.col), green(this.col), blue(this.col), this.alpha);
    stroke(255, this.alpha); // 白色邊框
    strokeWeight(3);
    text(this.txt, this.x, this.y);
    pop();
  }
}

// ==================================================
// Monster Class (聖誕腳怪)
// ==================================================
class Monster {
  constructor(x, y, img) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.speedX = random(-2, 2);
    this.speedY = random(-2, 2);
  }

  update() {
    let nextX = this.x + this.speedX;
    let nextY = this.y + this.speedY;

    // 碰到邊界或牆壁時反彈
    if (nextX < 0 || nextX > width || checkWallCollision(nextX, this.y)) {
      this.speedX *= -1;
    } else {
      this.x = nextX;
    }

    if (nextY < 0 || nextY > height || checkWallCollision(this.x, nextY)) {
      this.speedY *= -1;
    } else {
      this.y = nextY;
    }

    // 偶爾隨機改變方向
    if (random(1) < 0.02) {
      this.speedX = random(-2, 2);
      this.speedY = random(-2, 2);
    }
  }

  display() {
    push();
    translate(this.x, this.y);
    // 繪製怪物本體
    image(this.img, -40, -40, 80, 80);
    
    // 繪製聖誕帽 (讓它看起來像聖誕腳怪)
    fill(255, 0, 0); // 紅色帽子
    triangle(-20, -35, 20, -35, 0, -75);
    fill(255); // 白色絨球與帽沿
    ellipse(0, -75, 15, 15);
    rect(-22, -35, 44, 10, 5);
    pop();
  }
}

// ==================================================
// ShortcutNPC Class (解鎖捷徑的正面角色)
// ==================================================
class ShortcutNPC {
  constructor(x, y, img, doorCoord) {
    this.x = x;
    this.y = y;
    this.img = img;
    this.doorCoord = doorCoord;
    this.unlocked = false;
  }

  unlock() {
    if (!this.unlocked) {
      maze[this.doorCoord.x][this.doorCoord.y] = 0; // 打開門
      this.unlocked = true;
    }
  }

  display() {
    push();
    translate(this.x, this.y);
    // 上下浮動效果
    translate(0, sin(frameCount * 0.08) * 5);

    // 繪製友善的角色 (小熊)
    image(this.img, -40, -40, 80, 80);

    // 在頭上畫一朵花以示區別
    fill(255, 105, 180); // 粉紅色
    stroke(255, 255, 0);
    strokeWeight(2);
    for (let i = 0; i < 5; i++) {
      ellipse(cos(radians(i * 72)) * 10, -50 + sin(radians(i * 72)) * 10, 12);
    }
    fill(255, 255, 0); // 黃色花蕊
    noStroke();
    ellipse(0, -50, 10);
    pop();
  }
}

// ==================================================
// HealthPack Class (血包)
// ==================================================
class HealthPack {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = 25;
  }

  display() {
    push();
    translate(this.x, this.y);
    // 上下浮動效果
    translate(0, sin(frameCount * 0.05) * 4);

    fill(255, 0, 0); // 紅色
    stroke(255);
    strokeWeight(3);
    // 畫十字
    rect(-this.size / 2, -this.size / 6, this.size, this.size / 3, 3);
    rect(-this.size / 6, -this.size / 2, this.size / 3, this.size, 3);
    pop();
  }
}

/**
 * 移除圖片中的指定顏色背景，將其變為透明。
 * @param {p5.Image} img 要處理的圖片物件
 * @param {p5.Color} colorToRemove 要移除的顏色
 */
function removeImageBackground(img, colorToRemove) {
  const r_target = red(colorToRemove);
  const g_target = green(colorToRemove);
  const b_target = blue(colorToRemove);

  img.loadPixels(); // 載入像素資料
  // 遍歷所有像素 (每 4 個值代表一個像素的 R, G, B, A)
  for (let i = 0; i < img.pixels.length; i += 4) {
    const r = img.pixels[i];
    const g = img.pixels[i + 1];
    const b = img.pixels[i + 2];

    // 如果像素顏色與目標顏色相符，就將其 Alpha 值設為 0 (完全透明)
    if (r === r_target && g === g_target && b === b_target) {
      img.pixels[i + 3] = 0;
    }
  }
  img.updatePixels(); // 更新像素資料
}

// ==================================================
// Particle Class (背景粒子)
// ==================================================
class Particle {
  constructor() {
    this.x = random(width);
    this.y = random(height);
    this.size = random(3, 8);
    this.speedX = random(-0.5, 0.5);
    this.speedY = random(-0.5, 0.5);
    this.alpha = random(100, 200);
  }

  update() {
    this.x += this.speedX;
    this.y += this.speedY;
    // 超出邊界時繞回
    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;
  }

  display() {
    noStroke();
    fill(255, 255, 200, this.alpha); // 淡黃色光點
    ellipse(this.x, this.y, this.size);
  }
}

// ==================================================
// Character Class
// ==================================================
class Character {
  constructor(spriteSheet) {
    this.spriteSheet = spriteSheet;
    this.x = 0; // 角色在「世界」中的 X 座標
    this.y = 0; // 角色在「世界」中的 Y 座標
    this.direction = 1; // 1 = right, -1 = left
    this.moveSpeed = 4;

    this.currentFrame = 0;
    this.totalFrames = 8;
    this.frameWidth = 419 / 8;
    this.frameHeight = 67;
    this.animationSpeed = 6; // 加快動畫速度以匹配移動
    this.scaleFactor = 2.0; // 角色縮放比例 (1 = 100%, 1.2 = 120%)
    this.frameCounter = 0;

    this.keysPressed = {};
  }

  handleKeyPressed(keyCode) {
    this.keysPressed[keyCode] = true;
  }

  handleKeyReleased(keyCode) {
    this.keysPressed[keyCode] = false;
  }

  update() {
    let nextX = this.x;
    let nextY = this.y;
    let isMoving = false;

    // 處理移動
    if (this.keysPressed[RIGHT_ARROW]) {
      nextX += this.moveSpeed;
      this.direction = 1;
      isMoving = true;
    }
    if (this.keysPressed[LEFT_ARROW]) {
      nextX -= this.moveSpeed;
      this.direction = -1;
      isMoving = true;
    }
    if (this.keysPressed[UP_ARROW]) {
      nextY -= this.moveSpeed;
      isMoving = true;
    }
    if (this.keysPressed[DOWN_ARROW]) {
      nextY += this.moveSpeed;
      isMoving = true;
    }

    // 碰撞偵測：只有當不撞牆時才更新位置
    if (!checkWallCollision(nextX, this.y)) {
      this.x = nextX;
    }
    if (!checkWallCollision(this.x, nextY)) {
      this.y = nextY;
    }

    // 更新動畫幀
    this.frameCounter++;
    if (this.frameCounter >= this.animationSpeed) {
      this.frameCounter = 0;
      // 無論是否移動，都持續播放動畫
      this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
    }
  }

  getDisplayHeight() {
    return this.frameHeight * this.scaleFactor;
  }

  display() {
    // 無敵時閃爍
    if (invincibilityTimer > 0 && frameCount % 10 < 5) {
      return; // 不繪製角色以達到閃爍效果
    }

    push();
    // 將原點移動到角色的 (x, y) 位置
    translate(this.x, this.y);
    
    // 根據方向翻轉畫布
    if (this.direction === -1) {
      scale(-1, 1); // 水平翻轉
    }

    const srcX = this.currentFrame * this.frameWidth;
    const srcY = 0;

    const displayWidth = this.frameWidth * this.scaleFactor;
    const displayHeight = this.frameHeight * this.scaleFactor;

    // 繪製角色，使其腳底對齊 (0,0)
    image(this.spriteSheet, -displayWidth / 2, -displayHeight, displayWidth, displayHeight, srcX, srcY, this.frameWidth, this.frameHeight);
    pop();
  }
}

// ==================================================
// SideCharacter Class (新增的角色)
// ==================================================
class SideCharacter {
  constructor(spriteSheet) {
    this.spriteSheet = spriteSheet;
    this.x = 0;
    this.y = 0;
    this.scaleFactor = 2.0; // 縮放比例

    this.totalFrames = 8;       // 根據要求，重複播放 8 幀
    this.frameWidth = 225 / 8;  // 總寬度 / 幀數
    this.frameHeight = 48;      // 圖片高度
    this.currentFrame = 0;

    this.animationSpeed = 6; // 動畫播放速度
    this.frameCounter = 0;
  }

  update() {
    // 更新動畫幀
    this.frameCounter++;
    if (this.frameCounter >= this.animationSpeed) {
      this.frameCounter = 0;
      this.currentFrame = (this.currentFrame + 1) % this.totalFrames;
    }
  }

  display() {
    push();
    translate(this.x, this.y);

    const srcX = this.currentFrame * this.frameWidth;
    const srcY = 0;

    const displayWidth = this.frameWidth * this.scaleFactor;
    const displayHeight = this.frameHeight * this.scaleFactor;

    image(this.spriteSheet, -displayWidth / 2, -displayHeight, displayWidth, displayHeight, srcX, srcY, this.frameWidth, this.frameHeight);
    pop();
  }
}
