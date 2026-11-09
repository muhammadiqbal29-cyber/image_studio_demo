/**
 * OUR FASHION GARDEN - MAIN SCRIPT
 * Interactive controls for testimonials slider, navigation, search, and newsletter.
 */

document.addEventListener('DOMContentLoaded', () => {
  initTestimonialSlider();
  initSearchOverlay();
  initMobileMenu();
  initScrollTop();
});

/**
 * 1. Testimonial Slider Controls
 */
function initTestimonialSlider() {
  const slides = document.querySelectorAll('.testimonial-card');
  const dots = document.querySelectorAll('#testimonialDots .dot');
  if (slides.length === 0 || dots.length === 0) return;

  let currentSlide = 0;
  let autoSlideTimer;

  function showSlide(index) {
    slides.forEach((slide, i) => {
      slide.classList.toggle('active', i === index);
    });
    dots.forEach((dot, i) => {
      dot.classList.toggle('active', i === index);
    });
    currentSlide = index;
  }

  function nextSlide() {
    const next = (currentSlide + 1) % slides.length;
    showSlide(next);
  }

  function startAutoSlide() {
    clearInterval(autoSlideTimer);
    autoSlideTimer = setInterval(nextSlide, 7000);
  }

  // Dot click events
  dots.forEach(dot => {
    dot.addEventListener('click', (e) => {
      const targetIndex = parseInt(e.target.getAttribute('data-slide'), 10);
      showSlide(targetIndex);
      startAutoSlide(); // Reset timer on manual click
    });
  });

  startAutoSlide();
}

/**
 * 2. Search Modal Overlay
 */
function initSearchOverlay() {
  const searchBtn = document.querySelector('.search-toggle');
  const overlay = document.getElementById('searchOverlay');
  const closeBtn = document.getElementById('closeSearch');
  const searchInput = document.querySelector('.search-input');

  if (!searchBtn || !overlay) return;

  searchBtn.addEventListener('click', () => {
    overlay.classList.add('active');
    setTimeout(() => {
      if (searchInput) searchInput.focus();
    }, 150);
  });

  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      overlay.classList.remove('active');
    });
  }

  // Close when clicking outside modal box
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) {
      overlay.classList.remove('active');
    }
  });

  // ESC key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && overlay.classList.contains('active')) {
      overlay.classList.remove('active');
    }
  });
}

/**
 * 3. Mobile Navigation Menu Toggle
 */
function initMobileMenu() {
  const toggle = document.getElementById('mobileMenuToggle');
  const nav = document.getElementById('secondaryNav');

  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    nav.classList.toggle('mobile-open');
    toggle.classList.toggle('active');
  });
}

/**
 * 4. Scroll To Top Button
 */
function initScrollTop() {
  const btn = document.getElementById('scrollTopBtn');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  });

  btn.addEventListener('click', () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  });
}

/**
 * 5. Newsletter Subscription Feedback
 */
function showSubscribeFeedback() {
  const input = document.getElementById('newsletterEmail');
  const feedback = document.getElementById('newsletterFeedback');
  if (!input || !feedback) return;

  const email = input.value.trim();
  if (email) {
    feedback.textContent = `Thank you for joining our family, ${email}! Welcome to Image Studio 🌸`;
    input.value = '';
    setTimeout(() => {
      feedback.textContent = '';
    }, 5000);
  }
}
