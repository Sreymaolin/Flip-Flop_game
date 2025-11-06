(() => {
      // ────────────────────── ELEMENTS ──────────────────────
      const canvas = document.getElementById('game');
      const ctx = canvas.getContext('2d');
      const scoreEl = document.getElementById('score');
      const bestEl  = document.getElementById('best');
      const muteBtn = document.getElementById('muteBtn');

      // ────────────────────── CONFIG ──────────────────────
      const W = 700, H = 500;
      canvas.width = W; canvas.height = H;

      const GRAVITY = 0.4;
      const BIRD_JUMP = -7.5;
      const PIPE_SPEED = 2.0;
      const PIPE_GAP = 160;
      const PIPE_MIN_TOP = 80;
      const PIPE_MAX_TOP = H - PIPE_GAP - 120;
      const PIPE_SPAWN_MIN = 1200;
      const PIPE_SPAWN_MAX = 1600;
      const GROUND_Y = H - 100;

      const ASSETS_IMG = "flappy_images";
      const ASSETS_SND = "flappy_sounds";

      // ────────────────────── HELPERS ──────────────────────
      const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
      const rectCollide = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
      const loadImage = src => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = src; });
      const loadSound = src => new Promise(r => { const a = new Audio(src); a.oncanplaythrough = () => r(a); a.onerror = () => r(null); });

      // ────────────────────── ASSETS ──────────────────────
      let birdFrames = [], birdImg = null, groundImg = null;
      let flapSnd = null, pointSnd = null, hitSnd = null;
      let muted = false;

      (async () => {
        const [b1, b2, b3, bird, ground] = await Promise.all([
          loadImage(`${ASSETS_IMG}/bird1.png`),
          loadImage(`${ASSETS_IMG}/bird2.png`),
          loadImage(`${ASSETS_IMG}/bird3.png`),
          loadImage(`${ASSETS_IMG}/bird.png`),
          loadImage(`${ASSETS_IMG}/base.png`)
        ]);
        if (b1) birdFrames.push(b1);
        if (b2) birdFrames.push(b2);
        if (b3) birdFrames.push(b3);
        birdImg = bird; groundImg = ground;

        [flapSnd, pointSnd, hitSnd] = await Promise.all([
          loadSound(`${ASSETS_SND}/flap.wav`),
          loadSound(`${ASSETS_SND}/point.wav`),
          loadSound(`${ASSETS_SND}/hit.wav`)
        ]);
        if (flapSnd) flapSnd.volume = 0.4;
        if (pointSnd) pointSnd.volume = 0.6;
        if (hitSnd) hitSnd.volume = 0.6;
      })();

      // ────────────────────── BIRD ──────────────────────
      class Bird {
        constructor() { this.reset(); }
        reset() {
          this.x = 60; this.y = H/2; this.vy = 0;
          this.w = 40; this.h = 34;
          this.rotation = 0;
          this.frameIdx = 0; this.frameTimer = 0;
        }
        flap() {
          this.vy = BIRD_JUMP;
          if (flapSnd && !muted) { flapSnd.currentTime = 0; flapSnd.play().catch(() => {}); }
        }
        update(dt) {
          this.vy += GRAVITY * dt;
          this.y += this.vy * dt;
          this.rotation = Math.max(-25, Math.min(90, -this.vy * 5));
          if (birdFrames.length) {
            this.frameTimer += dt * 1.2;
            if (this.frameTimer >= 4) { this.frameTimer = 0; this.frameIdx = (this.frameIdx + 1) % birdFrames.length; }
          }
        }
        rect() { const p = 5; return {x:this.x+p, y:this.y+p, w:this.w-2*p, h:this.h-2*p}; }
        draw() {
          const img = birdFrames.length ? birdFrames[this.frameIdx] : birdImg;
          ctx.save();
          ctx.translate(this.x + this.w/2, this.y + this.h/2);
          ctx.rotate(this.rotation * Math.PI/180);
          if (img) ctx.drawImage(img, -this.w/2, -this.h/2, this.w, this.h);
          else {
            ctx.fillStyle = '#ffde59'; ctx.fillRect(-this.w/2, -this.h/2, this.w, this.h);
            ctx.fillStyle = '#ff8c00'; ctx.fillRect(this.w/2-6, -this.h/2+4, 10, 6);
          }
          ctx.restore();
        }
      }

      // ────────────────────── PIPE ──────────────────────
      class Pipe {
        constructor(x) {
          this.w = 52;
          this.top = randInt(PIPE_MIN_TOP, PIPE_MAX_TOP);
          this.bottom = this.top + PIPE_GAP;
          this.x = x;
          this.passed = false;
        }
        update(dt) { this.x -= PIPE_SPEED * dt; }
        topRect()   { return {x:this.x, y:0, w:this.w, h:this.top}; }
        bottomRect(){ return {x:this.x, y:this.bottom, w:this.w, h:H-this.bottom}; }
        draw() {
          const body = '#228B22', stripe = '#006400', cap = '#3CB371';
          ctx.fillStyle = body;
          ctx.fillRect(this.x, 0, this.w, this.top);
          ctx.fillRect(this.x, this.bottom, this.w, H-this.bottom);
          ctx.fillStyle = stripe;
          for (let y=0; y<this.top; y+=12) ctx.fillRect(this.x+2, y, this.w-4, 3);
          for (let y=this.bottom; y<H; y+=12) ctx.fillRect(this.x+2, y, this.w-4, 3);
          ctx.fillStyle = cap;
          ctx.fillRect(this.x-8, this.top-25, this.w+16, 25);
          ctx.fillRect(this.x-8, this.bottom, this.w+16, 25);
        }
      }

      // ────────────────────── GAME ──────────────────────
      class Game {
        constructor() {
          this.bird = new Bird();
          this.pipes = [];
          this.score = 0;
          this.highScore = this.loadHighScore();
          this.state = 'menu';
          this.lastPipeTime = performance.now();
          this.nextPipeDelay = randInt(PIPE_SPAWN_MIN, PIPE_SPAWN_MAX);
          bestEl.textContent = this.highScore;
          this.updateMuteButton();
        }
        loadHighScore() { try { return parseInt(localStorage.getItem('fbHigh')||'0',10); } catch { return 0; } }
        saveHighScore() {
          if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('fbHigh', this.highScore);
            bestEl.textContent = this.highScore;
          }
        }
        reset() {
          this.bird.reset();
          this.pipes = [];
          this.score = 0;
          scoreEl.textContent = '0';
          this.state = 'play';
          this.lastPipeTime = performance.now();
          this.nextPipeDelay = randInt(PIPE_SPAWN_MIN, PIPE_SPAWN_MAX);
        }
        onAction() {
          if (this.state === 'menu') { this.reset(); this.bird.flap(); }
          else if (this.state === 'play') this.bird.flap();
          else if (this.state === 'over') this.reset();
        }
        toggleMute() {
          muted = !muted;
          this.updateMuteButton();
          [flapSnd, pointSnd, hitSnd].forEach(s => { if (s) s.muted = muted; });
        }
        updateMuteButton() { muteBtn.textContent = muted ? 'UNMUTE' : 'MUTE'; }
        hit() {
          if (hitSnd && !muted) { hitSnd.currentTime = 0; hitSnd.play().catch(() => {}); }
          this.state = 'over';
          this.saveHighScore();
        }

        drawButton(text, y) {
          const btnW = 180, btnH = 50;
          const btnX = W/2 - btnW/2;
          const btnY = y;
          ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.fillRect(btnX+4, btnY+4, btnW, btnH);
          ctx.fillStyle = '#4CAF50';        ctx.fillRect(btnX,   btnY,   btnW, btnH);
          ctx.fillStyle = '#fff';
          ctx.font = 'bold 28px system-ui, sans-serif';
          ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText(text, W/2, btnY + btnH/2);
          return {x: btnX, y: btnY, w: btnW, h: btnH};
        }

        update(dt) {
          if (this.state !== 'play') return;
          const now = performance.now();
          if (now - this.lastPipeTime > this.nextPipeDelay) {
            this.pipes.push(new Pipe(W + 10));
            this.lastPipeTime = now;
            this.nextPipeDelay = randInt(PIPE_SPAWN_MIN, PIPE_SPAWN_MAX);
          }
          this.pipes.forEach(p => p.update(dt));
          this.pipes = this.pipes.filter(p => p.x + p.w > -50);
          this.bird.update(dt);
          const br = this.bird.rect();
          for (const p of this.pipes) {
            if (rectCollide(br, p.topRect()) || rectCollide(br, p.bottomRect())) { this.hit(); break; }
            if (!p.passed && p.x + p.w/2 < this.bird.x) {
              p.passed = true;
              this.score++;
              scoreEl.textContent = this.score;
              if (pointSnd && !muted) { pointSnd.currentTime = 0; pointSnd.play().catch(() => {}); }
            }
          }
          if (this.bird.y + this.bird.h >= GROUND_Y) { this.bird.y = GROUND_Y - this.bird.h; this.hit(); }
          if (this.bird.y < -10) { this.bird.y = -10; this.bird.vy = 0; }
        }

        draw() {
          const grad = ctx.createLinearGradient(0,0,0,H);
          grad.addColorStop(0,'#70c5ff'); grad.addColorStop(0.5,'#9be7ff'); grad.addColorStop(1,'#87CEEB');
          ctx.fillStyle = grad; ctx.fillRect(0,0,W,H);

          this.pipes.forEach(p => p.draw());
          this.bird.draw();

          if (groundImg) ctx.drawImage(groundImg, 0, GROUND_Y-20, W, 120);
          else { ctx.fillStyle = '#3CB371'; ctx.fillRect(0, GROUND_Y, W, H-GROUND_Y); }

          if (this.state === 'menu') {
            ctx.fillStyle = '#000';
            ctx.font = 'bold 32px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Flappy Bird', W/2, H/2 - 80);
            this.startBtn = this.drawButton('START', H/2 - 25);
          }

          if (this.state === 'over') {
            ctx.fillStyle = '#c00';
            ctx.font = 'bold 36px system-ui, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText('Game Over', W/2, H/2 - 80);
            ctx.fillStyle = '#000';
            ctx.font = '24px system-ui, sans-serif';
            ctx.fillText(`Score: ${this.score}   Best: ${this.highScore}`, W/2, H/2 - 30);
            this.restartBtn = this.drawButton('RESTART', H/2 + 30);
          }
        }
      }

      const game = new Game();

      // ────────────────────── INPUT ──────────────────────
      const action = e => { e.preventDefault(); game.onAction(); };
      window.addEventListener('keydown', e => { if (e.code === 'Space') action(e); });

      canvas.addEventListener('click', e => {
        const rect = canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left;
        const my = e.clientY - rect.top;

        if (game.state === 'menu' && game.startBtn && rectCollide({x:mx,y:my,w:1,h:1}, game.startBtn))
          game.onAction();
        else if (game.state === 'over' && game.restartBtn && rectCollide({x:mx,y:my,w:1,h:1}, game.restartBtn))
          game.onAction();
        else if (game.state === 'play')
          action(e);
      });

      canvas.addEventListener('touchstart', e => {
        e.preventDefault();
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        const mx = touch.clientX - rect.left;
        const my = touch.clientY - rect.top;

        if (game.state === 'menu' && game.startBtn && rectCollide({x:mx,y:my,w:1,h:1}, game.startBtn))
          game.onAction();
        else if (game.state === 'over' && game.restartBtn && rectCollide({x:mx,y:my,w:1,h:1}, game.restartBtn))
          game.onAction();
        else if (game.state === 'play')
          action(e);
      });

      muteBtn.addEventListener('click', e => { e.stopPropagation(); game.toggleMute(); });

      // ────────────────────── MAIN LOOP ──────────────────────
      let last = performance.now();
      const loop = now => {
        const dt = Math.min((now - last) / (1000/60), 3);
        last = now;
        game.update(dt);
        game.draw();
        requestAnimationFrame(loop);
      };
      requestAnimationFrame(loop);
    })();
