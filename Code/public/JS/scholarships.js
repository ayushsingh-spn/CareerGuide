document.addEventListener('DOMContentLoaded', function() {
    // Select essential DOM elements for search and filtering functionality
    const searchInput = document.getElementById('search'); // Input field for keyword search
    const streamFilter = document.getElementById('stream-filter'); // Dropdown to select stream filter
    const scholarshipItems = document.querySelectorAll('.scholarship-item'); // All scholarship entries
    const examItems = document.querySelectorAll('.exam-item'); // All exam entries

    // Bind event listeners to both search input and stream dropdown
    searchInput.addEventListener('input', filterItems); // Trigger filter on search input change
    streamFilter.addEventListener('change', filterItems); // Trigger filter on stream selection change

    // Function that filters scholarship and exam entries based on user input and stream selection
    function filterItems() {
      const searchText = searchInput.value.toLowerCase(); // Convert search query to lowercase for comparison
      const selectedStream = streamFilter.value; // Get selected stream from dropdown

      // Process all scholarship items for filtering
      scholarshipItems.forEach(item => {
        const title = item.querySelector('h3').textContent.toLowerCase(); // Extract title text
        const description = item.querySelector('.scholarship-description').textContent.toLowerCase(); // Extract description
        const details = Array.from(item.querySelectorAll('.scholarship-detail')) // Collect detail texts
                            .map(detail => detail.textContent.toLowerCase()).join(' ');
        const itemStream = item.getAttribute('data-stream'); // Get assigned stream for this item

        // Determine if item matches search text
        const matchesSearch = title.includes(searchText) || description.includes(searchText) || details.includes(searchText);

        // Determine if item matches selected stream or is marked as 'All'
        const matchesStream = selectedStream === 'All' || itemStream === selectedStream || itemStream === 'All';

        // Show or hide item based on both search and stream match
        item.style.display = matchesSearch && matchesStream ? 'block' : 'none';
      });

      // Process all exam items for filtering
      examItems.forEach(item => {
        const title = item.querySelector('h3').textContent.toLowerCase(); // Extract exam title
        const description = item.querySelector('.exam-description').textContent.toLowerCase(); // Extract description
        const details = Array.from(item.querySelectorAll('.exam-detail')) // Collect detail text
                            .map(detail => detail.textContent.toLowerCase()).join(' ');
        const itemStream = item.getAttribute('data-stream'); // Get stream tag for this exam

        // Check for text and stream match conditions
        const matchesSearch = title.includes(searchText) || description.includes(searchText) || details.includes(searchText);
        const matchesStream = selectedStream === 'All' || itemStream === selectedStream;

        // Conditionally show/hide item
        item.style.display = matchesSearch && matchesStream ? 'block' : 'none';
      });

      // After filtering, verify if any section is empty and display fallback messages if needed
      checkEmptySections();
    }

    // Function that handles "no results found" messages for empty filtered sections
    function checkEmptySections() {
      const scholarshipsList = document.getElementById('scholarships-list'); // Container for scholarship items
      const examsList = document.getElementById('exams-list'); // Container for exam items

      // Get visible scholarships and exams after filtering
      const visibleScholarships = Array.from(scholarshipItems).filter(item => item.style.display !== 'none');
      const visibleExams = Array.from(examItems).filter(item => item.style.display !== 'none');

      // Display a message in the scholarship section if no items are visible
      if (visibleScholarships.length === 0) {
        if (!scholarshipsList.querySelector('.no-results')) {
          const noResults = document.createElement('div');
          noResults.className = 'no-results';
          noResults.textContent = 'No scholarships match your search criteria.';
          scholarshipsList.appendChild(noResults);
        }
      } else {
        // Remove the "no results" message if it exists and results are available
        const noResultsMsg = scholarshipsList.querySelector('.no-results');
        if (noResultsMsg) {
          scholarshipsList.removeChild(noResultsMsg);
        }
      }

      // Display a message in the exams section if no items are visible
      if (visibleExams.length === 0) {
        if (!examsList.querySelector('.no-results')) {
          const noResults = document.createElement('div');
          noResults.className = 'no-results';
          noResults.textContent = 'No exams match your search criteria.';
          examsList.appendChild(noResults);
        }
      } else {
        // Remove the "no results" message if exams are present
        const noResultsMsg = examsList.querySelector('.no-results');
        if (noResultsMsg) {
          examsList.removeChild(noResultsMsg);
        }
      }
    }

    // Run initial filtering logic on page load to display appropriate content based on defaults
    filterItems();
});
