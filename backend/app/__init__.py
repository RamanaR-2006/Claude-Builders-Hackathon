import os

from flask import Flask
from flask_cors import CORS
from flask_login import LoginManager

from .config import Config
from .models import User, db


def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["THUMBNAIL_FOLDER"], exist_ok=True)

    db.init_app(app)

    CORS(app, supports_credentials=True, origins=["http://localhost:5173"])

    login_manager = LoginManager()
    login_manager.init_app(app)

    @login_manager.user_loader
    def load_user(user_id):
        return db.session.get(User, int(user_id))

    @login_manager.unauthorized_handler
    def unauthorized():
        return {"error": "Authentication required"}, 401

    from .auth import auth_bp
    from .autolink import autolink_bp
    from .canvas import canvas_bp
    from .chat import chat_bp
    from .documents import documents_bp

    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(documents_bp, url_prefix="/api/documents")
    app.register_blueprint(canvas_bp, url_prefix="/api")
    app.register_blueprint(autolink_bp, url_prefix="/api")
    app.register_blueprint(chat_bp, url_prefix="/api")

    with app.app_context():
        db.create_all()
        _migrate_db()

    return app


def _migrate_db():
    """Add any missing columns to existing tables without dropping data."""
    from sqlalchemy import inspect, text
    inspector = inspect(db.engine)
    cols = {c["name"] for c in inspector.get_columns("documents")}
    migrations = []
    if "transcription" not in cols:
        migrations.append("ALTER TABLE documents ADD COLUMN transcription TEXT")
    if "transcription_status" not in cols:
        migrations.append("ALTER TABLE documents ADD COLUMN transcription_status VARCHAR(20) DEFAULT 'na'")
    for stmt in migrations:
        db.session.execute(text(stmt))
    if migrations:
        db.session.commit()
