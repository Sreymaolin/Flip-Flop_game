import pygame
import sys
import random
import os

# Initialize Pygame
pygame.init()
pygame.mixer.init()  # Initialize sound mixer
pygame.mixer.set_num_channels(8)  # Allow more sounds to play simultaneously

# Game Constants
W, H = 400, 600
FPS = 60
GRAVITY = 0.25       # Faster falling
BIRD_JUMP = -6       # Stronger jump for better control
PIPE_SPEED = 2.0     # Faster pipe movement
PIPE_GAP = 130       # Smaller gap between pipes
PIPE_SPAWN_TIME = 100  # Pipes appear more frequently
INVINCIBLE_TIME = 0    # No invincibility - die on hit
WALKING_SOUND_INTERVAL = 300  # Play walking sound more frequently

# Colors
SKY_BLUE = (112, 193, 200)
BIRD_COLOR = (255, 200, 0)
PIPE_COLOR = (34, 139, 34)

# Set up display
screen = pygame.display.set_mode((W, H))
pygame.display.set_caption("Flappy Bird")
clock = pygame.time.Clock()
font = pygame.font.SysFont(None, 36)

# Load game assets
def load_image(name):
    try:
        path = os.path.join('flappy_images', name)
        return pygame.image.load(path).convert_alpha()
    except:
        return None

def load_sound(name):
    try:
        path = os.path.join('flappy_sounds', name)
        return pygame.mixer.Sound(path)
    except:
        return None

# Load images
bird_img = load_image('bird.png')
pipe_img = load_image('pipe.png')
bg_img = load_image('background.png')

# Load sounds with correct assignments for each action
flapping_sound = load_sound('hit.wav')     # សម្លេងពេលហោះ - ប្រើសម្លេងខ្លីជាង
death_sound = load_sound('point.wav')      # សម្លេងពេលងាប់
score_sound = load_sound('flap.wav')       # សម្លេងពេលបានពិន្ទុ

# Set volumes for different sounds
if flapping_sound: flapping_sound.set_volume(0.3)  # សម្លេងហោះតិចជាង
if death_sound: death_sound.set_volume(0.5)        # សម្លេងងាប់មធ្យម
if score_sound: score_sound.set_volume(0.6)        # សម្លេងពិន្ទុខ្លាំងជាង

# Create channel for sound effects
sound_channel = pygame.mixer.Channel(0)  # Use channel 0 for sound effects

