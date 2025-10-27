const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Set canvas size
canvas.width = 400;
canvas.height = 600;

// Load images
const birdImg = new Image();
const pipeImg = new Image();
const bgImg = new Image();
birdImg.src = '../flappy_images/bird.png';
pipeImg.src = '../flappy_images/pipe.png';
bgImg.src = '../flappy_images/background.png';

// Load sounds
const flapSound = new Audio('../flappy_sounds/flap.wav');
const hitSound = new Audio('../flappy_sounds/hit.wav');
const pointSound = new Audio('../flappy_sounds/point.wav');

// Preload sounds
function preloadSounds() {
    flapSound.load();
    hitSound.load();
    pointSound.load();
}

// Initialize sounds with user interaction
document.addEventListener('click', function initSounds() {
    preloadSounds();
    document.removeEventListener('click', initSounds);
}, { once: true });

// Game variables
let bird = {
    x: 50,
    y: canvas.height / 2,
    width: 34,
    height: 24,
    velocity: 0,
    gravity: 0.5,
    jump: -8
};

let pipes = [];
let score = 0;
let gameOver = false;
let gameStarted = false;

// Pipe configuration
const pipeWidth = 52;
const pipeGap = 140;
const pipeSpeed = 2;

function createPipe() {
    const minHeight = 50;
    const maxHeight = canvas.height - pipeGap - minHeight;
    const height = Math.floor(Math.random() * (maxHeight - minHeight)) + minHeight;
    
    return {
        x: canvas.width,
        topHeight: height,
        bottomHeight: height + pipeGap,
        width: pipeWidth,
        scored: false
    };
}

function drawBird() {
    ctx.save();
    ctx.translate(bird.x + bird.width / 2, bird.y + bird.height / 2);
    const rotation = Math.min(Math.PI / 4, Math.max(-Math.PI / 4, bird.velocity * 0.1));
    ctx.rotate(rotation);
    ctx.drawImage(birdImg, -bird.width / 2, -bird.height / 2, bird.width, bird.height);
    ctx.restore();
}

function drawPipes() {
    pipes.forEach(pipe => {
        // Draw top pipe
        ctx.drawImage(pipeImg, pipe.x, 0, pipe.width, pipe.topHeight);
        // Draw bottom pipe
        ctx.drawImage(pipeImg, pipe.x, pipe.bottomHeight, pipe.width, canvas.height - pipe.bottomHeight);
    });
}

function checkCollision() {
    return pipes.some(pipe => {
        // Check collision with pipes
        const birdRight = bird.x + bird.width;
        const birdLeft = bird.x;
        const pipeLeft = pipe.x;
        const pipeRight = pipe.x + pipe.width;
        
        if (birdRight > pipeLeft && birdLeft < pipeRight) {
            if (bird.y < pipe.topHeight || bird.y + bird.height > pipe.bottomHeight) {
                return true;
            }
        }
        return false;
    }) || bird.y + bird.height > canvas.height || bird.y < 0;
}

function updateScore() {
    pipes.forEach(pipe => {
        if (!pipe.scored && pipe.x + pipe.width < bird.x) {
            score++;
            pipe.scored = true;
            pointSound.play();
            document.getElementById('score').textContent = score;
        }
    });
}

function update() {
    if (!gameStarted || gameOver) return;

    // Update bird
    bird.velocity += bird.gravity;
    bird.y += bird.velocity;

    // Update pipes
    if (pipes.length === 0 || pipes[pipes.length - 1].x < canvas.width - 200) {
        pipes.push(createPipe());
    }

    pipes.forEach(pipe => {
        pipe.x -= pipeSpeed;
    });

    // Remove off-screen pipes
    pipes = pipes.filter(pipe => pipe.x + pipe.width > 0);

    // Check collision
    if (checkCollision()) {
        hitSound.play();
        gameOver = true;
        document.getElementById('gameOver').style.display = 'block';
        document.getElementById('finalScore').textContent = score;
        return;
    }

    updateScore();
}

