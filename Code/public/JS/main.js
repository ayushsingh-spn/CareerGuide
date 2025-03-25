document.addEventListener("DOMContentLoaded", () => {
    // Mobile Menu Toggle
    const mobileMenuBtn = document.querySelector(".mobile-menu-btn")
    const mobileMenu = document.querySelector(".mobile-menu")
  
    if (mobileMenuBtn) {
      mobileMenuBtn.addEventListener("click", () => {
        mobileMenu.classList.toggle("active")
      })
    }
  
    // Career Path Visualization
    const pathBtns = document.querySelectorAll(".path-btn")
    const pathContainers = document.querySelectorAll(".path-container")
  
    if (pathBtns.length > 0) {
      pathBtns.forEach((btn) => {
        btn.addEventListener("click", function () {
          const path = this.getAttribute("data-path")
  
          // Update active button
          pathBtns.forEach((b) => b.classList.remove("active"))
          this.classList.add("active")
  
          // Update active path
          pathContainers.forEach((container) => {
            container.classList.remove("active")
            if (container.classList.contains(path + "-path")) {
              container.classList.add("active")
            }
          })
        })
      })
    }
  
    // Testimonial Slider
    const testimonialSlides = document.querySelectorAll(".testimonial-slide")
    const dots = document.querySelectorAll(".dot")
    let currentSlide = 0
  
    if (testimonialSlides.length > 0) {
      // Initialize slider
      showSlide(currentSlide)
  
      // Auto slide
      setInterval(() => {
        currentSlide = (currentSlide + 1) % testimonialSlides.length
        showSlide(currentSlide)
      }, 5000)
  
      // Dot navigation
      dots.forEach((dot, index) => {
        dot.addEventListener("click", () => {
          currentSlide = index
          showSlide(currentSlide)
        })
      })
    }
  
    function showSlide(index) {
      testimonialSlides.forEach((slide) => slide.classList.remove("active"))
      dots.forEach((dot) => dot.classList.remove("active"))
  
      testimonialSlides[index].classList.add("active")
      dots[index].classList.add("active")
    }
  
    // Scroll Animation
    const scrollIndicator = document.querySelector(".scroll-indicator")
    if (scrollIndicator) {
      scrollIndicator.addEventListener("click", () => {
        window.scrollTo({
          top: window.innerHeight,
          behavior: "smooth",
        })
      })
    }
  
    // Animate elements on scroll
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
  
    // Set initial styles for animation
    const elementsToAnimate = document.querySelectorAll(".feature-card, .stat-card, .resource-card")
    elementsToAnimate.forEach((element) => {
      element.style.opacity = "0"
      element.style.transform = "translateY(20px)"
      element.style.transition = "opacity 0.5s ease, transform 0.5s ease"
    })
  
    // Run animation on scroll
    window.addEventListener("scroll", animateOnScroll)
    // Run once on page load
    animateOnScroll()
  })
  
  