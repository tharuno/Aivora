import io
import os
from datetime import datetime
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
from reportlab.graphics.shapes import Drawing, Line
from reportlab.graphics.charts.piecharts import Pie
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.widgets.markers import makeMarker

def generate_analysis_pdf(analysis):
    """
    Generate a structured PDF report for a video analysis
    """
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=letter)
    styles = getSampleStyleSheet()
    story = []
    
    # Add custom styles
    # Check if styles already exist before adding them
    custom_title_style = styles.get('CustomTitle', None)
    if not custom_title_style:
        styles.add(ParagraphStyle(
            name='CustomTitle', 
            fontName='Helvetica-Bold', 
            fontSize=18, 
            alignment=1,
            spaceAfter=12
        ))
    
    custom_heading_style = styles.get('CustomHeading2', None)
    if not custom_heading_style:
        styles.add(ParagraphStyle(
            name='CustomHeading2', 
            fontName='Helvetica-Bold', 
            fontSize=14, 
            spaceBefore=12,
            spaceAfter=6
        ))
    
    custom_normal_style = styles.get('CustomNormal', None)
    if not custom_normal_style:
        styles.add(ParagraphStyle(
            name='CustomNormal', 
            fontName='Helvetica', 
            fontSize=10, 
            spaceBefore=6,
            spaceAfter=6
        ))
    
    # Add title
    story.append(Paragraph("Aivora Fraud Detection Analysis", styles["CustomTitle"] if "CustomTitle" in styles else styles["Title"]))
    story.append(Spacer(1, 0.25*inch))
    
    # Add date
    current_date = datetime.now().strftime("%Y-%m-%d %H:%M")
    story.append(Paragraph(f"Report Generated: {current_date}", styles["CustomNormal"] if "CustomNormal" in styles else styles["Normal"]))
    story.append(Spacer(1, 0.25*inch))
    
    # Video information
    story.append(Paragraph("Video Information", styles["CustomHeading2"] if "CustomHeading2" in styles else styles["Heading2"]))
    
    video_data = [
        ["URL", analysis.video_url],
        ["Format", analysis.video_format or "N/A"],
        ["Subscribers", f"{analysis.subscribers:,}" if analysis.subscribers else "N/A"],
        ["Views", f"{analysis.views:,}" if analysis.views else "N/A"],
        ["Published Date", analysis.published_date.strftime("%Y-%m-%d") if analysis.published_date else "N/A"],
        ["Analysis Date", analysis.created_at.strftime("%Y-%m-%d %H:%M")]
    ]
    
    video_table = Table(video_data, colWidths=[1.5*inch, 4.5*inch])
    video_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
        ('TEXTCOLOR', (0, 0), (0, -1), colors.black),
        ('ALIGN', (0, 0), (0, -1), 'LEFT'),
        ('FONTNAME', (0, 0), (0, -1), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, -1), 10),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 6),
        ('TOPPADDING', (0, 0), (-1, -1), 6),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey)
    ]))
    story.append(video_table)
    story.append(Spacer(1, 0.25*inch))
    
    # Analysis Results
    story.append(Paragraph("Fraud Detection Results", styles["CustomHeading2"] if "CustomHeading2" in styles else styles["Heading2"]))
    
    fraud_score = int(analysis.fraud_score * 100)
    confidence = int(analysis.confidence * 100)
    
    # Add fraud score and confidence percentage text
    score_text = f"Fraud Score: {fraud_score}%"
    conf_text = f"Confidence: {confidence}%"
    
    # Risk level
    if analysis.fraud_score < 0.3:
        risk_level = "Low Risk"
    elif analysis.fraud_score < 0.7:
        risk_level = "Medium Risk"
    else:
        risk_level = "High Risk"
    
    risk_text = f"Risk Level: {risk_level}"
    
    normal_style = styles["CustomNormal"] if "CustomNormal" in styles else styles["Normal"]
    story.append(Paragraph(score_text, normal_style))
    story.append(Paragraph(conf_text, normal_style))
    story.append(Paragraph(risk_text, normal_style))
    story.append(Spacer(1, 0.25*inch))
    
    # Summary
    story.append(Paragraph("Analysis Summary", styles["CustomHeading2"] if "CustomHeading2" in styles else styles["Heading2"]))
    story.append(Paragraph(analysis.summary, normal_style))
    story.append(Spacer(1, 0.25*inch))
    
    # Recommendations
    story.append(Paragraph("Recommendations", styles["CustomHeading2"] if "CustomHeading2" in styles else styles["Heading2"]))
    
    if analysis.fraud_score < 0.3:
        recommendations = [
            "Content appears legitimate with low risk of deception",
            "Continue normal engagement with this content",
            "Standard caution is appropriate"
        ]
    elif analysis.fraud_score < 0.7:
        recommendations = [
            "Approach this content with caution",
            "Verify claims through secondary sources",
            "Pay attention to the specific markers in the timeline"
        ]
    else:
        recommendations = [
            "High probability of deceptive content",
            "Not recommended for informational purposes",
            "Seek verified alternative sources"
        ]
    
    for rec in recommendations:
        story.append(Paragraph(f"• {rec}", normal_style))
    
    story.append(Spacer(1, 0.25*inch))
    
    # Timeline Analysis
    story.append(Paragraph("Timeline Analysis", styles["CustomHeading2"] if "CustomHeading2" in styles else styles["Heading2"]))
    
    timeline_events = analysis.get_timeline_analysis()
    if timeline_events:
        for i, event in enumerate(timeline_events):
            story.append(Paragraph(
                f"<b>Event {i+1}:</b> {event.get('timestamp_formatted', 'N/A')} - "
                f"Severity: {event.get('severity', 'N/A').capitalize()}", 
                normal_style
            ))
            story.append(Paragraph(event.get('description', 'No description'), normal_style))
            story.append(Paragraph(f"Confidence: {int(event.get('confidence', 0) * 100)}%", normal_style))
            if i < len(timeline_events) - 1:
                story.append(Spacer(1, 0.1*inch))
    else:
        story.append(Paragraph("No timeline events detected. No specific fraudulent patterns were identified at particular timestamps.", normal_style))
    
    # Build the PDF
    doc.build(story)
    buffer.seek(0)
    return buffer.getvalue()
