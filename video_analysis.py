import os
import json
import logging
from datetime import datetime
import threading
import re
from urllib.parse import urlparse

from flask import Blueprint, render_template, redirect, url_for, flash, request, jsonify, send_file, make_response
from pdf_generator import generate_analysis_pdf
from flask_login import login_required, current_user
from flask_wtf import FlaskForm
from wtforms import StringField, SubmitField
from wtforms.validators import DataRequired, URL

from app import db
from models import VideoAnalysis
from gemini_client import GeminiClient

logger = logging.getLogger(__name__)

video_bp = Blueprint('video_bp', __name__)
gemini_client = GeminiClient()

class VideoURLForm(FlaskForm):
    video_url = StringField('Video URL', validators=[DataRequired(), URL()])
    submit = SubmitField('Analyze Video')
    
    def validate_video_url(self, video_url):
        # Check if URL is from a supported platform (YouTube, Vimeo, etc.)
        parsed_url = urlparse(video_url.data)
        
        supported_domains = [
            'youtube.com', 'youtu.be', 'vimeo.com', 
            'facebook.com', 'fb.com', 'instagram.com'
        ]
        
        domain = parsed_url.netloc.lower()
        if not any(supported in domain for supported in supported_domains):
            raise ValueError('Only YouTube, Vimeo, Facebook, and Instagram videos are supported.')

def extract_video_metadata(video_url):
    """
    Mock function to extract video metadata.
    In a real implementation, this would use libraries like pytube or yt-dlp.
    """
    # This is just a placeholder for now
    # In a real implementation, we would use pytube or yt-dlp to get this information
    metadata = {
        'title': 'Video Title',
        'video_format': 'MP4',
        'subscribers': 10000,
        'views': 50000,
        'published_date': datetime.now()
    }
    return metadata

def analyze_video(analysis_id):
    """
    Function that runs in a separate thread to analyze a video
    """
    # Import app here to avoid circular imports
    from app import app
    
    # Use application context in the thread
    with app.app_context():
        try:
            # Get the analysis record
            analysis = VideoAnalysis.query.get(analysis_id)
            if not analysis:
                logger.error(f"Analysis with ID {analysis_id} not found")
                return
            
            # Update status to processing
            analysis.status = 'processing'
            db.session.commit()
            
            try:
                # Extract video metadata (in a real implementation)
                metadata = extract_video_metadata(analysis.video_url)
                analysis.title = metadata.get('title')
                analysis.video_format = metadata.get('video_format')
                analysis.subscribers = metadata.get('subscribers')
                analysis.views = metadata.get('views')
                analysis.published_date = metadata.get('published_date')
                db.session.commit()
            except Exception as e:
                logger.error(f"Error extracting metadata: {str(e)}")
                # Continue analysis even if metadata extraction fails
            
            # Call Gemini API for fraud detection
            result = gemini_client.analyze_video(analysis.video_url)
            
            # Update analysis with results
            analysis.fraud_score = result.get('fraud_score', 0.0)
            analysis.confidence = result.get('confidence', 0.0)
            analysis.summary = result.get('summary', 'No summary available')
            analysis.set_timeline_analysis(result.get('timeline_analysis', []))
            analysis.status = 'completed'
            analysis.completed_at = datetime.utcnow()
            
            db.session.commit()
            logger.info(f"Analysis for video {analysis.id} completed successfully")
        except Exception as e:
            logger.error(f"Error in analysis thread: {str(e)}")
            try:
                # Get the analysis record again in case it wasn't defined in the outer try block
                if 'analysis' not in locals() or analysis is None:
                    analysis = VideoAnalysis.query.get(analysis_id)
                if analysis:
                    analysis.status = 'failed'
                    analysis.summary = f"Analysis failed: {str(e)}"
                    db.session.commit()
            except Exception as ex:
                logger.error(f"Failed to update analysis status to failed: {str(ex)}")

@video_bp.route('/')
def index():
    if current_user.is_authenticated:
        return redirect(url_for('video_bp.dashboard'))
    return redirect(url_for('auth.login'))

