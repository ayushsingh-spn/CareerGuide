document.addEventListener("DOMContentLoaded", () => {
    // Assign variables to password input field, strength bar element, and strength label element
    const passwordInput = document.getElementById("password")
    const strengthLevel = document.getElementById("strength-level")
    const strengthText = document.getElementById("strength-text")

    // Ensure all password strength elements exist before adding event listeners
    if (passwordInput && strengthLevel && strengthText) {
        // When user types in the password field, calculate password strength
        passwordInput.addEventListener("input", function () {
            const password = this.value
            let strength = 0
            let message = ""

            // Increase strength if password length is 8 or more characters
            if (password.length >= 8) {
                strength += 25
            }

            // Increase strength if password contains both lowercase and uppercase letters
            if (password.match(/[a-z]/) && password.match(/[A-Z]/)) {
                strength += 25
            }

            // Increase strength if password includes at least one numeric digit
            if (password.match(/\d/)) {
                strength += 25
            }

            // Increase strength if password includes at least one special character
            if (password.match(/[^a-zA-Z\d]/)) {
                strength += 25
            }

            // Update the width of the strength meter based on total calculated strength
            strengthLevel.style.width = strength + "%"

            // Set strength bar color and accompanying text message based on strength score
            if (strength <= 25) {
                strengthLevel.style.backgroundColor = "#ef4444" // Red = Weak
                message = "Weak"
            } else if (strength <= 50) {
                strengthLevel.style.backgroundColor = "#f59e0b" // Orange = Fair
                message = "Fair"
            } else if (strength <= 75) {
                strengthLevel.style.backgroundColor = "#10b981" // Light green = Good
                message = "Good"
            } else {
                strengthLevel.style.backgroundColor = "#059669" // Dark green = Strong
                message = "Strong"
            }

            // Display the strength message beside the bar
            strengthText.textContent = message
        })
    }

    // Assign the signup form to a variable to apply validation logic
    const signupForm = document.getElementById("signup-form")

    // Only proceed if the form exists on the page
    if (signupForm) {
        // Add submit event to compare password and confirmPassword fields
        signupForm.addEventListener("submit", (e) => {
            const password = document.getElementById("password").value
            const confirmPassword = document.getElementById("confirmPassword").value

            // Prevent form submission if passwords do not match
            if (password !== confirmPassword) {
                e.preventDefault()
                alert("Passwords do not match!")
            }
        })
    }
})
