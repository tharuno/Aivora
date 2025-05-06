// Main JavaScript file for Aivora

document.addEventListener('DOMContentLoaded', function() {
    console.log('Aivora application initialized');
    
    // Initialize tooltips
    const tooltipTriggerList = document.querySelectorAll('[data-bs-toggle="tooltip"]');
    if (tooltipTriggerList.length > 0) {
        const tooltipList = [...tooltipTriggerList].map(tooltipTriggerEl => new bootstrap.Tooltip(tooltipTriggerEl));
    }
    
    // Initialize popovers
    const popoverTriggerList = document.querySelectorAll('[data-bs-toggle="popover"]');
    if (popoverTriggerList.length > 0) {
        const popoverList = [...popoverTriggerList].map(popoverTriggerEl => new bootstrap.Popover(popoverTriggerEl));
    }
    
    // Form validation
    const forms = document.querySelectorAll('.needs-validation');
    
    if (forms.length > 0) {
        Array.from(forms).forEach(form => {
            form.addEventListener('submit', event => {
                if (!form.checkValidity()) {
                    event.preventDefault();
                    event.stopPropagation();
                }
                form.classList.add('was-validated');
            }, false);
        });
    }
    
    // Analysis polling mechanism
    const analysingContainer = document.querySelector('#analysing-container');
    if (analysingContainer) {
        const analysisId = analysingContainer.dataset.analysisId;
        if (analysisId) {
            pollAnalysisStatus(analysisId);
        }
    }

    // URL validation in the submit form
    const videoUrlInput = document.querySelector('#video_url');
    if (videoUrlInput) {
        videoUrlInput.addEventListener('input', validateVideoUrl);
    }
});

/**
 * Function to poll the server for analysis status
 */
function pollAnalysisStatus(analysisId) {
    const statusElement = document.querySelector('#analysis-status');
    const progressBarElement = document.querySelector('#analysis-progress-bar');
    
    let progress = 0;
    const progressIncrement = 5;
    const pollInterval = 2000; // 2 seconds
    
    // Update progress bar animation
    const progressTimer = setInterval(() => {
        if (progress < 90) {
            progress += progressIncrement;
            if (progressBarElement) {
                progressBarElement.style.width = progress + '%';
                progressBarElement.setAttribute('aria-valuenow', progress);
            }
        }
    }, 3000);
    
    // Poll the server for status
    const statusTimer = setInterval(() => {
        fetch(`/check_status/${analysisId}`)
            .then(response => response.json())
            .then(data => {
                if (data.status) {
                    if (statusElement) {
                        statusElement.textContent = capitalizeFirstLetter(data.status);
                    }
                    
                    // If complete or failed, redirect to results page
                    if (data.status === 'completed' || data.status === 'failed') {
                        clearInterval(progressTimer);
                        clearInterval(statusTimer);
                        
                        if (progressBarElement) {
                            progressBarElement.style.width = '100%';
                            progressBarElement.setAttribute('aria-valuenow', 100);
                        }
                        
                        // Add small delay before redirecting to show 100% progress
                        setTimeout(() => {
                            if (data.redirect) {
                                window.location.href = data.redirect;
                            }
                        }, 500);
                    }
                }
            })
            .catch(error => {
                console.error('Error checking analysis status:', error);
                if (statusElement) {
                    statusElement.textContent = 'Error checking status';
                }
            });
    }, pollInterval);
}

/**
 * Function to validate video URL input
 */
function validateVideoUrl() {
    const videoUrlInput = document.querySelector('#video_url');
    const submitButton = document.querySelector('#submit-btn');
    
    if (!videoUrlInput || !submitButton) return;
    
    const url = videoUrlInput.value.trim();
    const urlPattern = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be|vimeo\.com|facebook\.com|fb\.com|instagram\.com)\/.*$/i;
    
    if (url && urlPattern.test(url)) {
        videoUrlInput.classList.remove('is-invalid');
        videoUrlInput.classList.add('is-valid');
        submitButton.disabled = false;
    } else if (url) {
        videoUrlInput.classList.remove('is-valid');
        videoUrlInput.classList.add('is-invalid');
        submitButton.disabled = true;
    } else {
        videoUrlInput.classList.remove('is-valid');
        videoUrlInput.classList.remove('is-invalid');
        submitButton.disabled = false;
    }
}

/**
 * Helper function to capitalize the first letter of a string
 */
function capitalizeFirstLetter(string) {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
}

/**
 * Copy text to clipboard
 */
function copyToClipboard(text) {
    // Create a temporary input element
    const tempInput = document.createElement('input');
    tempInput.value = text;
    document.body.appendChild(tempInput);
    
    // Select and copy the text
    tempInput.select();
    document.execCommand('copy');
    
    // Remove the temporary element
    document.body.removeChild(tempInput);
    
    // Show toast or notification
    showToast('Copied to clipboard!');
}

/**
 * Show a toast notification
 */
function showToast(message) {
    // Create toast container if it doesn't exist
    let toastContainer = document.querySelector('.toast-container');
    
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed bottom-0 end-0 p-3';
        document.body.appendChild(toastContainer);
    }
    
    // Create the toast element
    const toastId = 'toast-' + Date.now();
    const toastHtml = `
        <div id="${toastId}" class="toast" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-header">
                <strong class="me-auto">Aivora</strong>
                <button type="button" class="btn-close" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    toastContainer.insertAdjacentHTML('beforeend', toastHtml);
    
    // Initialize and show the toast
    const toastElement = document.getElementById(toastId);
    const toast = new bootstrap.Toast(toastElement, { delay: 3000 });
    toast.show();
    
    // Remove toast after it's hidden
    toastElement.addEventListener('hidden.bs.toast', function() {
        toastElement.remove();
    });
}