class Bird:
    """Bird class representing the player character"""
    def __init__(self):
        # Initial position and dimensions
        self.x = 80
        self.y = H//2
        self.vy = 0  # Vertical velocity
        self.w = 48  # Width (ធំជាងមុន)
        self.h = 38  # Height (ធំជាងមុន)
        self.rotation = 0  # For rotation animation
        self.invincible = False  # Invincibility after hitting pipe
        self.invincible_timer = 0
        self.walking_sound_timer = 0  # For walking sound effect

    def flap(self):
        """Make the bird jump"""
        self.vy = BIRD_JUMP
        if flapping_sound:
            flapping_sound.play()

    def update(self):
        """Update bird position and check boundaries"""
        # Apply gravity
        self.vy += GRAVITY
        self.y += self.vy
        
        # Update rotation based on velocity
        self.rotation = max(-30, min(self.vy * 3, 90))

        # Check boundaries
        if self.y + self.h > H:
            self.y = H - self.h
            self.vy = 0  # Stop falling
        if self.y < 0:
            self.y = 0
            self.vy = 0
        return False  # Never die from hitting ground

    def rect(self):
        """Get the bird's collision rectangle with smaller hitbox"""
        padding = 5  # Make hitbox smaller than visual size
        return pygame.Rect(
            self.x + padding,
            int(self.y) + padding,
            self.w - padding * 2,
            self.h - padding * 2
        )

    def draw(self, surface):
        """Draw the bird with rotation and invincibility effect"""
        if self.invincible:
            # Flashing effect when invincible
            if (pygame.time.get_ticks() // 100) % 2:
                return

        if bird_img:
            # Create rotated image
            rotated_image = pygame.transform.rotate(
                pygame.transform.scale(bird_img, (self.w, self.h)),
                -self.rotation
            )
            # Get new rect for rotated image
            rect = rotated_image.get_rect(center=(self.x + self.w//2, int(self.y) + self.h//2))
            surface.blit(rotated_image, rect.topleft)
        else:
            # Fallback to rectangle if no image
            color = (255, 255, 0) if self.invincible else BIRD_COLOR  # Yellow when invincible
            pygame.draw.rect(surface, color, self.rect())

class Pipe:
    """Pipe class representing obstacles"""
    def __init__(self):
        # Set pipe dimensions and position
        self.w = 100  # Width (slightly narrower for balance)
        self.gap = PIPE_GAP
        self.speed = PIPE_SPEED
        
        # Calculate pipe heights with better distribution
        min_top = 120  # Minimum height for top pipe (higher than before)
        max_top = H - self.gap - 120  # Maximum height, leaving equal room at top and bottom
        top = random.randint(min_top, max_top)
        self.top = top  # Top pipe height
        self.bottom = top + self.gap  # Bottom pipe starting position
        
        # Add collision padding for more precise detection
        self.collision_padding = 2  # Small padding for more precise collisions
        
        # Flag for playing sound when approaching
        self.sound_played = False
        
        # Starting position and state
        self.x = W
        self.passed = False
        
        # Create base rectangles
        self.update_rects()

    def update(self):
        """Move pipe to the left"""
        self.x -= self.speed
        self.update_rects()

    def update_rects(self):
        """Update collision rectangles"""
        self.top_rect = pygame.Rect(self.x, 0, self.w, self.top)
        self.bottom_rect = pygame.Rect(self.x, self.bottom, self.w, H - self.bottom)

    def rects(self):
        """Get pipe collision rectangles"""
        return self.top_rect, self.bottom_rect
        
    def get_top_rect(self):
        """Get precise collision rectangle for top pipe"""
        return pygame.Rect(
            self.x + self.collision_padding,
            0,
            self.w - self.collision_padding * 2,
            self.top
        )
        
    def get_bottom_rect(self):
        """Get precise collision rectangle for bottom pipe"""
        return pygame.Rect(
            self.x + self.collision_padding,
            self.bottom,
            self.w - self.collision_padding * 2,
            H - self.bottom
        )

    def draw(self, surface):
        """Draw both pipes"""
        r1, r2 = self.rects()
        
        if pipe_img:
            # Draw top pipe (flipped)
            top_pipe = pygame.transform.flip(
                pygame.transform.scale(pipe_img, (self.w, r1.height)),
                False, True
            )
            surface.blit(top_pipe, (self.x, 0))
            
            # Draw bottom pipe
            bottom_pipe = pygame.transform.scale(pipe_img, (self.w, r2.height))
            surface.blit(bottom_pipe, (self.x, self.bottom))
        else:
            # Fallback to rectangles if no image
            pygame.draw.rect(surface, PIPE_COLOR, r1)
            pygame.draw.rect(surface, PIPE_COLOR, r2)

class Game:
    """Main game class to manage game states and logic"""
    def __init__(self):
        self.reset_game()
        # Load persisted high score from disk (if present)
        self.high_score = self.load_high_score()
        
        # Create mountain ranges (front and back)
        self.mountains = [
            # Back mountains (darker, slower)
            {'points': self.generate_mountain_points(0.6), 'color': (90, 130, 100), 'y_offset': H-150, 'speed': 0.2},
            # Front mountains (lighter, faster)
            {'points': self.generate_mountain_points(0.8), 'color': (100, 155, 100), 'y_offset': H-180, 'speed': 0.3}
        ]
        
        # Create clouds at different depths
        self.clouds = [
            # Back clouds (slower)
            *[{'x': random.randint(0, W), 'y': random.randint(50, 150), 
               'speed': random.uniform(0.3, 0.6), 'size': random.uniform(0.6, 0.8), 
               'layer': 'back'} for _ in range(3)],
            # Front clouds (faster)
            *[{'x': random.randint(0, W), 'y': random.randint(100, 200), 
               'speed': random.uniform(0.7, 1.2), 'size': random.uniform(0.9, 1.1), 
               'layer': 'front'} for _ in range(4)]
        ]
        
        # Grass details for varied appearance
        self.grass_details = [
            {'x': x, 'height': random.randint(10, 25), 'sway': random.uniform(-1, 1)}
            for x in range(0, W, 15)
        ]
        
        # Pause state
        self.paused = False

    def generate_mountain_points(self, roughness=0.7):
        """Generate mountain range points using midpoint displacement"""
        points = [(0, H), (W//2, H - random.randint(100, 170)), (W, H)]
        iterations = 5
        
        for _ in range(iterations):
            new_points = []
            for i in range(len(points) - 1):
                p1 = points[i]
                p2 = points[i + 1]
                mid_x = (p1[0] + p2[0]) // 2
                mid_y = (p1[1] + p2[1]) // 2
                displacement = (p2[0] - p1[0]) * roughness
                mid_y += random.randint(int(-displacement), int(displacement))
                new_points.extend([p1, (mid_x, mid_y)])
            new_points.append(points[-1])
            points = new_points
        
        return points

    def reset_game(self):
        """Reset game to initial state"""
        self.bird = Bird()
        self.pipes = []
        self.frames = 0
        self.score = 0
        self.state = 'menu'  # 'menu', 'play', 'over'

    def highscore_path(self):
        """Return path to highscore file next to this script"""
        return os.path.join(os.path.dirname(__file__), 'highscore.txt')

    def load_high_score(self):
        """Load high score from disk, return 0 if not found or error"""
        try:
            path = self.highscore_path()
            if os.path.exists(path):
                with open(path, 'r', encoding='utf-8') as f:
                    return int(f.read().strip() or 0)
        except Exception:
            pass
        return 0

    def save_high_score(self):
        """Persist current high score to disk."""
        try:
            path = self.highscore_path()
            with open(path, 'w', encoding='utf-8') as f:
                f.write(str(self.high_score))
        except Exception:
            pass

    def handle_input(self, event):
        """Handle user input"""
        if event.type == pygame.QUIT:
            return False
        # Toggle pause with P
        if event.type == pygame.KEYDOWN and event.key == pygame.K_p:
            if self.state == 'play':
                self.paused = not self.paused
            return True

        if event.type == pygame.KEYDOWN and event.key == pygame.K_SPACE:
            self.handle_action()
        elif event.type == pygame.MOUSEBUTTONDOWN:
            self.handle_action()
            
        return True

    def handle_action(self):
        """Handle space/click action based on game state"""
        if self.state == 'menu':
            self.state = 'play'
        elif self.state == 'play':
            # Only flap when not paused
            if not self.paused:
                self.bird.flap()
        elif self.state == 'over':
            self.reset_game()
            self.state = 'play'

    def update(self):
        """Update game state"""
        # Always update background animations, even when paused
        # Update cloud positions with parallax
        for cloud in self.clouds:
            cloud['x'] -= cloud['speed']
            if cloud['x'] + 160 < 0:  # 160 is max cloud width
                cloud['x'] = W + random.randint(0, 100)
                cloud['y'] = random.randint(50, 200) if cloud['layer'] == 'back' else random.randint(100, 250)
                cloud['speed'] = (random.uniform(0.3, 0.6) if cloud['layer'] == 'back' 
                                else random.uniform(0.7, 1.2))
        
        # Update mountain positions (slow parallax)
        for mountain in self.mountains:
            mountain['points'] = [(x - mountain['speed'], y) for x, y in mountain['points']]
            # If leftmost point is off screen, shift mountain right
            if mountain['points'][0][0] + W < 0:
                shift = W + abs(mountain['points'][0][0])
                mountain['points'] = [(x + shift, y) for x, y in mountain['points']]

        # Update grass sway
        for grass in self.grass_details:
            grass['sway'] += random.uniform(-0.1, 0.1)
            grass['sway'] = max(-1.5, min(1.5, grass['sway']))  # Limit sway range

        # Do not update gameplay logic while not playing or when paused
        if self.state != 'play' or self.paused:
            return

        current_time = pygame.time.get_ticks()

        # Update bird's invincibility
        if self.bird.invincible:
            if current_time - self.bird.invincible_timer > INVINCIBLE_TIME:
                self.bird.invincible = False

        # No more continuous walking sound - we only want flapping sounds when jumping

        # Spawn pipes
        self.frames += 1
        if self.frames % PIPE_SPAWN_TIME == 0:
            self.pipes.append(Pipe())

        # Update pipes
        for pipe in self.pipes:
            pipe.update()

        # Check collisions, scoring, and proximity
        for pipe in self.pipes[:]:
            rtop, rbot = pipe.rects()
            
            # Check if bird is approaching pipe
            distance_to_pipe = pipe.x - self.bird.x
            if not pipe.sound_played and distance_to_pipe < 100 and distance_to_pipe >0:
                if flapping_sound:
                    sound_channel.set_volume(0.4)
                    flapping_sound.play()
                pipe.sound_played = True

            # ពិនិត្យការប៉ះគ្នាយ៉ាងច្បាស់លាស់
            bird_rect = self.bird.rect()
            
            # យកព្រំដែនពិតប្រាកដរបស់បំពង់
            top_pipe_rect = pipe.get_top_rect()
            bottom_pipe_rect = pipe.get_bottom_rect()
            
            # ពិនិត្យតែពេលប៉ះគ្នាពិតប្រាកដប៉ុណ្ណោះ
            if (bird_rect.colliderect(top_pipe_rect) or 
                bird_rect.colliderect(bottom_pipe_rect)):
                
                # គណនាផ្ទៃដែលប៉ះគ្នា (ភាពជាន់គ្នា)
                overlap_top = 0
                overlap_bottom = 0
                
                if bird_rect.colliderect(top_pipe_rect):
                    collision_area = bird_rect.clip(top_pipe_rect)
                    overlap_top = collision_area.width * collision_area.height
                    
                if bird_rect.colliderect(bottom_pipe_rect):
                    collision_area = bird_rect.clip(bottom_pipe_rect)
                    overlap_bottom = collision_area.width * collision_area.height
                
                # ងាប់តែពេលប៉ះគ្នាច្រើន (ប៉ះពិតប្រាកដ)
                if overlap_top > 25 or overlap_bottom > 25:  
                    if death_sound:
                        death_sound.play()
                    self.game_over()
                    break
                
            # Score check
            if not pipe.passed and pipe.x + pipe.w < self.bird.x:
                self.score_point(pipe)
                
            # Remove off-screen pipes
            if pipe.x + pipe.w < 0:
                self.pipes.remove(pipe)

        # Update bird - no death from ground collision
        self.bird.update()

    def score_point(self, pipe):
        """Handle scoring"""
        pipe.passed = True
        self.score += 1
        if score_sound:
            score_sound.play()
        old_high = self.high_score
        self.high_score = max(self.score, self.high_score)
        if self.high_score != old_high:
            # Persist new high score immediately
            self.save_high_score()

    def game_over(self):
        """Handle game over state"""
        self.state = 'over'
        if death_sound:
            if sound_channel:
                sound_channel.set_volume(0.5)
                sound_channel.play(death_sound)

    def draw(self):
        """Draw game state"""
        # Draw background
        if bg_img:
            screen.blit(pygame.transform.scale(bg_img, (W, H)), (0, 0))
        else:
            # Fill sky with gradient
            screen.fill((135, 206, 235))  # Base sky color
            
            # Draw back clouds (smaller, slower)
            for cloud in [c for c in self.clouds if c['layer'] == 'back']:
                x, y = cloud['x'], cloud['y']
                size = cloud['size']
                # Slightly darker/more distant clouds
                cloud_color = (240, 240, 240)
                shadow_color = (210, 210, 210)
                
                # Main cloud body
                pygame.draw.ellipse(screen, cloud_color, 
                    (x, y, 80 * size, 40 * size))
                # Cloud puffs
                pygame.draw.ellipse(screen, cloud_color, 
                    (x + 30 * size, y - 15 * size, 70 * size, 35 * size))
                pygame.draw.ellipse(screen, cloud_color, 
                    (x + 60 * size, y, 60 * size, 30 * size))
                # Shadows
                pygame.draw.ellipse(screen, shadow_color, 
                    (x + 10 * size, y + 10 * size, 70 * size, 30 * size))
            
            # Draw mountains with parallax
            for mountain in self.mountains:
                # Create a polygon for the mountain
                points = [(x, y + mountain['y_offset']) for x, y in mountain['points']]
                points.extend([(W, H), (0, H)])  # Close the polygon
                pygame.draw.polygon(screen, mountain['color'], points)
                # Add snow caps (lighter color on peaks)
                for i in range(1, len(mountain['points'])-1):
                    x, y = mountain['points'][i]
                    if y < H - 160:  # Only add snow to higher peaks
                        snow_color = (255, 255, 255)
                        pygame.draw.circle(screen, snow_color, 
                            (int(x), int(y + mountain['y_offset'])), 3)
            
            # Draw front clouds (larger, faster)
            for cloud in [c for c in self.clouds if c['layer'] == 'front']:
                x, y = cloud['x'], cloud['y']
                size = cloud['size']
                # Brighter/closer clouds
                cloud_color = (255, 255, 255)
                shadow_color = (220, 220, 220)
                
                # Main cloud body
                pygame.draw.ellipse(screen, cloud_color, 
                    (x, y, 90 * size, 45 * size))
                # Cloud puffs
                pygame.draw.ellipse(screen, cloud_color, 
                    (x + 35 * size, y - 20 * size, 80 * size, 40 * size))
                pygame.draw.ellipse(screen, cloud_color, 
                    (x + 70 * size, y, 70 * size, 35 * size))
                # Shadows
                pygame.draw.ellipse(screen, shadow_color, 
                    (x + 15 * size, y + 15 * size, 80 * size, 35 * size))
            
            # Draw grass base
            grass_color = (34, 139, 34)  # Base green
            pygame.draw.rect(screen, grass_color, (0, H - 50, W, 50))
            
            # Draw detailed grass blades with animation
            for grass in self.grass_details:
                x, height, sway = grass['x'], grass['height'], grass['sway']
                # Vary grass colors slightly
                blade_color = (27, 114, 27) if random.random() > 0.3 else (34, 139, 34)
                
                # Draw main blade with sway
                pygame.draw.polygon(screen, blade_color, [
                    (x, H - 45),  # Base
                    (x + sway * 2, H - 45 - height),  # Top (swaying)
                    (x + 4, H - 45)  # Base 2
                ])
                
                # Draw second blade sometimes
                if height > 15:
                    pygame.draw.polygon(screen, blade_color, [
                        (x + 3, H - 45),
                        (x + 3 + sway * 1.5, H - 45 - height + 7),
                        (x + 6, H - 45)
                    ])

        # Draw game objects
        for pipe in self.pipes:
            pipe.draw(screen)
        self.bird.draw(screen)

        # Draw HUD
        self.draw_hud()

        # Draw paused overlay if needed
        if self.paused:
            # Semi-transparent overlay
            overlay = pygame.Surface((W, H), pygame.SRCALPHA)
            overlay.fill((0, 0, 0, 120))
            screen.blit(overlay, (0, 0))
            # Paused text
            pausetxt = font.render("PAUSED - Press P to resume", True, (255, 255, 255))
            screen.blit(pausetxt, (W//2 - pausetxt.get_width()//2, H//2 - pausetxt.get_height()//2))

        pygame.display.flip()

    def draw_hud(self):
        """Draw heads-up display"""
        # Score
        score_text = f"Score: {self.score}"
        if self.high_score > 0:
            score_text += f" Best: {self.high_score}"
        score_surf = font.render(score_text, True, (0, 0, 0))
        screen.blit(score_surf, (10, 10))

        # State messages
        if self.state == 'menu':
            self.draw_centered_text("Press SPACE or Click to start", (0, 0, 0))
        elif self.state == 'over':
            self.draw_centered_text("Game Over - Press SPACE to restart", (255, 0, 0))

    def draw_centered_text(self, text, color):
        """Helper to draw centered text"""
        surf = font.render(text, True, color)
        screen.blit(surf, (W//2 - surf.get_width()//2, H//2 - 20))

def main():
    """Main game loop"""
    game = Game()
    running = True

    while running:
        # Maintain consistent game speed
        clock.tick(FPS)

        # Handle events
        for event in pygame.event.get():
            running = game.handle_input(event)

        # Update and draw
        game.update()
        game.draw()

    pygame.quit()
    sys.exit()

if __name__ == '__main__':
    main()