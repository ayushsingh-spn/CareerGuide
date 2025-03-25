document.addEventListener("DOMContentLoaded", () => {
    const streamData = {
      Science: {
        subjects: ["Physics", "Chemistry", "Biology/Mathematics"],
        difficulty: "High",
        jobProspects: "Excellent",
        salaryExpectations: "High",
        pros: ["Wide range of career options", "High earning potential", "Opportunity for research and innovation"],
        cons: ["Intense competition", "Rigorous coursework", "May require longer periods of study"],
      },
      Commerce: {
        subjects: ["Accountancy", "Business Studies", "Economics"],
        difficulty: "Medium",
        jobProspects: "Good",
        salaryExpectations: "Medium to High",
        pros: [
          "Good for entrepreneurship",
          "Diverse career options in business and finance",
          "Practical knowledge for everyday life",
        ],
        cons: [
          "May require additional professional qualifications",
          "Market-dependent job prospects",
          "Can be challenging for those not inclined towards numbers",
        ],
      },
      Arts: {
        subjects: ["History", "Political Science", "Literature"],
        difficulty: "Medium",
        jobProspects: "Varied",
        salaryExpectations: "Varied",
        pros: ["Develops critical thinking and creativity", "Flexible career paths", "Opportunity for self-expression"],
        cons: [
          "Job market can be competitive",
          "May require specialization for high-paying jobs",
          "Earning potential can vary widely",
        ],
      },
    }
  
    const stream1Select = document.getElementById("stream1")
    const stream2Select = document.getElementById("stream2")
    const stream1Column = document.getElementById("stream1-column")
    const stream2Column = document.getElementById("stream2-column")
  
    // Initialize comparison
    updateComparison()
  
    // Add event listeners to selects
    stream1Select.addEventListener("change", updateComparison)
    stream2Select.addEventListener("change", updateComparison)
  
    function updateComparison() {
      const stream1 = stream1Select.value
      const stream2 = stream2Select.value
  
      stream1Column.innerHTML = generateStreamHTML(stream1)
      stream2Column.innerHTML = generateStreamHTML(stream2)
    }
  
    function generateStreamHTML(stream) {
      const data = streamData[stream]
  
      return `
        <h2>${stream}</h2>
        <div class="comparison-item">
          <h3>Key Subjects</h3>
          <ul>
            ${data.subjects.map((subject) => `<li>${subject}</li>`).join("")}
          </ul>
        </div>
        <div class="comparison-item">
          <h3>Difficulty Level</h3>
          <p>${data.difficulty}</p>
        </div>
        <div class="comparison-item">
          <h3>Job Prospects</h3>
          <p>${data.jobProspects}</p>
        </div>
        <div class="comparison-item">
          <h3>Salary Expectations</h3>
          <p>${data.salaryExpectations}</p>
        </div>
        <div class="comparison-item">
          <h3>Pros</h3>
          <ul>
            ${data.pros.map((pro) => `<li><i class="fas fa-check-circle text-green"></i> ${pro}</li>`).join("")}
          </ul>
        </div>
        <div class="comparison-item">
          <h3>Cons</h3>
          <ul>
            ${data.cons.map((con) => `<li><i class="fas fa-times-circle text-red"></i> ${con}</li>`).join("")}
          </ul>
        </div>
      `
    }
  })
  
  