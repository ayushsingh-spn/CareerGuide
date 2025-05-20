document.addEventListener("DOMContentLoaded", () => {
    // Initialize sidebar toggle functionality for mobile view
    const sidebarToggle = document.getElementById("sidebar-toggle")
    const adminSidebar = document.querySelector(".admin-sidebar")

    // If both the toggle button and sidebar exist in the DOM
    if (sidebarToggle && adminSidebar) {
        // Add click event to toggle the 'active' class, which shows/hides the sidebar
        sidebarToggle.addEventListener("click", () => {
            adminSidebar.classList.toggle("active")
        })
    }

    // Select all delete buttons across the admin interface
    const deleteButtons = document.querySelectorAll(".delete-btn")

    // If delete buttons are present, attach a confirmation dialog to each
    if (deleteButtons) {
        deleteButtons.forEach((button) => {
            button.addEventListener("click", (e) => {
                // Prompt user for confirmation before allowing deletion
                const confirmed = confirm("Are you sure you want to delete this item? This action cannot be undone.")

                // If not confirmed, prevent the default button action (e.g., form submission or navigation)
                if (!confirmed) {
                    e.preventDefault()
                }
            })
        })
    }
})

// Search filter for users list table (used in users.ejs admin panel)
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('user-search') // Input field for search
    const tableRows = document.querySelectorAll('.users-table tbody tr') // All user table rows

    // Only proceed if the input and at least one row exists
    if (searchInput && tableRows.length > 0) {
        // Listen for user typing in the search input field
        searchInput.addEventListener('input', function () {
            const searchTerm = this.value.toLowerCase() // Convert search term to lowercase for comparison

            // Loop through each user row and show/hide based on name or email match
            tableRows.forEach(row => {
                const name = row.cells[0].textContent.toLowerCase() // First column: user name
                const email = row.cells[1].textContent.toLowerCase() // Second column: user email

                // Show row if name or email contains the search term; otherwise, hide it
                row.style.display = name.includes(searchTerm) || email.includes(searchTerm) ? '' : 'none'
            })
        })
    }
})

// Search and filter logic for admin question list (used in questions.ejs)
document.addEventListener('DOMContentLoaded', function () {
    const searchInput = document.getElementById('searchInput') // Text input for searching questions
    const statusFilter = document.getElementById('statusFilter') // Dropdown to filter by answer status
    const questionRows = document.querySelectorAll('.question-row') // All question list rows

    // Proceed only if input fields and rows are present
    if (searchInput && statusFilter && questionRows.length > 0) {
        // Main function to apply both text search and status filter
        function filterQuestions() {
            const searchTerm = searchInput.value.toLowerCase() // Search input in lowercase
            const filterValue = statusFilter.value // Current selected filter (all, answered, unanswered)

            // Loop through each question row
            questionRows.forEach(row => {
                const questionText = row.querySelector('.question-preview').textContent.toLowerCase() // Preview text of the question
                const askedBy = row.cells[2].textContent.toLowerCase() // Name or email of the person who asked
                const isAnswered = row.classList.contains('answered') // Boolean flag from row class

                // Check if row matches search input (by question text or asker's name/email)
                const matchesSearch = questionText.includes(searchTerm) || askedBy.includes(searchTerm)

                // Check if row matches filter value
                const matchesFilter =
                    filterValue === 'all' ||
                    (filterValue === 'answered' && isAnswered) ||
                    (filterValue === 'unanswered' && !isAnswered)

                // Display row only if both conditions are met
                row.style.display = matchesSearch && matchesFilter ? '' : 'none'
            })
        }

        // Bind filter function to both search input and dropdown change events
        searchInput.addEventListener('input', filterQuestions)
        statusFilter.addEventListener('change', filterQuestions)
    }
})
