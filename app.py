from flask import Flask, render_template
from flask_socketio import SocketIO
import threading, io, base64, pygame
from PIL import Image
from game import Game, W, H

app = Flask(__name__, template_folder="templates")
socketio = SocketIO(app, cors_allowed_origins="*")

game = Game()
pygame.display.set_mode((W,H))  # needed for surfaces

def game_loop():
    clock = pygame.time.Clock()
    while True:
        dt = clock.tick(60)
        game.update(dt)
        frame_surface = game.draw()
        
        # Convert Pygame surface to JPEG in memory
        img_str = pygame.image.tostring(frame_surface, "RGB")
        image = Image.frombytes("RGB", (W,H), img_str)
        buffer = io.BytesIO()
        image.save(buffer, format="JPEG")
        b64_frame = base64.b64encode(buffer.getvalue()).decode("ascii")
        
        # Emit base64 string and score
        socketio.emit("frame", b64_frame)
        socketio.emit("score", {"score": game.score, "high": game.high_score})

threading.Thread(target=game_loop, daemon=True).start()

@app.route("/")
def index():
    return render_template("index.html")

@socketio.on("flap")
def flap(): game.on_action()
@socketio.on("reset")
def reset(): game.reset()

if __name__=="__main__":
    socketio.run(app, host="0.0.0.0", port=5000)
