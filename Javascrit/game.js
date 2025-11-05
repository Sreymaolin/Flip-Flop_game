const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const msgEl = document.getElementById('msg');
const restartBtn = document.getElementById('restartBtn');
const muteBtn = document.getElementById('muteBtn');

let W = canvas.width; let H = canvas.height;

function resizeCanvasToDisplay(){
  // Keep canvas size consistent with CSS width (responsive)
  const ratio = W / H;
  const cssWidth = Math.min(480, Math.max(280, window.innerWidth - 48));
  canvas.style.width = cssWidth + 'px';
  canvas.style.height = (cssWidth / ratio) + 'px';
}
window.addEventListener('resize', resizeCanvasToDisplay);
resizeCanvasToDisplay();

// Audio (optional)
let muted = false;
const sounds = {
  flap: new Audio(),
  score: new Audio(),
  hit: new Audio()
};
// Small generated tones fallback (use data URIs) — if browser blocks, ignore
sounds.flap.src = 'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBIAAAABAAEAESsAACJWAAACABAAZGF0YQAAAAA=';
// empty tiny sounds to avoid network
sounds.score.src = sounds.flap.src;
sounds.hit.src = sounds.flap.src;

function playSound(a){ if(muted) return; try{ a.currentTime=0; a.play(); }catch(e){}
}

// Game variables
let frames = 0;
let score = 0;
let highScore = parseInt(localStorage.getItem('flappy_high')||'0',10);
let pipes = [];
let gameOver = false;
let started = false;

// Bird
const bird = {
  x: 90,
  y: H/2,
  w: 34,
  h: 24,
  vy: 0,
  gravity: 0.55,
  jump: -9,
  rotation: 0
};

// Pipe settings
const GAP = 150; // gap size
const PIPE_W = 52;
const PIPE_SPEED = 2.6;
const spawnEvery = 120; // frames

function reset(){
  frames = 0; score = 0; pipes = []; gameOver = false; started = false;
  bird.y = H/2; bird.vy = 0; bird.rotation = 0;
  scoreEl.textContent = score;
  msgEl.style.display = 'block';
}
reset();

function spawnPipe(){
  const topH = 50 + Math.random() * (H - GAP - 150);
  pipes.push({x: W, top: topH, passed: false});
}

function update(){
  frames++;
  if(!gameOver && started){
    // Bird physics
    bird.vy += bird.gravity;
    bird.y += bird.vy;
    bird.rotation = Math.min(Math.PI/3, bird.vy / 10);

    // Spawn pipes
    if(frames % spawnEvery === 0) spawnPipe();

    // Move pipes
    for(let i=pipes.length-1;i>=0;i--){
      const p = pipes[i];
      p.x -= PIPE_SPEED;

      // score
      if(!p.passed && p.x + PIPE_W < bird.x){ p.passed = true; score++; scoreEl.textContent = score; playSound(sounds.score); }

      // remove off-screen
      if(p.x + PIPE_W < -20) pipes.splice(i,1);

      // collision check
      const pipeTopRect = {x:p.x, y:0, w:PIPE_W, h:p.top};
      const pipeBottomRect = {x:p.x, y:p.top + GAP, w:PIPE_W, h:H - (p.top + GAP)};
      if(rectIntersect(pipeTopRect, birdRect()) || rectIntersect(pipeBottomRect, birdRect())){
        // hit
        endGame();
      }
    }

    // ground collision
    if(bird.y + bird.h/2 >= H - 10){ endGame(); }

  }
}

function birdRect(){
  return {x: bird.x - bird.w/2, y: bird.y - bird.h/2, w: bird.w, h: bird.h};
}

function rectIntersect(a,b){
  return !(b.x > a.x + a.w || b.x + b.w < a.x || b.y > a.y + a.h || b.y + b.h < a.y);
}

function endGame(){
  if(gameOver) return;
  gameOver = true;
  playSound(sounds.hit);
  msgEl.style.display = 'block';
  msgEl.innerHTML = '<strong>Game Over</strong><div><small>Score: '+score+' — High: '+highScore+'</small></div>';
  // update high score
  if(score > highScore){ highScore = score; localStorage.setItem('flappy_high', String(highScore)); msgEl.innerHTML += '<div><small>New high score!</small></div>'; }
}

function draw(){
  // clear
  ctx.clearRect(0,0,W,H);

  // Background sky (simple gradient already by CSS but draw for fidelity)
  const g = ctx.createLinearGradient(0,0,0,H);
  g.addColorStop(0,'#7EDBFF'); g.addColorStop(1,'#58B0FF');
  ctx.fillStyle = g; ctx.fillRect(0,0,W,H);

  // Pipes
  for(const p of pipes){
    // top pipe
    ctx.fillStyle = '#2aa94e';
    ctx.fillRect(p.x, 0, PIPE_W, p.top);
    // cap
    ctx.fillStyle = '#1f8a3b'; ctx.fillRect(p.x-4, p.top-12, PIPE_W+8, 12);

    // bottom pipe
    ctx.fillStyle = '#2aa94e';
    ctx.fillRect(p.x, p.top + GAP, PIPE_W, H - (p.top + GAP));
    ctx.fillStyle = '#1f8a3b'; ctx.fillRect(p.x-4, p.top + GAP, PIPE_W+8, 12);
  }

  // Ground
  ctx.fillStyle = '#e0c17a'; ctx.fillRect(0, H-10, W, 10);

  // Bird (simple circle + wing)
  ctx.save();
  ctx.translate(bird.x, bird.y);
  ctx.rotate(bird.rotation);
  // body
  ctx.fillStyle = '#FFDE59'; ctx.beginPath(); ctx.ellipse(0,0, bird.w/2, bird.h/2, 0, 0, Math.PI*2); ctx.fill();
  // eye
  ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(6, -4, 3, 0, Math.PI*2); ctx.fill();
  // beak
  ctx.fillStyle = '#ff8a00'; ctx.beginPath(); ctx.moveTo(12,0); ctx.lineTo(18,4); ctx.lineTo(12,6); ctx.closePath(); ctx.fill();
  ctx.restore();

  // If not started show instructions
  if(!started && !gameOver){
    ctx.save(); ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.font = '18px system-ui'; ctx.textAlign='center';
    ctx.fillText('Press SPACE or Tap to Start', W/2, H/2 - 60);
    ctx.restore();
  }

  // HUD score
  ctx.save(); ctx.fillStyle = '#023'; ctx.font = 'bold 36px system-ui'; ctx.textAlign='center';
  ctx.fillText(score, W/2, 70);
  ctx.restore();
}

function loop(){
  update(); draw();
  requestAnimationFrame(loop);
}
requestAnimationFrame(loop);

// Controls
function flap(){
  if(gameOver){ reset(); return; }
  if(!started){ started = true; msgEl.style.display = 'none'; }
  bird.vy = bird.jump; playSound(sounds.flap);
}

window.addEventListener('keydown', (e)=>{ if(e.code === 'Space') { e.preventDefault(); flap(); } });
window.addEventListener('pointerdown', (e)=>{ // supports mouse and touch
  flap();
});

restartBtn.addEventListener('click', ()=>{ reset(); });
muteBtn.addEventListener('click', ()=>{ muted = !muted; muteBtn.textContent = muted ? 'Unmute' : 'Mute'; });

// friendly mobile: allow touchstart without delay
window.addEventListener('touchstart', (e)=>{ e.preventDefault(); }, {passive:false});

// initialize message text
msgEl.innerHTML = '<strong>Press SPACE or Tap to start.</strong><div><small>Click/tap or press space to flap. Avoid pipes. High score saved locally.</small></div>';