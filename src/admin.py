from flask import Blueprint, jsonify
from src.auth import admin_required, get_all_users

admin_bp = Blueprint('admin', __name__)

@admin_bp.route('/admin/users')
@admin_required
def list_users():
    all_users = get_all_users()
    return jsonify({'users': all_users})
