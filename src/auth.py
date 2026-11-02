from flask import Blueprint, request, jsonify, session, redirect, url_for, render_template
import os, sqlite3
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'users.db')

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute('''CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user'
    )''')
    conn.commit()
    conn.close()

init_db()

auth_bp = Blueprint('auth', __name__)

# --- JSON API Endpoints (For Firebase Frontend & Decoupled Clients) ---

@auth_bp.route('/api/auth/register', methods=['POST'])
def api_register():
    data = request.get_json(force=True, silent=True) or request.form
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required'}), 400
    if len(password) < 6:
        return jsonify({'success': False, 'error': 'Password must be at least 6 characters'}), 400

    conn = get_db()
    existing = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
    if existing:
        conn.close()
        return jsonify({'success': False, 'error': 'An account with this email already exists'}), 400

    conn.execute('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
                 (email, generate_password_hash(password), 'user'))
    conn.commit()
    user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
    conn.close()

    session['user_id'] = user['id']
    session['email'] = user['email']
    session['role'] = user['role']

    return jsonify({
        'success': True,
        'user': {'id': user['id'], 'email': user['email'], 'role': user['role']}
    }), 201

@auth_bp.route('/api/auth/login', methods=['POST'])
def api_login():
    data = request.get_json(force=True, silent=True) or request.form
    email = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '').strip()

    if not email or not password:
        return jsonify({'success': False, 'error': 'Email and password are required'}), 400

    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
    conn.close()

    if not user or not check_password_hash(user['password_hash'], password):
        return jsonify({'success': False, 'error': 'Invalid email or password'}), 401

    session['user_id'] = user['id']
    session['email'] = user['email']
    session['role'] = user['role']

    return jsonify({
        'success': True,
        'user': {'id': user['id'], 'email': user['email'], 'role': user['role']}
    })

@auth_bp.route('/api/auth/status', methods=['GET'])
def api_status():
    if session.get('email'):
        return jsonify({
            'authenticated': True,
            'user': {'email': session.get('email'), 'role': session.get('role', 'user')}
        })
    return jsonify({'authenticated': False})

@auth_bp.route('/api/auth/logout', methods=['POST', 'GET'])
def api_logout():
    session.clear()
    return jsonify({'success': True})

# --- Server-rendered Form Endpoints (For local monolithic usage) ---

@auth_bp.route('/auth', methods=['GET', 'POST'])
@auth_bp.route('/login', methods=['GET', 'POST'])
@auth_bp.route('/register', methods=['GET', 'POST'])
def auth_page():
    if request.method == 'GET' and session.get('email'):
        return redirect(url_for('home'))

    initial_tab = 'register' if request.path == '/register' else 'login'

    if request.method == 'GET':
        return render_template('auth.html', initial_tab=initial_tab)

    action = request.form.get('action')
    email = (request.form.get('email') or '').strip().lower()
    password = (request.form.get('password') or '').strip()

    if not email or not password:
        return render_template('auth.html', error='Email and password are required.', initial_tab=action or 'login')

    conn = get_db()
    if action == 'register':
        existing = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
        if existing:
            conn.close()
            return render_template('auth.html', error='An account with this email already exists. Please sign in.', initial_tab='login')
        conn.execute('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
                     (email, generate_password_hash(password), 'user'))
        conn.commit()
        user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
        conn.close()
        session['user_id'] = user['id']
        session['email'] = user['email']
        session['role'] = user['role']
        return redirect(url_for('home'))

    elif action == 'login':
        user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
        conn.close()
        if not user or not check_password_hash(user['password_hash'], password):
            return render_template('auth.html', error='Invalid email or password. Please try again.', initial_tab='login')
        session['user_id'] = user['id']
        session['email'] = user['email']
        session['role'] = user['role']
        return redirect(url_for('home'))
    else:
        conn.close()
        return render_template('auth.html', error='Invalid action.', initial_tab='login')

@auth_bp.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('auth.auth_page'))

def admin_required(f):
    from functools import wraps
    @wraps(f)
    def decorated(*args, **kwargs):
        if session.get('role') != 'admin':
            return jsonify({'success': False, 'error': 'Admin required'}), 403
        return f(*args, **kwargs)
    return decorated

def get_all_users():
    conn = get_db()
    users = conn.execute('SELECT id, email, role FROM users').fetchall()
    conn.close()
    return [dict(u) for u in users]

def find_user_by_email(email):
    conn = get_db()
    user = conn.execute('SELECT * FROM users WHERE email=?', (email,)).fetchone()
    conn.close()
    return dict(user) if user else None

def insert_user(email, password_hash, role):
    conn = get_db()
    conn.execute('INSERT INTO users (email, password_hash, role) VALUES (?, ?, ?)',
                 (email, password_hash, role))
    conn.commit()
    conn.close()
