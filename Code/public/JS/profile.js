document.addEventListener("DOMContentLoaded", () => {
  // Profile menu navigation
  const menuLinks = document.querySelectorAll(".profile-menu a")
  const profileSections = document.querySelectorAll(".profile-section")

  if (menuLinks && profileSections) {
    menuLinks.forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault()

        // Remove active class from all links and sections
        menuLinks.forEach((l) => l.classList.remove("active"))
        profileSections.forEach((s) => s.classList.remove("active"))

        // Add active class to clicked link
        this.classList.add("active")

        // Show corresponding section
        const targetId = this.getAttribute("href").substring(1)
        document.getElementById(targetId).classList.add("active")
      })
    })
  }

  // Form submission
  const personalInfoForm = document.getElementById("personal-info-form")

  if (personalInfoForm) {
    personalInfoForm.addEventListener("submit", (e) => {
      e.preventDefault()

      // In a real application, you would send this data to the server
      // For now, just show a success message
      alert("Profile updated successfully!")
    })
  }

  // Change avatar button
  const changeAvatarBtn = document.querySelector(".change-avatar-btn")

  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener("click", () => {
      // In a real application, you would open a file picker
      alert("This feature is not implemented in the demo.")
    })
  }

  // Check if there's a hash in the URL and navigate to that section
  if (window.location.hash) {
    const hash = window.location.hash.substring(1)
    const targetLink = document.querySelector(`.profile-menu a[href="#${hash}"]`)
    if (targetLink) {
      targetLink.click()
    }
  }
})
