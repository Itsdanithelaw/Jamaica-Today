from flask import Flask, request, jsonify
from flask_cors import CORS
import sqlite3
from datetime import datetime, timezone

app = Flask(__name__, static_folder='../frontend', static_url_path='')
CORS(app)

# ── DATABASE ──
def get_db():
    db = sqlite3.connect('ja-today.db', timeout=10)
    db.row_factory = sqlite3.Row
    return db

def init_db():
    db = get_db()

    # Users table
    db.execute('''
    CREATE TABLE IF NOT EXISTS users (
        id       INTEGER PRIMARY KEY AUTOINCREMENT,
        name     TEXT NOT NULL,
        email    TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        role     TEXT NOT NULL DEFAULT 'user',
        joined   TEXT DEFAULT CURRENT_TIMESTAMP
    )
''')
    db.execute('''
    CREATE TABLE IF NOT EXISTS breaking_news (
        id        INTEGER PRIMARY KEY AUTOINCREMENT,
        message   TEXT NOT NULL,
        active    INTEGER DEFAULT 1,
        pushed_at TEXT
    )
''')

    # Articles table
    db.execute('''
        CREATE TABLE IF NOT EXISTS articles (
            id       INTEGER PRIMARY KEY AUTOINCREMENT,
            title    TEXT NOT NULL,
            excerpt  TEXT,
            body     TEXT,
            category TEXT,
            source   TEXT,
            author   TEXT,
            image    TEXT,
            url      TEXT,
            date     TEXT
        )
    ''')

    # Visitors table — tracks IP and time of every visit
    db.execute('''
        CREATE TABLE IF NOT EXISTS visitors (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            ip         TEXT,
            page       TEXT,
            visited_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    db.commit()
    db.close()

# ── VISITOR TRACKING ──
# Runs automatically on every single request to the server
@app.before_request
def track_visitor():
    ip   = request.remote_addr
    page = request.path
    if not page.startswith('/api'):
        try:
            db = get_db()
            db.execute(
                'INSERT INTO visitors (ip, page) VALUES (?, ?)',
                (ip, page)
            )
            db.commit()
            db.close()
        except Exception:
            pass
# ── ROUTES ──
@app.route('/')
def home():
    return app.send_static_file('ja-today.html')

@app.route('/admin')
def admin():
    return app.send_static_file('admin.html')

# REGISTER
@app.route('/api/register', methods=['POST'])
def register():
    data     = request.get_json()
    name     = data.get('name', '').strip()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()

    if not name or not email or not password:
        return jsonify({'error': 'All fields are required'}), 400
    if len(password) < 6:
        return jsonify({'error': 'Password must be at least 6 characters'}), 400

    db = get_db()
    try:
        db.execute(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            (name, email, password)
        )
        db.commit()
        return jsonify({'message': 'Account created', 'name': name, 'email': email}), 201
    except sqlite3.IntegrityError:
        return jsonify({'error': 'Email already registered'}), 409
    finally:
        db.close()

# LOGIN
@app.route('/api/login', methods=['POST'])
def login():
    data     = request.get_json()
    email    = data.get('email', '').strip().lower()
    password = data.get('password', '').strip()

    if not email or not password:
        return jsonify({'error': 'All fields are required'}), 400

    db   = get_db()
    user = db.execute(
        'SELECT * FROM users WHERE email = ? AND password = ?',
        (email, password)
    ).fetchone()
    db.close()

    if not user:
        return jsonify({'error': 'Incorrect email or password'}), 401

    return jsonify({
    'message': 'Login successful',
    'name':    user['name'],
    'email':   user['email'],
    'role':    user['role']
}), 200

# GET all articles
@app.route('/api/articles', methods=['GET'])
def get_articles():
    db       = get_db()
    articles = db.execute('SELECT * FROM articles ORDER BY date DESC').fetchall()
    db.close()
    return jsonify([dict(a) for a in articles])

# ADD article
@app.route('/api/articles', methods=['POST'])
def add_article():
    data = request.get_json()
    if not data.get('title'):
        return jsonify({'error': 'Title is required'}), 400

    db = get_db()
    db.execute('''
        INSERT INTO articles
        (title, excerpt, body, category, source, author, image, url, date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ''', (
        data.get('title', ''),
        data.get('excerpt', ''),
        data.get('body', ''),
        data.get('category', ''),
        data.get('source', ''),
        data.get('author', ''),
        data.get('image', ''),
        data.get('url', ''),
        data.get('date', datetime.today().strftime('%Y-%m-%d')),
    ))
    db.commit()
    db.close()
    return jsonify({'message': 'Article added'}), 201

# EDIT article
@app.route('/api/articles/<int:article_id>', methods=['PUT'])
def edit_article(article_id):
    data = request.get_json()
    db   = get_db()
    db.execute('''
        UPDATE articles SET
            title    = ?,
            excerpt  = ?,
            body     = ?,
            category = ?,
            source   = ?,
            author   = ?,
            image    = ?,
            url      = ?,
            date     = ?
        WHERE id = ?
    ''', (
        data.get('title', ''),
        data.get('excerpt', ''),
        data.get('body', ''),
        data.get('category', ''),
        data.get('source', ''),
        data.get('author', ''),
        data.get('image', ''),
        data.get('url', ''),
        data.get('date', ''),
        article_id
    ))
    db.commit()
    db.close()
    return jsonify({'message': 'Article updated'}), 200

# DELETE article
@app.route('/api/articles/<int:article_id>', methods=['DELETE'])
def delete_article(article_id):
    db = get_db()
    db.execute('DELETE FROM articles WHERE id = ?', (article_id,))
    db.commit()
    db.close()
    return jsonify({'message': 'Article deleted'}), 200

# GET all users
@app.route('/api/users', methods=['GET'])
def get_users():
    db    = get_db()
    users = db.execute('SELECT id, name, email, joined FROM users').fetchall()
    db.close()
    return jsonify([dict(u) for u in users])

# GET visitors
@app.route('/api/visitors', methods=['GET'])
def get_visitors():
    db       = get_db()
    visitors = db.execute(
        'SELECT ip, COUNT(*) as visits, MAX(visited_at) as last_seen FROM visitors GROUP BY ip ORDER BY visits DESC'
    ).fetchall()
    db.close()
    return jsonify([dict(v) for v in visitors])

# BREAKING NEWS — get current message
@app.route('/api/breaking', methods=['GET'])
def get_breaking():
    db  = get_db()
    row = db.execute('SELECT * FROM breaking_news ORDER BY id DESC LIMIT 1').fetchone()
    db.close()
    if row:
        return jsonify({'message': row['message'], 'active': bool(row['active']), 'pushed_at': row['pushed_at']})
    return jsonify({'message': '', 'active': False})

# BREAKING NEWS — push live
@app.route('/api/breaking', methods=['POST'])
def set_breaking():
    data    = request.get_json()
    message = data.get('message', '').strip()
    if not message:
        return jsonify({'error': 'Message is required'}), 400
    db = get_db()
    db.execute('DELETE FROM breaking_news')
    db.execute('INSERT INTO breaking_news (message, active, pushed_at) VALUES (?, 1, ?)', 
           (message, datetime.now(timezone.utc).isoformat()))
    db.commit()
    db.close()
    return jsonify({'message': 'Breaking news pushed live'}), 200

# BREAKING NEWS — clear
@app.route('/api/breaking', methods=['DELETE'])
def clear_breaking():
    db = get_db()
    db.execute('DELETE FROM breaking_news')
    db.commit()
    db.close()
    return jsonify({'message': 'Breaking news cleared'}), 200

if __name__ == '__main__':
    init_db()
    app.run(debug=True)