document.addEventListener("DOMContentLoaded", () => {
    // Define the set of quiz questions and options to be shown to the user
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

    // Track the index of the current question being displayed
    let currentQuestion = 0
    // Array to store user's selected answers
    let answers = []

    // Reference essential DOM elements for question rendering and result display
    const questionNumber = document.getElementById("question-number")
    const questionText = document.getElementById("question-text")
    const quizQuestion = document.getElementById("quiz-question")
    const quizResult = document.getElementById("quiz-result")
    const resultText = document.getElementById("result-text")
    const retakeBtn = document.getElementById("retake-btn")

    // Display the first question when the quiz loads
    showQuestion(currentQuestion)

    // Add event listeners to each radio input (quiz option)
    document.querySelectorAll('input[name="quiz-option"]').forEach((option) => {
      option.addEventListener("change", function () {
        // Store the selected answer in the answers array
        answers.push(this.value)

        // If there are more questions, go to the next one; otherwise, show final result
        if (currentQuestion < questions.length - 1) {
          currentQuestion++
          showQuestion(currentQuestion)
        } else {
          showResult()
        }
      })
    })

    // Handle click on the "Retake Quiz" button to restart the quiz from the beginning
    if (retakeBtn) {
      retakeBtn.addEventListener("click", () => {
        currentQuestion = 0
        answers = []
        showQuestion(currentQuestion)
        quizResult.style.display = "none"
        quizQuestion.style.display = "block"
      })
    }

    // Display the specified question and its options based on index
    function showQuestion(index) {
      const question = questions[index]
      questionNumber.textContent = index + 1 // Update displayed question number
      questionText.textContent = question.text // Set the question text

      // Update each option's input and label with corresponding text
      const options = document.querySelectorAll(".option")
      options.forEach((option, i) => {
        const input = option.querySelector("input")
        const label = option.querySelector("label")

        input.checked = false // Reset previous selection
        input.value = question.options[i] // Assign option value
        input.id = `option-${i}` // Set unique ID for input
        label.textContent = question.options[i] // Set label text
        label.setAttribute("for", `option-${i}`) // Link label to input
      })
    }

    // Analyze user's answers and determine their suggested stream
    function showResult() {
      // Count how many answers align with each academic stream
      const scienceCount = answers.filter(
        (a) => a === "Mathematics" || a === "Solving complex problems" || a === "Working in a tech company",
      ).length

      const commerceCount = answers.filter(
        (a) => a === "Economics" || a === "Analyzing market trends" || a === "Running a business",
      ).length

      const artsCount = answers.filter(
        (a) => a === "Literature" || a === "Creative writing" || a === "In a creative field",
      ).length

      // Determine user's result based on highest stream alignment
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

      // Display the result message and toggle visibility of question/result sections
      resultText.textContent = result
      quizQuestion.style.display = "none"
      quizResult.style.display = "block"
    }
})
