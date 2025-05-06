document.addEventListener("DOMContentLoaded", () => {
    // Password strength meter
    const passwordInput = document.getElementById("password")
    const strengthLevel = document.getElementById("strength-level")
    const strengthText = document.getElementById("strength-text")
  
    if (passwordInput && strengthLevel && strengthText) {
      passwordInput.addEventListener("input", function () {
        const password = this.value
        let strength = 0
        let message = ""
  
        if (password.length >= 8) {
          strength += 25
        }
  
        if (password.match(/[a-z]/) && password.match(/[A-Z]/)) {
          strength += 25
        }
  
        if (password.match(/\d/)) {
          strength += 25
        }
  
        if (password.match(/[^a-zA-Z\d]/)) {
          strength += 25
        }
  
        strengthLevel.style.width = strength + "%"
  
        if (strength <= 25) {
          strengthLevel.style.backgroundColor = "#ef4444"
          message = "Weak"
        } else if (strength <= 50) {
          strengthLevel.style.backgroundColor = "#f59e0b"
          message = "Fair"
        } else if (strength <= 75) {
          strengthLevel.style.backgroundColor = "#10b981"
          message = "Good"
        } else {
          strengthLevel.style.backgroundColor = "#059669"
          message = "Strong"
        }
  
        strengthText.textContent = message
      })
    }
  
    // Form validation
    const signupForm = document.getElementById("signup-form")
  
    if (signupForm) {
      signupForm.addEventListener("submit", (e) => {
        const password = document.getElementById("password").value
        const confirmPassword = document.getElementById("confirmPassword").value
  
        if (password !== confirmPassword) {
          e.preventDefault()
          alert("Passwords do not match!")
        }
      })
    }
  })
  