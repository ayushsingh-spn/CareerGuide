document.addEventListener("DOMContentLoaded", () => {
    const questions = [
      {
        text: "Which subject do you enjoy the most?",
        options: ["Mathematics", "Biology", "Economics", "Literature"],
      },
      {
        text: "What type of activities do you prefer?",
        options: ["Solving complex problems", "Conducting experiments", "Analyzing market trends", "Creative writing"],
      },
      {
        text: "Where do you see yourself in 10 years?",
        options: [
          "Working in a tech company",
          "In a hospital or research lab",
          "Running a business",
          "In a creative field",
        ],
      },
    ]
  
    let currentQuestion = 0
    let answers = []
  
    const questionNumber = document.getElementById("question-number")
    const questionText = document.getElementById("question-text")
    const quizQuestion = document.getElementById("quiz-question")
    const quizResult = document.getElementById("quiz-result")
    const resultText = document.getElementById("result-text")
    const retakeBtn = document.getElementById("retake-btn")
  
    // Initialize quiz
    showQuestion(currentQuestion)
  
    // Add event listeners to radio buttons
    document.querySelectorAll('input[name="quiz-option"]').forEach((option) => {
      option.addEventListener("change", function () {
        // Save answer
        answers.push(this.value)
  
        // Move to next question or show result
        if (currentQuestion < questions.length - 1) {
          currentQuestion++
          showQuestion(currentQuestion)
        } else {
          showResult()
        }
      })
    })
  
    // Retake quiz button
    if (retakeBtn) {
      retakeBtn.addEventListener("click", () => {
        currentQuestion = 0
        answers = []
        showQuestion(currentQuestion)
        quizResult.style.display = "none"
        quizQuestion.style.display = "block"
      })
    }
  
    function showQuestion(index) {
      const question = questions[index]
      questionNumber.textContent = index + 1
      questionText.textContent = question.text
  
      // Update options
      const options = document.querySelectorAll(".option")
      options.forEach((option, i) => {
        const input = option.querySelector("input")
        const label = option.querySelector("label")
  
        input.checked = false
        input.value = question.options[i]
        input.id = `option-${i}`
        label.textContent = question.options[i]
        label.setAttribute("for", `option-${i}`)
      })
    }
  
    function showResult() {
      // Simple algorithm to determine result
      const scienceCount = answers.filter(
        (a) => a === "Mathematics" || a === "Solving complex problems" || a === "Working in a tech company",
      ).length
  
      const commerceCount = answers.filter(
        (a) => a === "Economics" || a === "Analyzing market trends" || a === "Running a business",
      ).length
  
      const artsCount = answers.filter(
        (a) => a === "Literature" || a === "Creative writing" || a === "In a creative field",
      ).length
  
      let result = ""
      if (scienceCount >= 2) {
        result = "Based on your answers, you might be well-suited for the Science stream."
      } else if (commerceCount >= 2) {
        result = "Based on your answers, you might be well-suited for the Commerce stream."
      } else if (artsCount >= 2) {
        result = "Based on your answers, you might be well-suited for the Arts stream."
      } else {
        result =
          "Your interests seem diverse. Consider exploring multiple streams or consult with a career counselor for personalized advice."
      }
  
      resultText.textContent = result
      quizQuestion.style.display = "none"
      quizResult.style.display = "block"
    }
  })
  
  