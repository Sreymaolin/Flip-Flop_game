from flask import Flask, send_from_directory, jsonify, request
import os, json, time, tempfile

app = Flask(__name__, static_folder='.', static_url_path='')

CONTROL_FILE = "control.json"
HIGHSCORE_FILE = "highscore.txt"

def atomic_write_json(path, data):
    dirn = os.path.dirname(os.path.abspath(path)) or "."
    fd, tmp = tempfile.mkstemp(dir=dirn)
    with os.fdopen(fd, 'w', encoding='utf-8') as f:
        json.dump(data, f)
    os.replace(tmp, path)

def read_json(path):
    try:
        with open(path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}

@app.route('/')
def index():
    return send_from_directory('.', 'index.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

@app.route('/api/flap', methods=['POST'])
def api_flap():
    payload = {"action": "flap", "ts": int(time.time() * 1000)}
    atomic_write_json(CONTROL_FILE, payload)
    return jsonify({"ok": True, "written": payload})

@app.route('/api/reset', methods=['POST'])
def api_reset():
    payload = {"action": "reset", "ts": int(time.time() * 1000)}
    atomic_write_json(CONTROL_FILE, payload)
    return jsonify({"ok": True, "written": payload})

@app.route('/api/clear', methods=['POST'])
def api_clear():
    atomic_write_json(CONTROL_FILE, {})
    return jsonify({"ok": True})

@app.route('/api/status', methods=['GET'])
def api_status():
    score = 0
    best = 0
    try:
        if os.path.exists(HIGHSCORE_FILE):
            with open(HIGHSCORE_FILE, 'r', encoding='utf-8') as f:
                best = int(f.read().strip() or 0)
    except Exception:
        best = 0
    return jsonify({"score": score, "best": best})

@app.route('/api/get_control', methods=['GET'])
def api_get_control():
    data = read_json(CONTROL_FILE)
    return jsonify(data)

if __name__ == "__main__":
    if not os.path.exists(CONTROL_FILE):
        atomic_write_json(CONTROL_FILE, {})
    print("✅ Flask server running at: http://127.0.0.1:5000")
    app.run(debug=True, host="0.0.0.0", port=5000)