@video_bp.route('/dashboard', methods=['GET', 'POST'])
@login_required
def dashboard():
    form = VideoURLForm()
    
    if form.validate_on_submit():
        try:
            # Create a new analysis record
            analysis = VideoAnalysis(
                user_id=current_user.id,
                video_url=form.video_url.data,
                status='pending'
            )
            
            db.session.add(analysis)
            db.session.commit()
            
            # Redirect to the analyzing page
            return redirect(url_for('video_bp.analyzing', analysis_id=analysis.id))
            
        except Exception as e:
            db.session.rollback()
            logger.error(f"Error creating analysis: {str(e)}")
            flash('An error occurred while submitting the video. Please try again.', 'danger')
    
    # Get recent analyses for this user
    recent_analyses = VideoAnalysis.query.filter_by(user_id=current_user.id).order_by(
        VideoAnalysis.created_at.desc()).limit(5).all()
    
    return render_template('dashboard.html', 
                           title='Dashboard', 
                           form=form, 
                           recent_analyses=recent_analyses)

@video_bp.route('/analyzing/<int:analysis_id>')
@login_required
def analyzing(analysis_id):
    analysis = VideoAnalysis.query.get_or_404(analysis_id)
    
    # Security check - ensure user can only access their own analyses
    if analysis.user_id != current_user.id:
        flash('You do not have permission to view this analysis', 'danger')
        return redirect(url_for('video_bp.dashboard'))
    
    # If analysis is still pending, start it
    if analysis.status == 'pending':
        # Start the analysis in a separate thread
        analysis_thread = threading.Thread(
            target=analyze_video,
            args=(analysis_id,)
        )
        analysis_thread.daemon = True
        analysis_thread.start()
    
    # If analysis is complete or failed, redirect to results
    if analysis.status in ['completed', 'failed']:
        return redirect(url_for('video_bp.results', analysis_id=analysis_id))
    
    return render_template('analyzing.html', 
                           title='Analyzing Video', 
                           analysis=analysis)

@video_bp.route('/check_status/<int:analysis_id>')
@login_required
def check_status(analysis_id):
    """API endpoint to check analysis status for AJAX polling"""
    analysis = VideoAnalysis.query.get_or_404(analysis_id)
    
    # Security check
    if analysis.user_id != current_user.id:
        return jsonify({'error': 'Unauthorized'}), 403
    
    return jsonify({
        'status': analysis.status,
        'redirect': url_for('video_bp.results', analysis_id=analysis_id) 
            if analysis.status in ['completed', 'failed'] else None
    })

@video_bp.route('/results/<int:analysis_id>')
@login_required
def results(analysis_id):
    analysis = VideoAnalysis.query.get_or_404(analysis_id)
    
    # Security check
    if analysis.user_id != current_user.id:
        flash('You do not have permission to view this analysis', 'danger')
        return redirect(url_for('video_bp.dashboard'))
    
    # If analysis is still pending or processing, redirect to analyzing page
    if analysis.status in ['pending', 'processing']:
        return redirect(url_for('video_bp.analyzing', analysis_id=analysis_id))
    
    return render_template('results.html', 
                           title='Analysis Results', 
                           analysis=analysis)

@video_bp.route('/history')
@login_required
def history():
    # Get all analyses for this user, ordered by most recent first
    analyses = VideoAnalysis.query.filter_by(user_id=current_user.id).order_by(
        VideoAnalysis.created_at.desc()).all()
    
    return render_template('history.html', 
                           title='Analysis History', 
                           analyses=analyses)

@video_bp.route('/download-report/<int:analysis_id>')
@login_required
def download_report(analysis_id):
    """Generate and download a PDF report for a specific analysis"""
    analysis = VideoAnalysis.query.get_or_404(analysis_id)
    
    # Security check - ensure user can only access their own analyses
    if analysis.user_id != current_user.id:
        flash('You do not have permission to download this analysis', 'danger')
        return redirect(url_for('video_bp.dashboard'))
    
    # Check if analysis is completed
    if analysis.status != 'completed':
        flash('Report can only be downloaded for completed analyses', 'warning')
        return redirect(url_for('video_bp.results', analysis_id=analysis_id))
    
    # Generate PDF report
    try:
        pdf_data = generate_analysis_pdf(analysis)
        
        # Prepare response with PDF attachment
        response = make_response(pdf_data)
        response.headers['Content-Type'] = 'application/pdf'
        filename = f"aivora-report-{analysis_id}.pdf"
        response.headers['Content-Disposition'] = f'attachment; filename="{filename}"'
        
        return response
    
    except Exception as e:
        logger.error(f"Error generating PDF: {str(e)}")
        flash('An error occurred while generating the PDF report. Please try again.', 'danger')
        return redirect(url_for('video_bp.results', analysis_id=analysis_id))
