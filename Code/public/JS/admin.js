document.addEventListener("DOMContentLoaded", () => {
    // Mobile sidebar toggle
    const sidebarToggle = document.getElementById("sidebar-toggle")
    const adminSidebar = document.querySelector(".admin-sidebar")
  
    if (sidebarToggle && adminSidebar) {
      sidebarToggle.addEventListener("click", () => {
        adminSidebar.classList.toggle("active")
      })
    }
  
    // Confirmation for delete actions
    const deleteButtons = document.querySelectorAll(".delete-btn")
  
    if (deleteButtons) {
      deleteButtons.forEach((button) => {
        button.addEventListener("click", (e) => {
          const confirmed = confirm("Are you sure you want to delete this item? This action cannot be undone.")
  
          if (!confirmed) {
            e.preventDefault()
          }
        })
      })
    }
  })
  