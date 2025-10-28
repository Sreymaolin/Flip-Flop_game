from flask import Flask, render_template, request, jsonify
import sqlite3
import os
from datetime import datetime

app = Flask(__name__, 
    static_folder='.', 
    static_url_path='',
    template_folder='.')

# Database setup
def init_db():
    with sqlite3.connect('game.db') as conn:
        c = conn.cursor()
        c.execute('''
            CREATE TABLE IF NOT EXISTS scores (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                player_name TEXT,
                score INTEGER,
                difficulty TEXT,
                date_created TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()

# Initialize database on startup
init_db()

@app.route('/')
def home():
    return render_template('index.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/leaderboard')
def leaderboard():
    return render_template('leaderboard.html')

@app.route('/privacy')
def privacy():
    return render_template('privacy.html')

@app.route('/api/scores', methods=['POST'])
def save_score():
    data = request.json
    score = data.get('score', 0)
    player_name = data.get('player_name', 'Anonymous')
    difficulty = data.get('difficulty', 'normal')
    
    with sqlite3.connect('game.db') as conn:
        c = conn.cursor()
        c.execute('INSERT INTO scores (player_name, score, difficulty) VALUES (?, ?, ?)',
                 (player_name, score, difficulty))
        conn.commit()
    
    return jsonify({'status': 'success'})

@app.route('/api/scores', methods=['GET'])
def get_scores():
    difficulty = request.args.get('difficulty', 'normal')
    
    with sqlite3.connect('game.db') as conn:
        c = conn.cursor()
        c.execute('''
            SELECT player_name, score, date_created 
            FROM scores 
            WHERE difficulty = ? 
            ORDER BY score DESC 
            LIMIT 10
        ''', (difficulty,))
        scores = [{'name': row[0], 'score': row[1], 'date': row[2]} 
                 for row in c.fetchall()]
    
    return jsonify(scores)

@app.route('/api/best_score', methods=['GET'])
def get_best_score():
    difficulty = request.args.get('difficulty', 'normal')
    
    with sqlite3.connect('game.db') as conn:
        c = conn.cursor()
        c.execute('''
            SELECT MAX(score) 
            FROM scores 
            WHERE difficulty = ?
        ''', (difficulty,))
        best_score = c.fetchone()[0] or 0
    
    return jsonify({'best_score': best_score})

if __name__ == '__main__':
    app.run(debug=True, port=5000)