function draw() {
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw background
    ctx.drawImage(bgImg, 0, 0, canvas.width, canvas.height);

    // Draw game elements
    drawPipes();
    drawBird();

    // Draw start message
    if (!gameStarted) {
        ctx.fillStyle = 'black';
        ctx.font = '20px Arial';
        ctx.textAlign = 'center';
        ctx.fillText('Click to Start', canvas.width / 2, canvas.height / 2);
    }
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

// Event listeners
document.addEventListener('click', () => {
    if (!gameStarted) {
        gameStarted = true;
    }
    if (!gameOver) {
        bird.velocity = bird.jump;
        flapSound.play();
    }
});

document.getElementById('restartButton').addEventListener('click', () => {
    // Reset game state
    bird.y = canvas.height / 2;
    bird.velocity = 0;
    pipes = [];
    score = 0;
    gameOver = false;
    document.getElementById('score').textContent = '0';
    document.getElementById('gameOver').style.display = 'none';
});

// Start game loop
gameLoop();

// Simple Flappy Bird clone (vanilla JS, canvas)
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const startBtn = document.getElementById('startBtn');
const scoreEl = document.getElementById('score');

const W = canvas.width, H = canvas.height;

let frames = 0;
let score = 0;
let pipes = [];
let gameState = 'menu'; // 'menu', 'play', 'over'

const bird = {
  x: 80,
  y: H/2,
  w: 34, h: 24, // if you use sprite, adapt
  vy: 0,
  gravity: 0.45,
  jump: -8,
  draw(){
    ctx.fillStyle = '#ff0';
    ctx.fillRect(this.x, this.y, this.w, this.h);
    // If you have an image: drawImage(...)
  },
  update(){
    this.vy += this.gravity;
    this.y += this.vy;
    if(this.y + this.h > H) { this.y = H - this.h; this.vy = 0; gameOver(); }
    if(this.y < 0) { this.y = 0; this.vy = 0; }
  },
  flap(){ this.vy = this.jump; }
};

function reset(){
  frames = 0;
  score = 0;
  pipes = [];
  bird.y = H/2; bird.vy = 0;
  scoreEl.textContent = 'Score: 0';
}

function spawnPipe(){
  const gap = 140;
  const topH = 60 + Math.random()*(H - 220);
  pipes.push({x: W, top: topH, bottom: topH + gap, w: 52, passed:false});
}

function drawPipes(){
  ctx.fillStyle = '#2d8f2d';
  pipes.forEach(p=>{
    // top pipe
    ctx.fillRect(p.x, 0, p.w, p.top);
    // bottom pipe
    ctx.fillRect(p.x, p.bottom, p.w, H - p.bottom);
  });
}

function updatePipes(){
  for(let i = pipes.length-1; i>=0; i--){
    pipes[i].x -= 2.6;
    // scoring
    if(!pipes[i].passed && pipes[i].x + pipes[i].w < bird.x){
      pipes[i].passed = true;
      score++; scoreEl.textContent = 'Score: ' + score;
      // play point sound if available
    }
    // remove offscreen
    if(pipes[i].x + pipes[i].w < 0) pipes.splice(i,1);
    // collision
    if (bird.x < pipes[i].x + pipes[i].w &&
        bird.x + bird.w > pipes[i].x &&
        (bird.y < pipes[i].top || bird.y + bird.h > pipes[i].bottom)) {
      gameOver();
    }
  }
}

function gameOver(){
  if(gameState !== 'over'){
    gameState = 'over';
    startBtn.textContent = 'Restart';
  }
}

function loop(){
  frames++;
  ctx.clearRect(0,0,W,H);

  // background
  ctx.fillStyle = '#70c5ce';
  ctx.fillRect(0,0,W,H);

  if(gameState === 'play'){
    if(frames % 100 === 0) spawnPipe();
    updatePipes();
    bird.update();
  }

  drawPipes();
  bird.draw();

  // overlay text
  if(gameState === 'menu'){
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.font = '20px Arial';
    ctx.fillText('ចុច Start ដើម្បី ចាប់ផ្ដើម', W/2 - 90, H/2 - 60);
  } else if (gameState === 'over'){
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.font = '28px Arial';
    ctx.fillText('Game Over', W/2 - 70, H/2 - 20);
    ctx.font = '18px Arial';
    ctx.fillText('Score: ' + score, W/2 - 35, H/2 + 10);
  }

  requestAnimationFrame(loop);
}

// input
canvas.addEventListener('click', ()=>{
  if(gameState === 'menu'){ gameState = 'play'; startBtn.textContent = 'Playing...'; }
  if(gameState === 'play') bird.flap();
  if(gameState === 'over'){ reset(); gameState = 'play'; startBtn.textContent = 'Playing...'; }
});
document.addEventListener('keydown', e=>{
  if(e.code === 'Space') {
    if(gameState === 'menu'){ gameState = 'play'; startBtn.textContent = 'Playing...'; }
    if(gameState === 'play') bird.flap();
    if(gameState === 'over'){ reset(); gameState = 'play'; startBtn.textContent = 'Playing...'; }
  }
});
startBtn.addEventListener('click', ()=>{
  if(gameState === 'menu' || gameState === 'over'){ reset(); gameState = 'play'; startBtn.textContent = 'Playing...'; }
});

reset();
loop();



/* Khmer and English UI strings */
const UI = {
  km: {
    tap: 'ចុចឬ SPACE ដើម្បីបង្ហាប់',
    start: 'ចាប់ផ្តើម',
    gameOver: 'ហ្គេមបញ្ចប់',
    score: 'ពិន្ទុ',
    best: 'លំដាប់ល្អបំផុត'
  },
  en: {
    tap: 'Click or SPACE to flap',
    start: 'Start',
    gameOver: 'Game Over',
    score: 'Score',
    best: 'Best'
  }
}

// Canvas and context
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const W = canvas.width, H = canvas.height;

// Game state
let bird = {x:80,y:H/2,vy:0,w:34,h:24,rot:0};
let gravity = 0.6, flapPower = -9, maxFall = 12;
let pipes = [], frames = 0, score = 0, best = localStorage.getItem('flappy_km_best')||0;
let running = false, started = false, gameOver=false;
let pipeInterval = 100; // frames between pipes
let gapSize = 140; // pipe gap
let pipeSpeed = 2.2;
let powerupsOn = true;
let activePower = null; // {type, until}
let powerups = [];
let assets = {birdImg:null, pipeImg:null, bg:null};
let aud = {wing:null, point:null, die:null};

// Load default simple images (drawn) if user hasn't uploaded
function drawDefaultBird(x,y){
  ctx.save();
  ctx.translate(x,y);
  ctx.fillStyle='#ffd24a';
  ctx.beginPath(); ctx.ellipse(0,0,12,9,0,0,Math.PI*2); ctx.fill();
  ctx.fillStyle='#000'; ctx.fillRect(4,-2,4,2);
  ctx.restore();
}

function loadAssetsFromFile(file, cb){
  const reader = new FileReader();
  reader.onload = () => cb(reader.result);
  reader.readAsDataURL(file);
}

// UI elements
const langSel = document.getElementById('lang');
const diffSel = document.getElementById('difficulty');
const birdFile = document.getElementById('birdFile');
const pipeFile = document.getElementById('pipeFile');
const audioFiles = document.getElementById('audioFiles');
const startBtn = document.getElementById('start');
const resetBtn = document.getElementById('reset');
const status = document.getElementById('status');
const bestEl = document.getElementById('best');
const togglePower = document.getElementById('togglePower');
const showPower = document.getElementById('showPower');

bestEl.textContent = best;

langSel.addEventListener('change', ()=> updateUIText());
function updateUIText(){
  const lang = langSel.value;
  document.getElementById('uiText').textContent = UI[lang].tap;
  startBtn.textContent = lang==='km' ? 'ចាប់ផ្តើម (Start)' : 'Start';
}
updateUIText();

// Difficulty
diffSel.addEventListener('change', ()=> applyDifficulty());
function applyDifficulty(){
  const d = diffSel.value;
  if(d==='easy'){ gapSize=160; pipeSpeed=1.8; pipeInterval=110}
  if(d==='normal'){ gapSize=140; pipeSpeed=2.2; pipeInterval=100}
  if(d==='hard'){ gapSize=120; pipeSpeed=2.8; pipeInterval=90}
}
applyDifficulty();

// Upload custom bird image
birdFile.addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  loadAssetsFromFile(f, src=>{
    const img = new Image(); img.onload=()=>{ assets.birdImg = img; statusMessage('bird uploaded')}; img.src = src;
  });
});
pipeFile.addEventListener('change', e=>{
  const f = e.target.files[0]; if(!f) return;
  loadAssetsFromFile(f, src=>{ const img=new Image(); img.onload=()=>{ assets.pipeImg = img; statusMessage('pipe uploaded')}; img.src=src; });
});

