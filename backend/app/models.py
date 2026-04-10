from datetime import datetime, timezone

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()


class User(UserMixin, db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))

    documents = db.relationship("Document", backref="owner", lazy=True, cascade="all, delete-orphan")
    connections = db.relationship("Connection", backref="owner", lazy=True, cascade="all, delete-orphan")


class Document(db.Model):
    __tablename__ = "documents"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    filename = db.Column(db.String(255), nullable=False)
    original_name = db.Column(db.String(255), nullable=False)
    file_type = db.Column(db.String(50), nullable=False)  # pdf, audio, video
    thumbnail_path = db.Column(db.String(255), nullable=True)
    uploaded_at = db.Column(db.DateTime, default=lambda: datetime.now(timezone.utc))
    position_x = db.Column(db.Float, default=100.0)
    position_y = db.Column(db.Float, default=100.0)
    is_locked = db.Column(db.Boolean, default=False)

    def to_dict(self):
        return {
            "id": self.id,
            "original_name": self.original_name,
            "file_type": self.file_type,
            "has_thumbnail": self.thumbnail_path is not None,
            "uploaded_at": self.uploaded_at.isoformat() if self.uploaded_at else None,
            "position_x": self.position_x,
            "position_y": self.position_y,
            "is_locked": self.is_locked,
        }


class Connection(db.Model):
    __tablename__ = "connections"

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    source_doc_id = db.Column(db.Integer, db.ForeignKey("documents.id"), nullable=False)
    target_doc_id = db.Column(db.Integer, db.ForeignKey("documents.id"), nullable=False)
    description = db.Column(db.Text, default="")

    source_doc = db.relationship("Document", foreign_keys=[source_doc_id])
    target_doc = db.relationship("Document", foreign_keys=[target_doc_id])

    def to_dict(self):
        return {
            "id": self.id,
            "source_doc_id": self.source_doc_id,
            "target_doc_id": self.target_doc_id,
            "description": self.description,
        }
