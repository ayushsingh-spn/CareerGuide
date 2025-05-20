document.addEventListener("DOMContentLoaded", () => {
  // Toggle mobile navigation menu visibility when the menu button is clicked
  const mobileMenuBtn = document.querySelector(".mobile-menu-btn")
  const mobileMenu = document.querySelector(".mobile-menu")

  if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener("click", () => {
      mobileMenu.classList.toggle("active")
    })
  }

  // Handle dynamic switching of career path content when a path button is clicked
  const pathBtns = document.querySelectorAll(".path-btn")
  const pathContainers = document.querySelectorAll(".path-container")

  if (pathBtns.length > 0) {
    pathBtns.forEach((btn) => {
      btn.addEventListener("click", function () {
        const path = this.getAttribute("data-path") // Get associated path identifier

        // Remove 'active' class from all buttons and apply to the clicked one
        pathBtns.forEach((b) => b.classList.remove("active"))
        this.classList.add("active")

        // Display the corresponding path container and hide others
        pathContainers.forEach((container) => {
          container.classList.remove("active")
          if (container.classList.contains(path + "-path")) {
            container.classList.add("active")
          }
        })
      })
    })
  }

  // Setup and control testimonial slider functionality
  const testimonialSlides = document.querySelectorAll(".testimonial-slide")
  const dots = document.querySelectorAll(".dot")
  let currentSlide = 0

  if (testimonialSlides.length > 0) {
    showSlide(currentSlide) // Display the initial slide

    // Automatically change slide every 5 seconds
    setInterval(() => {
      currentSlide = (currentSlide + 1) % testimonialSlides.length
      showSlide(currentSlide)
    }, 5000)

    // Allow users to navigate to a specific slide via dot indicators
    dots.forEach((dot, index) => {
      dot.addEventListener("click", () => {
        currentSlide = index
        showSlide(currentSlide)
      })
    })
  }

  // Function to update slide visibility and dot indicator based on index
  function showSlide(index) {
    testimonialSlides.forEach((slide) => slide.classList.remove("active"))
    dots.forEach((dot) => dot.classList.remove("active"))

    testimonialSlides[index].classList.add("active")
    dots[index].classList.add("active")
  }

  // Scroll smoothly to the next viewport height when scroll indicator is clicked
  const scrollIndicator = document.querySelector(".scroll-indicator")
  if (scrollIndicator) {
    scrollIndicator.addEventListener("click", () => {
      window.scrollTo({
        top: window.innerHeight,
        behavior: "smooth",
      })
    })
  }

  // Animate elements when they enter the viewport on scroll
  const animateOnScroll = () => {
    const elements = document.querySelectorAll(".feature-card, .stat-card, .resource-card")

    elements.forEach((element) => {
      const elementPosition = element.getBoundingClientRect().top
      const screenPosition = window.innerHeight / 1.3

      if (elementPosition < screenPosition) {
        element.style.opacity = "1"
        element.style.transform = "translateY(0)"
      }
    })
  }

  // Prepare animated elements by setting initial hidden state and transition effects
  const elementsToAnimate = document.querySelectorAll(".feature-card, .stat-card, .resource-card")
  elementsToAnimate.forEach((element) => {
    element.style.opacity = "0"
    element.style.transform = "translateY(20px)"
    element.style.transition = "opacity 0.5s ease, transform 0.5s ease"
  })

  // Bind scroll event to animate eligible elements on scroll
  window.addEventListener("scroll", animateOnScroll)
  animateOnScroll() // Trigger once at page load

  /* ========== COSMIC STATISTICS ANIMATION ========== */

  // ParticleGalaxy class creates a particle system that visually simulates a galaxy
  class ParticleGalaxy {
    constructor(container, color) {
      this.container = container;
      this.canvas = document.createElement('canvas');
      container.appendChild(this.canvas);
      this.ctx = this.canvas.getContext('2d');
      this.particles = [];
      this.color = color || this.getRandomColor();
      this.resize();
      this.init();
      window.addEventListener('resize', () => this.resize());
    }

    // Randomly choose one of the predefined hue colors for particles
    getRandomColor() {
      const hues = [200, 260, 320, 30]; // Blue, Purple, Pink, Orange
      return `hsl(${hues[Math.floor(Math.random() * hues.length)]}, 100%, 70%)`;
    }

    // Resize the canvas to fit the container whenever the window resizes
    resize() {
      this.width = this.canvas.width = this.container.offsetWidth;
      this.height = this.canvas.height = this.container.offsetHeight;
    }

    // Initialize and distribute galaxy-like particles in spiral formation
    init() {
      const particleCount = 150;
      const centerX = this.width / 2;
      const centerY = this.height / 2;

      for (let i = 0; i < particleCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * Math.min(this.width, this.height) * 0.4;
        const armOffset = Math.random() * 0.2 - 0.1;

        const x = centerX + Math.cos(angle) * (radius + armOffset * radius);
        const y = centerY + Math.sin(angle) * (radius + armOffset * radius);

        this.particles.push({
          x, y,
          size: Math.random() * 2 + 0.5,
          baseX: x,
          baseY: y,
          density: Math.random() * 30 + 1,
          color: this.color
        });
      }

      this.animate();
    }

    // Animate particle orbits and connecting lines
    animate() {
      this.ctx.clearRect(0, 0, this.width, this.height);

      this.particles.forEach(particle => {
        particle.x = particle.baseX + Math.cos(Date.now() * 0.0005 * particle.density) * 10;
        particle.y = particle.baseY + Math.sin(Date.now() * 0.0005 * particle.density) * 10;

        this.ctx.beginPath();
        this.ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        this.ctx.fillStyle = particle.color;
        this.ctx.fill();

        // Draw subtle lines between particles that are within proximity
        for (let i = 0; i < this.particles.length; i++) {
          const dx = particle.x - this.particles[i].x;
          const dy = particle.y - this.particles[i].y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 100) {
            this.ctx.beginPath();
            this.ctx.strokeStyle = particle.color;
            this.ctx.lineWidth = 0.2;
            this.ctx.moveTo(particle.x, particle.y);
            this.ctx.lineTo(this.particles[i].x, this.particles[i].y);
            this.ctx.stroke();
          }
        }
      });

      requestAnimationFrame(() => this.animate());
    }
  }

  // Animate numeric counters along with galaxy effect visuals
  const animateCosmicStats = () => {
    const statCards = document.querySelectorAll('.cosmic-stat');
    const colors = ['#4facfe', '#a18cd1', '#ff7e5f'];

    statCards.forEach((card, index) => {
      const canvasContainer = card.querySelector('.cosmic-particle-canvas');
      const counter = card.querySelector('.cosmic-counter');
      const target = parseInt(card.getAttribute('data-value'));
      const duration = 2000;
      const startTime = Date.now();

      // Start galaxy particle animation on card
      new ParticleGalaxy(canvasContainer, colors[index]);

      // Animate numeric counter from 0 to target
      const animateCounter = () => {
        const elapsed = Date.now() - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const current = Math.floor(progress * target);

        counter.textContent = current;

        if (progress < 1) {
          requestAnimationFrame(animateCounter);
        }
      };

      animateCounter();
    });
  };

  // Observe when cosmic section enters viewport and trigger animations once
  const cosmicObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCosmicStats();
        cosmicObserver.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  const cosmicSection = document.querySelector('.cosmic-stats');
  if (cosmicSection) {
    cosmicObserver.observe(cosmicSection);
  }
  /* ========== END COSMIC STATISTICS ========== */
});