audioFiles.addEventListener('change', e=>{
  const files = Array.from(e.target.files);
  files.forEach(f=>{
    if(/wing/i.test(f.name)) loadAssetsFromFile(f, src=>{ aud.wing = new Audio(src); statusMessage('wing sound set')});
    if(/point/i.test(f.name)) loadAssetsFromFile(f, src=>{ aud.point = new Audio(src); statusMessage('point sound set')});
    if(/die/i.test(f.name)) loadAssetsFromFile(f, src=>{ aud.die = new Audio(src); statusMessage('die sound set')});
  });
});

function statusMessage(t){
  const el = document.getElementById('uiText'); el.textContent = t;
  setTimeout(()=> updateUIText(), 1200);
}

// Start/reset
startBtn.addEventListener('click', ()=> startGame());
resetBtn.addEventListener('click', ()=>{ localStorage.removeItem('flappy_km_best'); best=0; bestEl.textContent=0; statusMessage('Best reset')});

togglePower.addEventListener('click', ()=>{ powerupsOn = !powerupsOn; togglePower.textContent = powerupsOn? 'បិទ power-ups':'បើក power-ups'; statusMessage('Power-ups: '+(powerupsOn?'on':'off'))});

// Input: tap or space
window.addEventListener('keydown', e=>{ if(e.code==='Space'){ flap(); if(!running) startGame(); e.preventDefault(); }});
canvas.addEventListener('mousedown', ()=>{ flap(); if(!running) startGame(); });
canvas.addEventListener('touchstart', e=>{ e.preventDefault(); flap(); if(!running) startGame(); });

