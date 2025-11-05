import pygame
import sys
import random
import os

# -------- CONFIG --------
W, H = 400, 600
FPS = 60

GRAVITY = 0.25
BIRD_JUMP = -6.5
PIPE_SPEED = 2.5
PIPE_GAP = 150
PIPE_MIN_TOP = 50
PIPE_MAX_TOP = H - PIPE_GAP - 150
PIPE_SPAWN_MIN = 900
PIPE_SPAWN_MAX = 1400
GROUND_Y = H - 50

ASSETS_IMG_DIR = "flappy_images"
ASSETS_SND_DIR = "flappy_sounds"
# ------------------------

pygame.init()
pygame.mixer.init()
screen = pygame.display.set_mode((W, H))
pygame.display.set_caption("Flappy Bird Bamboo")
clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 36)

# ---------- LOADERS ----------
def load_image(name):
    path = os.path.join(ASSETS_IMG_DIR, name)
    try:
        return pygame.image.load(path).convert_alpha()
    except Exception:
        return None

def load_sound(name):
    path = os.path.join(ASSETS_SND_DIR, name)
    try:
        return pygame.mixer.Sound(path)
    except Exception:
        return None

# ---------- IMAGES ----------
bird_frames = []
for i in range(1, 4):
    img = load_image(f"bird{i}.png")
    if img:
        bird_frames.append(img)

bird_img = load_image("bird.png")
bg_img = load_image("bg.png")
ground_img = load_image("base.png")

# ---------- SOUNDS ----------
flap_sound = load_sound("flap.wav")
point_sound = load_sound("point.wav")
hit_sound = load_sound("hit.wav")

if flap_sound: flap_sound.set_volume(0.4)
if point_sound: point_sound.set_volume(0.6)
if hit_sound: hit_sound.set_volume(0.6)

sound_channel = pygame.mixer.Channel(0)

