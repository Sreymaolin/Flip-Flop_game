from flask import Flask, jsonify, request, send_from_directory, render_template_string
import os
from datetime import datetime

app = Flask(__name__, static_folder='.', static_url_path='')

# Config: Match your project dirs
ASSETS_DIR = '.'  # Root serves everything
HIGHSCORE_FILE = 'highscore.txt'  # Reuse your existing file for global high score

# In-memory leaderboard (list of dicts: {'name': str, 'score': int, 'date': str})
# In production, use SQLite: scores = []  # Load from DB on start
scores = []

# Load initial high score (global best)
def load_high_score():
    if os.path.exists(HIGHSCORE_FILE):
        with open(HIGHSCORE_FILE, 'r') as f:
            return int(f.read().strip() or 0)
    return 0

global_high = load_high_score()

@app.route('/')
def index():
    """Serve index.html (main game page)"""
    return send_from_directory('.', 'index.html')

@app.route('/leaderboard.html')
def leaderboard():
    """Serve leaderboard.html (static, but JS can fetch /api/leaderboard)"""
    return send_from_directory('.', 'leaderboard.html')

@app.route('/about.html')
def about():
    """Serve about.html (static)"""
    return send_from_directory('.', 'about.html')

@app.route('/privacy.html')
def privacy():
    """Serve privacy.html (static)"""
    return send_from_directory('.', 'privacy.html')

# Static assets (images, sounds, css, js)
@app.route('/flappy_images/<path:filename>')
def serve_images(filename):
    return send_from_directory('flappy_images', filename)

@app.route('/flappy_sounds/<path:filename>')
def serve_sounds(filename):
    return send_from_directory('flappy_sounds', filename)

@app.route('/flappy-web/css/<path:filename>')
def serve_css(filename):
    return send_from_directory('flappy-web/css', filename)

@app.route('/JavaScript/<path:filename>')
def serve_js(filename):
    return send_from_directory('JavaScript', filename)  # Note: Your dir is 'JavaScript' (capital J)

# API Endpoints
@app.route('/api/score', methods=['POST'])
def submit_score():
    """Submit a new score. Expects JSON: {'name': 'Player', 'score': 42}"""
    data = request.json
    if not data or 'name' not in data or 'score' not in data:
        return jsonify({'error': 'Missing name or score'}), 400
    
    name = data['name'][:20]  # Sanitize: max 20 chars
    score = int(data['score'])
    
    # Add to leaderboard
    scores.append({
        'name': name,
        'score': score,
        'date': datetime.now().strftime('%Y-%m-%d %H:%M')
    })
    
    # Sort by score descending, keep top 100
    scores.sort(key=lambda x: x['score'], reverse=True)
    scores[:] = scores[:100]
    
    # Update global high score if needed
    global global_high
    if score > global_high:
        global_high = score
        with open(HIGHSCORE_FILE, 'w') as f:
            f.write(str(global_high))
    
    return jsonify({'success': True, 'message': 'Score submitted!'})

@app.route('/api/leaderboard')
def get_leaderboard():
    """Get top 10 scores"""
    top_scores = scores[:10]
    return jsonify({
        'highscore': global_high,
        'scores': top_scores
    })

@app.route('/api/about')
def get_about():
    """Dynamic about data if needed (e.g., version, stats). Currently static."""
    return jsonify({
        'version': '1.0',
        'description': 'FlipFlop Bird - A bamboo-themed Flappy Bird clone',
        'global_high': global_high
    })

@app.route('/api/privacy')
def get_privacy():
    """Dynamic privacy info (e.g., data collected). Currently static."""
    return jsonify({
        'data_collected': 'Only anonymous scores for leaderboard',
        'policy': 'No personal data stored beyond name (pseudonym ok). See privacy.html for details.'
    })

if __name__ == '__main__':
    # Load existing scores if you have a DB file (optional)
    # For now, starts empty
    app.run(debug=True, host='0.0.0.0', port=5000)