function flap(){ if(gameOver) return; bird.vy = flapPower; playSound(aud.wing); started=true}

function playSound(s){ if(!s) return; try{ s.currentTime = 0; s.play(); }catch(e){}
}

// Pipe generation
function spawnPipe(){
  const top = Math.random()*(H - gapSize - 160) + 60;
  pipes.push({x:W,y:top,width:52,passed:false});
}

// Power-up spawn
function spawnPowerup(){
  const types = ['shield','slow','double'];
  const t = types[Math.floor(Math.random()*types.length)];
  powerups.push({x:W, y: Math.random()*(H-200)+120, type:t});
}

function update(){
  frames++;
  if(started && !gameOver){
    // physics
    let g = gravity;
    if(activePower && activePower.type==='slow'){ g *= 0.45 }
    bird.vy += g; if(bird.vy>maxFall) bird.vy=maxFall; bird.y += bird.vy;
    bird.rot = Math.min( (bird.vy/12) * 45, 45 );

    // pipes move
    for(const p of pipes){ p.x -= pipeSpeed; }
    // powerups move
    for(const pu of powerups){ pu.x -= pipeSpeed; }

    // spawn pipes
    if(frames % pipeInterval === 0) spawnPipe();
    // spawn powerups occasionally
    if(powerupsOn && frames % 600 === 0) spawnPowerup();

    // scoring & collision
    pipes = pipes.filter(p=>p.x > -80);
    powerups = powerups.filter(p=>p.x > -80);

    for(const p of pipes){
      if(!p.passed && bird.x > p.x + 52){ p.passed=true; score++; let pts = activePower && activePower.type==='double' ? 2:1; score += (pts-1); playSound(aud.point); }
      // collision check rectangular
      const pipeTopRect = {x:p.x,y:0,w:52,h:p.y};
      const pipeBottomRect = {x:p.x,y:p.y+gapSize,w:52,h:H};
      if(collideRect(bird, pipeTopRect) || collideRect(bird, pipeBottomRect)){
        if(activePower && activePower.type==='shield' && activePower.until>Date.now()){ // consume shield
          activePower = null; statusMessage('Shield used!');
          // remove the pipe so bird can pass
          p.x += 200; continue;
        } else endGame();
      }
    }

    // powerup pickup
    for(let i=powerups.length-1;i>=0;i--){ const pu = powerups[i]; if(collideRect(bird,{x:pu.x,y:pu.y,w:28,h:28})){ applyPower(pu.type); powerups.splice(i,1); statusMessage('Power: '+pu.type); } }

    // ground or ceiling
    if(bird.y + bird.h/2 >= H-20 || bird.y - bird.h/2 < 0) endGame();
  }
}

function applyPower(type){ activePower = {type:type, until: Date.now() + 5000}; if(type==='shield'){} if(type==='slow'){} if(type==='double'){}
}

function endGame(){ if(gameOver) return; gameOver = true; running=false; playSound(aud.die); statusMessage(UI[langSel.value].gameOver); if(score>best){ best=score; localStorage.setItem('flappy_km_best',best); bestEl.textContent=best } }

