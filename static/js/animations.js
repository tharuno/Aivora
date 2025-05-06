/**
 * Animations.js - Handles animations for Aivora using GSAP
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize animations
    initPageTransitions();
    initLoadingAnimations();
    initElementAnimations();
});

/**
 * Initialize page transition animations
 */
function initPageTransitions() {
    // Fade in the page content
    gsap.from('.main-container', {
        opacity: 0,
        y: 20,
        duration: 0.6,
        ease: 'power2.out'
    });
    
    // Stagger the card animations
    gsap.from('.card', {
        opacity: 0,
        y: 30,
        duration: 0.8,
        stagger: 0.15,
        ease: 'back.out(1.7)',
        delay: 0.2
    });
}

/**
 * Initialize loading animations
 */
function initLoadingAnimations() {
    // Pulse animation for the loading spinner
    gsap.to('.loading-spinner', {
        scale: 1.2,
        duration: 0.8,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
    });
    
    // Analyzing animation
    const analyzingText = document.querySelector('.analyzing-text');
    if (analyzingText) {
        // Dots animation
        const dotsElement = document.createElement('span');
        dotsElement.className = 'dots';
        analyzingText.appendChild(dotsElement);
        
        // Animate the dots
        let dots = 0;
        setInterval(() => {
            dots = (dots + 1) % 4;
            dotsElement.textContent = '.'.repeat(dots);
        }, 500);
    }
}

/**
 * Initialize element animations
 */
function initElementAnimations() {
    // Button hover animations
    document.querySelectorAll('.btn-primary, .btn-secondary').forEach(button => {
        button.addEventListener('mouseenter', () => {
            gsap.to(button, {
                scale: 1.05,
                duration: 0.2
            });
        });
        
        button.addEventListener('mouseleave', () => {
            gsap.to(button, {
                scale: 1,
                duration: 0.2
            });
        });
    });
    
    // Animate elements when they come into view
    if (typeof IntersectionObserver !== 'undefined') {
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    animateElement(entry.target);
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.1 });
        
        document.querySelectorAll('.animate-on-scroll').forEach(element => {
            observer.observe(element);
        });
    } else {
        // Fallback for browsers that don't support IntersectionObserver
        document.querySelectorAll('.animate-on-scroll').forEach(element => {
            animateElement(element);
        });
    }
}

/**
 * Animate an element based on its data-animation attribute
 */
function animateElement(element) {
    const animation = element.dataset.animation || 'fadeIn';
    
    switch (animation) {
        case 'fadeIn':
            gsap.from(element, {
                opacity: 0,
                duration: 0.8,
                ease: 'power2.out'
            });
            break;
        case 'slideUp':
            gsap.from(element, {
                opacity: 0,
                y: 30,
                duration: 0.8,
                ease: 'back.out(1.7)'
            });
            break;
        case 'slideIn':
            gsap.from(element, {
                opacity: 0,
                x: -30,
                duration: 0.8,
                ease: 'power2.out'
            });
            break;
        case 'zoomIn':
            gsap.from(element, {
                opacity: 0,
                scale: 0.8,
                duration: 0.8,
                ease: 'back.out(1.7)'
            });
            break;
    }
}

/**
 * Create pulsing animation for analysis cards
 */
function pulseElement(selector) {
    gsap.to(selector, {
        boxShadow: '0 10px 25px rgba(138, 43, 226, 0.4)',
        scale: 1.02,
        duration: 1,
        repeat: -1,
        yoyo: true,
        ease: 'power1.inOut'
    });
}

/**
 * Create wave animation for loading
 */
function createWaveAnimation(container) {
    if (!container) return;
    
    // Create wave container
    const waveContainer = document.createElement('div');
    waveContainer.className = 'wave-container';
    waveContainer.style.position = 'relative';
    waveContainer.style.width = '100%';
    waveContainer.style.height = '100px';
    waveContainer.style.overflow = 'hidden';
    container.appendChild(waveContainer);
    
    // Create 3 waves
    for (let i = 1; i <= 3; i++) {
        const wave = document.createElement('div');
        wave.className = `wave wave-${i}`;
        wave.style.position = 'absolute';
        wave.style.bottom = '0';
        wave.style.left = '0';
        wave.style.width = '200%';
        wave.style.height = '100%';
        wave.style.backgroundImage = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1440 320'%3E%3Cpath fill='rgba(138, 43, 226, ${0.1 * i})' d='M0,192L48,186.7C96,181,192,171,288,165.3C384,160,480,160,576,176C672,192,768,224,864,224C960,224,1056,192,1152,176C1248,160,1344,160,1392,160L1440,160L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z'%3E%3C/path%3E%3C/svg%3E")`;
        wave.style.backgroundRepeat = 'repeat-x';
        wave.style.backgroundSize = '1440px 100px';
        waveContainer.appendChild(wave);
        
        // Animate the wave
        gsap.to(wave, {
            x: '-50%',
            duration: 8 + (i * 2),
            repeat: -1,
            ease: 'linear'
        });
    }
}
