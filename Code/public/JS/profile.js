document.addEventListener("DOMContentLoaded", () => {
  // Select all profile navigation menu links and profile section containers
  const menuLinks = document.querySelectorAll(".profile-menu a")
  const profileSections = document.querySelectorAll(".profile-section")

  // Ensure both menu links and profile sections exist before binding interactions
  if (menuLinks && profileSections) {
    menuLinks.forEach((link) => {
      link.addEventListener("click", function (e) {
        e.preventDefault() // Prevent default anchor behavior (e.g., jumping to hash)

        // Deactivate all menu links and profile sections
        menuLinks.forEach((l) => l.classList.remove("active"))
        profileSections.forEach((s) => s.classList.remove("active"))

        // Highlight the clicked menu link
        this.classList.add("active")

        // Activate the corresponding section based on href attribute (used as ID)
        const targetId = this.getAttribute("href").substring(1) // Strip '#' from href
        document.getElementById(targetId).classList.add("active")
      })
    })
  }

  // Locate the "Change Avatar" button in the profile section
  const changeAvatarBtn = document.querySelector(".change-avatar-btn")

  // Attach click handler to display a placeholder message (for demo purpose only)
  if (changeAvatarBtn) {
    changeAvatarBtn.addEventListener("click", () => {
      // In a production system, this would trigger a file input dialog or image uploader
      alert("This feature is not implemented in the demo.")
    })
  }

  // Automatically navigate to a profile section if a URL hash exists on page load
  if (window.location.hash) {
    const hash = window.location.hash.substring(1) // Remove '#' symbol
    const targetLink = document.querySelector(`.profile-menu a[href="#${hash}"]`)
    
    // Simulate click on the matched link to load the associated section
    if (targetLink) {
      targetLink.click()
    }
  }
})