function collideRect(b, r){
  // treat bird as rectangle centered
  const bx = b.x - b.w/2, by = b.y - b.h/2;
  return !(bx + b.w < r.x || bx > r.x + r.w || by + b.h < r.y || by > r.y + r.h);
}

// Drawing
function draw(){
  // bg
  ctx.fillStyle = '#aee0ff'; ctx.fillRect(0,0,W,H);
  // clouds simple
  ctx.fillStyle='#f3f7f9'; ctx.beginPath(); ctx.ellipse(120,140,140,60,0,0,Math.PI*2); ctx.fill();

  // pipes
  for(const p of pipes){
    if(assets.pipeImg){
      // top
      ctx.save(); ctx.translate(p.x,p.y - assets.pipeImg.height); ctx.drawImage(assets.pipeImg,0,0); ctx.restore();
      // bottom
      ctx.save(); ctx.translate(p.x,p.y+gapSize); ctx.drawImage(assets.pipeImg,0,0); ctx.restore();
    } else {
      ctx.fillStyle='#2b8a3e'; ctx.fillRect(p.x,p.y+gapSize,52,H);
      ctx.fillRect(p.x,0,52,p.y);
    }
  }

  // powerups
  for(const pu of powerups){ ctx.fillStyle='#ffd24a'; ctx.beginPath(); ctx.arc(pu.x+12, pu.y+12, 12,0,Math.PI*2); ctx.fill(); ctx.fillStyle='#000'; ctx.fillText(pu.type[0].toUpperCase(), pu.x+8, pu.y+16); }

  // ground
  ctx.fillStyle='#efe3b7'; ctx.fillRect(0,H-20,W,20);
  ctx.fillStyle='#86b456'; ctx.fillRect(0,H-28,W,8);

  // bird
  if(assets.birdImg){ ctx.save(); ctx.translate(bird.x,bird.y); ctx.rotate(bird.rot*Math.PI/180); ctx.drawImage(assets.birdImg,-assets.birdImg.width/2, -assets.birdImg.height/2); ctx.restore(); }
  else drawDefaultBird(bird.x,bird.y);

  // HUD
  ctx.fillStyle='#000'; ctx.font='20px Arial'; ctx.fillText(UI[langSel.value].score + ': ' + score, 14,34);
  ctx.fillText(UI[langSel.value].best + ': ' + best, 14,62);

  if(!started){ ctx.fillStyle='rgba(0,0,0,0.6)'; ctx.fillRect(W/2-110,H/2-24,220,48); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font='16px Arial'; ctx.fillText(UI[langSel.value].tap, W/2, H/2+4); ctx.textAlign='left'; }
  if(gameOver){ ctx.fillStyle='rgba(0,0,0,0.7)'; ctx.fillRect(W/2-120,H/2-60,240,120); ctx.fillStyle='#fff'; ctx.textAlign='center'; ctx.font='22px Arial'; ctx.fillText(UI[langSel.value].gameOver, W/2, H/2 -8); ctx.font='16px Arial'; ctx.fillText(UI[langSel.value].score+': '+score, W/2, H/2+18); ctx.textAlign='left'; }
}

function loop(){ update(); draw(); if(running || !gameOver) requestAnimationFrame(loop); }

function startGame(){ // reset state
  pipes = []; powerups = []; frames=0; score=0; bird.x=80; bird.y=H/2; bird.vy=0; gameOver=false; started=false; running=true; loop(); statusMessage('Game started'); }

// auto-load some demo audio paths if available in assets folder (user can drop files into input instead)
function tryLoadDefaultAudio(){
  ['wing','point','die'].forEach(name=>{
    const a = new Audio('./assets/'+name+'.wav'); a.addEventListener('canplaythrough', ()=>{ aud[name]=a; });
  });
}
tryLoadDefaultAudio();

// show best on load
bestEl.textContent = best;

// helpful note: allow drag-drop of image onto canvas to set bird
canvas.addEventListener('dragover', e=>e.preventDefault());
canvas.addEventListener('drop', e=>{
  e.preventDefault(); const f = e.dataTransfer.files[0]; if(!f) return; if(f.type.startsWith('image/')){ loadAssetsFromFile(f, src=>{ const img=new Image(); img.onload=()=>{ assets.birdImg = img; statusMessage('bird set from drop') }; img.src = src }); }
});

// expose small API in window for debugging
window._flappy = {startGame, endGame, assets, aud};