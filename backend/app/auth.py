from flask import Blueprint, request
from flask_login import current_user, login_required, login_user, logout_user
from werkzeug.security import check_password_hash, generate_password_hash

from .models import User, db

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    if not email or not password:
        return {"error": "Email and password are required"}, 400
    if len(password) < 6:
        return {"error": "Password must be at least 6 characters"}, 400
    if User.query.filter_by(email=email).first():
        return {"error": "Email already registered"}, 409

    user = User(email=email, password_hash=generate_password_hash(password))
    db.session.add(user)
    db.session.commit()
    login_user(user)
    return {"id": user.id, "email": user.email}, 201


@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json()
    email = (data.get("email") or "").strip().lower()
    password = data.get("password") or ""

    user = User.query.filter_by(email=email).first()
    if not user or not check_password_hash(user.password_hash, password):
        return {"error": "Invalid email or password"}, 401

    login_user(user)
    return {"id": user.id, "email": user.email}, 200


@auth_bp.route("/logout", methods=["POST"])
@login_required
def logout():
    logout_user()
    return {"message": "Logged out"}, 200


@auth_bp.route("/me", methods=["GET"])
@login_required
def me():
    return {"id": current_user.id, "email": current_user.email}, 200
