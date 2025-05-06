/**
 * Charts.js - Handles chart generation for Aivora
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize charts on results page
    initializeFraudScoreGauge();
    initializeTimelineChart();
    initializeConfidenceChart();
});

/**
 * Initialize the fraud score gauge chart
 */
function initializeFraudScoreGauge() {
    const gaugeElement = document.getElementById('fraud-score-gauge');
    if (!gaugeElement) return;
    
    const fraudScore = parseFloat(gaugeElement.dataset.score || 0);
    
    // Create gauge chart
    const ctx = gaugeElement.getContext('2d');
    
    // Define gradient based on fraud score
    let gradientColors;
    if (fraudScore < 0.3) {
        // Green to yellow gradient for low scores
        gradientColors = ['#28a745', '#ffc107'];
    } else if (fraudScore < 0.7) {
        // Yellow to orange gradient for medium scores
        gradientColors = ['#ffc107', '#fd7e14'];
    } else {
        // Orange to red gradient for high scores
        gradientColors = ['#fd7e14', '#dc3545'];
    }
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 300);
    gradient.addColorStop(0, gradientColors[0]);
    gradient.addColorStop(1, gradientColors[1]);
    
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            datasets: [{
                data: [fraudScore, 1 - fraudScore],
                backgroundColor: [gradient, '#f2f2f2'],
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            cutout: '75%',
            circumference: 180,
            rotation: 270,
            plugins: {
                tooltip: {
                    enabled: false
                },
                legend: {
                    display: false
                }
            },
            animation: {
                animateRotate: true,
                animateScale: true
            }
        }
    });
    
    // Add center text
    const scorePercentage = Math.round(fraudScore * 100);
    const scoreTextElement = document.querySelector('.fraud-score-text');
    if (scoreTextElement) {
        scoreTextElement.textContent = scorePercentage + '%';
    }
    
    // Set score indicator class based on value
    const scoreIndicator = document.querySelector('.fraud-score-indicator');
    if (scoreIndicator) {
        if (fraudScore < 0.3) {
            scoreIndicator.textContent = 'Low Risk';
            scoreIndicator.className = 'fraud-score-indicator text-success';
        } else if (fraudScore < 0.7) {
            scoreIndicator.textContent = 'Medium Risk';
            scoreIndicator.className = 'fraud-score-indicator text-warning';
        } else {
            scoreIndicator.textContent = 'High Risk';
            scoreIndicator.className = 'fraud-score-indicator text-danger';
        }
    }
}

/**
 * Initialize the timeline chart
 */
function initializeTimelineChart() {
    const timelineChartElement = document.getElementById('timeline-chart');
    if (!timelineChartElement) return;
    
    // Get timeline data from the element's data attribute
    let timelineData;
    try {
        timelineData = JSON.parse(timelineChartElement.dataset.timeline || '[]');
    } catch (e) {
        console.error('Error parsing timeline data:', e);
        timelineData = [];
    }
    
    if (timelineData.length === 0) return;
    
    // Prepare data for chart
    const labels = timelineData.map(item => item.timestamp_formatted);
    const confidenceData = timelineData.map(item => item.confidence * 100);
    
    // Create colors array based on severity
    const colors = timelineData.map(item => {
        switch (item.severity) {
            case 'low': return 'rgba(255, 193, 7, 0.7)';
            case 'medium': return 'rgba(253, 126, 20, 0.7)';
            case 'high': return 'rgba(220, 53, 69, 0.7)';
            default: return 'rgba(108, 117, 125, 0.7)';
        }
    });
    
    // Create chart
    const ctx = timelineChartElement.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Confidence (%)',
                data: confidenceData,
                backgroundColor: colors,
                borderColor: colors.map(color => color.replace('0.7', '1')),
                borderWidth: 1,
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    title: {
                        display: true,
                        text: 'Timestamp'
                    }
                },
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Confidence (%)'
                    }
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    callbacks: {
                        afterLabel: function(context) {
                            const index = context.dataIndex;
                            return 'Description: ' + timelineData[index].description;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Initialize the confidence distribution chart
 */
function initializeConfidenceChart() {
    const confidenceChartElement = document.getElementById('confidence-chart');
    if (!confidenceChartElement) return;
    
    const confidence = parseFloat(confidenceChartElement.dataset.confidence || 0);
    const fraudScore = parseFloat(confidenceChartElement.dataset.score || 0);
    
    // Prepare data
    const data = {
        labels: ['Low Confidence', 'Medium Confidence', 'High Confidence'],
        datasets: [{
            data: [
                confidence < 0.3 ? 100 : 0, 
                confidence >= 0.3 && confidence < 0.7 ? 100 : 0, 
                confidence >= 0.7 ? 100 : 0
            ],
            backgroundColor: [
                'rgba(108, 117, 125, 0.5)',
                'rgba(255, 193, 7, 0.5)',
                'rgba(40, 167, 69, 0.5)'
            ],
            borderColor: [
                'rgba(108, 117, 125, 1)',
                'rgba(255, 193, 7, 1)',
                'rgba(40, 167, 69, 1)'
            ],
            borderWidth: 1
        }]
    };
    
    // Create chart
    const ctx = confidenceChartElement.getContext('2d');
    new Chart(ctx, {
        type: 'pie',
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            return `Confidence: ${Math.round(confidence * 100)}%`;
                        }
                    }
                }
            }
        }
    });
}

/**
 * Create history analysis chart
 */
function createHistoryChart(elementId, analysesData) {
    const historyChartElement = document.getElementById(elementId);
    if (!historyChartElement || !analysesData || analysesData.length === 0) return;
    
    // Prepare data for chart - last 10 analyses
    const recentAnalyses = analysesData.slice(0, 10).reverse();
    const labels = recentAnalyses.map(analysis => {
        // Format date as MM/DD
        const date = new Date(analysis.created_at);
        return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    
    const scores = recentAnalyses.map(analysis => analysis.fraud_score * 100);
    
    // Create chart
    const ctx = historyChartElement.getContext('2d');
    new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Fraud Score (%)',
                data: scores,
                backgroundColor: 'rgba(138, 43, 226, 0.2)',
                borderColor: '#8a2be2',
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#8a2be2',
                pointRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    max: 100,
                    title: {
                        display: true,
                        text: 'Fraud Score (%)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Date'
                    }
                }
            }
        }
    });
}

/**
 * Format date for display
 */
function formatDate(dateString) {
    if (!dateString) return 'N/A';
    
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}