# ---------- BIRD ----------
class Bird:
    def __init__(self):
        self.x = 80
        self.y = H // 2
        self.vy = 0
        self.w = 50
        self.h = 40
        self.rotation = 0
        self.frame_idx = 0
        self.frame_timer = 0

    def flap(self):
        self.vy = BIRD_JUMP
        if flap_sound:
            sound_channel.play(flap_sound)

    def update(self, dt):
        self.vy += GRAVITY * dt
        self.y += self.vy * dt
        self.rotation = max(-25, min(90, -self.vy * 6))

        # frame animation
        if bird_frames:
            self.frame_timer += dt
            if self.frame_timer > 80:
                self.frame_timer = 0
                self.frame_idx = (self.frame_idx + 1) % len(bird_frames)

    def rect(self):
        padding = 6
        return pygame.Rect(int(self.x + padding), int(self.y + padding),
                           int(self.w - padding * 2), int(self.h - padding * 2))

    def draw(self, surface):
        if bird_frames:
            img = bird_frames[self.frame_idx]
        elif bird_img:
            img = bird_img
        else:
            pygame.draw.rect(surface, (255, 200, 0), self.rect())
            return

        img = pygame.transform.scale(img, (self.w, self.h))
        img = pygame.transform.rotate(img, self.rotation)
        r = img.get_rect(center=(self.x + self.w // 2, int(self.y) + self.h // 2))
        surface.blit(img, r.topleft)

# ---------- PIPE (Bamboo Style) ----------
class Pipe:
    def __init__(self, x):
        self.w = 70
        self.top = random.randint(PIPE_MIN_TOP, PIPE_MAX_TOP)
        self.bottom = self.top + PIPE_GAP
        self.x = x
        self.speed = PIPE_SPEED
        self.passed = False

    def update(self, dt):
        self.x -= self.speed * dt

    def top_rect(self):
        return pygame.Rect(int(self.x), 0, self.w, int(self.top))

    def bottom_rect(self):
        return pygame.Rect(int(self.x), int(self.bottom), self.w, int(H - self.bottom))

    def draw(self, surface):
        # Bamboo style: green with stripes
        r1 = self.top_rect()
        r2 = self.bottom_rect()
        color = (34, 139, 34)       # bamboo green
        stripe_color = (0, 100, 0)  # darker green stripes

        # draw top pipe
        pygame.draw.rect(surface, color, r1)
        for i in range(r1.top, r1.bottom, 10):
            pygame.draw.line(surface, stripe_color, (self.x, i), (self.x + self.w, i), 2)



        # draw bottom pipe
        pygame.draw.rect(surface, color, r2)
        for i in range(r2.top, r2.bottom, 10):
            pygame.draw.line(surface, stripe_color, (self.x, i), (self.x + self.w, i), 2)

# ---------- GAME ----------
class Game:
    def __init__(self):
        self.reset()
        self.high_score = self.load_high_score()

    def reset(self):
        self.bird = Bird()
        self.pipes = []
        self.score = 0
        self.state = 'menu'
        self.last_pipe_time = pygame.time.get_ticks()
        self.next_pipe_delay = random.randint(PIPE_SPAWN_MIN, PIPE_SPAWN_MAX)

    def highscore_path(self):
        return os.path.join(os.path.dirname(__file__), "highscore.txt")

    def load_high_score(self):
        try:
            p = self.highscore_path()
            if os.path.exists(p):
                with open(p, 'r', encoding='utf-8') as f:
                    return int(f.read().strip() or 0)
        except Exception:
            pass
        return 0

    def save_high_score(self):
        try:
            p = self.highscore_path()
            with open(p, 'w', encoding='utf-8') as f:
                f.write(str(self.high_score))
        except Exception:
            pass

    def handle_event(self, e):
        if e.type == pygame.QUIT:
            return False
        if e.type == pygame.KEYDOWN and e.key == pygame.K_SPACE:
            self.on_action()
        if e.type == pygame.MOUSEBUTTONDOWN:
            self.on_action()
        return True

    def on_action(self):
        if self.state == 'menu':
            self.state = 'play'
            self.bird.flap()
        elif self.state == 'play':
            self.bird.flap()
        elif self.state == 'over':
            self.reset()
            self.state = 'play'

    def update(self, dt_ms):
        dt = dt_ms / (1000 / 60)
        if self.state == 'play':
            now = pygame.time.get_ticks()
            if now - self.last_pipe_time > self.next_pipe_delay:
                self.pipes.append(Pipe(W + 10))
                self.last_pipe_time = now
                self.next_pipe_delay = random.randint(PIPE_SPAWN_MIN, PIPE_SPAWN_MAX)

            for pipe in self.pipes:
                pipe.update(dt)
            self.pipes = [p for p in self.pipes if p.x + p.w > -50]

            self.bird.update(dt)

            bird_rect = self.bird.rect()
            for pipe in self.pipes:
                if bird_rect.colliderect(pipe.top_rect()) or bird_rect.colliderect(pipe.bottom_rect()):
                    self.do_hit()
                    break

                if not pipe.passed and pipe.x + pipe.w / 2 < self.bird.x:
                    pipe.passed = True
                    self.score += 1
                    if point_sound:
                        sound_channel.play(point_sound)
                    if self.score > self.high_score:
                        self.high_score = self.score
                        self.save_high_score()

            # ground collision
            if self.bird.y + self.bird.h >= GROUND_Y:
                self.bird.y = GROUND_Y - self.bird.h
                self.do_hit()

            if self.bird.y < -10:
                self.bird.y = -10
                self.bird.vy = 0

    def do_hit(self):
        if hit_sound:
            sound_channel.play(hit_sound)
        self.state = 'over'

    def draw(self):
        if bg_img:
            screen.blit(pygame.transform.scale(bg_img, (W, H)), (0, 0))
        else:
            screen.fill((135, 206, 235))

        for pipe in self.pipes:
            pipe.draw(screen)

        # ground
        if ground_img:
            gh = pygame.transform.scale(ground_img, (W, 100))
            screen.blit(gh, (0, GROUND_Y - 20))
        else:
            pygame.draw.rect(screen, (111, 78, 55), (0, GROUND_Y, W, H - GROUND_Y))

        self.bird.draw(screen)

        s = font.render(f"Score: {self.score}  Best: {self.high_score}", True, (0, 0, 0))
        screen.blit(s, (10, 10))



        if self.state == 'menu':
            t = font.render("Click to Start", True, (0, 0, 0))
            screen.blit(t, (W // 2 - t.get_width() // 2, H // 2 - 50))
        elif self.state == 'over':
            t = font.render("Game Over", True, (255, 0, 0))
            screen.blit(t, (W // 2 - t.get_width() // 2, H // 2 - 50))

# ---------- MAIN ----------
def main():
    game = Game()
    running = True
    while running:
        dt = clock.tick(FPS)
        for e in pygame.event.get():
            running = game.handle_event(e)
            if not running:
                break

        game.update(dt)
        game.draw()
        pygame.display.flip()

    pygame.quit()
    sys.exit()

if __name__ == "__main__":
    main()