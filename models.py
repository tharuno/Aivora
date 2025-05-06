from datetime import datetime
from app import db
from flask_login import UserMixin
from werkzeug.security import generate_password_hash, check_password_hash
import json

class User(UserMixin, db.Model):
    __tablename__ = 'users'
    
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(64), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(256), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    analyses = db.relationship('VideoAnalysis', backref='user', lazy='dynamic')
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
        
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)
    
    def __repr__(self):
        return f'<User {self.username}>'

class VideoAnalysis(db.Model):
    __tablename__ = 'video_analyses'
    
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    video_url = db.Column(db.String(512), nullable=False)
    title = db.Column(db.String(256))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    completed_at = db.Column(db.DateTime)
    status = db.Column(db.String(32), default='pending')  # pending, processing, completed, failed
    
    # Video metadata
    video_format = db.Column(db.String(32))
    subscribers = db.Column(db.Integer)
    views = db.Column(db.Integer)
    published_date = db.Column(db.DateTime)
    
    # Analysis results
    fraud_score = db.Column(db.Float)
    confidence = db.Column(db.Float)
    summary = db.Column(db.Text)
    timeline_analysis = db.Column(db.Text)  # JSON string of timeline markers
    
    def get_timeline_analysis(self):
        """Return the timeline analysis as a Python object"""
        if self.timeline_analysis:
            try:
                return json.loads(self.timeline_analysis)
            except json.JSONDecodeError:
                return []
        return []
    
    def set_timeline_analysis(self, data):
        """Store timeline analysis as a JSON string"""
        self.timeline_analysis = json.dumps(data)
    
    def to_dict(self):
        """Return the video analysis as a dictionary for API responses"""
        return {
            'id': self.id,
            'video_url': self.video_url,
            'title': self.title,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'completed_at': self.completed_at.isoformat() if self.completed_at else None,
            'status': self.status,
            'video_format': self.video_format,
            'subscribers': self.subscribers,
            'views': self.views,
            'published_date': self.published_date.isoformat() if self.published_date else None,
            'fraud_score': self.fraud_score,
            'confidence': self.confidence,
            'summary': self.summary,
            'timeline_analysis': self.get_timeline_analysis()
        }
    
    def __repr__(self):
        return f'<VideoAnalysis {self.id} {self.status}>'
