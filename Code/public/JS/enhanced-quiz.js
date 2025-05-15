document.addEventListener("DOMContentLoaded", () => {
  const quizContainer = document.getElementById("quiz-container")
  const questionElement = document.getElementById("question-text")
  const optionsContainer = document.querySelector(".quiz-options")
  const progressBar = document.getElementById("quiz-progress-bar")
  const progressText = document.getElementById("quiz-progress-text")
  const resultContainer = document.getElementById("quiz-result")
  const resultText = document.getElementById("result-text")
  const detailedResults = document.getElementById("detailed-results")
  const loadingIndicator = document.getElementById("loading-indicator")
  const retakeBtn = document.getElementById("retake-btn")
  const questionNumber = document.getElementById("question-number")
  const quizQuestion = document.getElementById("quiz-question")

  // Enhanced question set with categories
  const questions = [
    {
      id: 1,
      text: "Which subject do you enjoy the most?",
      category: "interests",
      options: ["Mathematics", "Biology", "Economics", "Literature", "Computer Science", "Psychology"],
    },
    {
      id: 2,
      text: "What type of activities do you prefer?",
      category: "activities",
      options: [
        "Solving complex problems",
        "Conducting experiments",
        "Analyzing market trends",
        "Creative writing",
        "Building or fixing things",
        "Helping others",
      ],
    },
    {
      id: 3,
      text: "Where do you see yourself in 10 years?",
      category: "goals",
      options: [
        "Working in a tech company",
        "In a hospital or research lab",
        "Running a business",
        "In a creative field",
        "Teaching or mentoring others",
        "Working for social causes",
      ],
    },
    {
      id: 4,
      text: "How do you prefer to work?",
      category: "work_style",
      options: [
        "Independently",
        "In a team",
        "Leading others",
        "Following structured processes",
        "In a creative environment",
        "In a fast-paced setting",
      ],
    },
    {
      id: 5,
      text: "Which of these skills would you like to develop further?",
      category: "skills",
      options: [
        "Technical skills",
        "Research skills",
        "Business skills",
        "Creative skills",
        "People skills",
        "Analytical skills",
      ],
    },
    {
      id: 6,
      text: "What motivates you the most?",
      category: "motivation",
      options: [
        "Solving difficult problems",
        "Making new discoveries",
        "Financial success",
        "Creative expression",
        "Helping others",
        "Recognition for your work",
      ],
    },
    {
      id: 7,
      text: "How do you approach challenges?",
      category: "problem_solving",
      options: [
        "Analyze systematically",
        "Experiment with solutions",
        "Seek advice from others",
        "Think outside the box",
        "Follow established methods",
        "Trust your intuition",
      ],
    },
    {
      id: 8,
      text: "Which environment do you prefer to work in?",
      category: "environment",
      options: [
        "Office setting",
        "Laboratory or research facility",
        "Varied locations",
        "Creative studio",
        "Outdoors",
        "From home",
      ],
    },
    {
      id: 9,
      text: "What's most important to you in a career?",
      category: "values",
      options: [
        "Intellectual stimulation",
        "Making a difference",
        "Financial stability",
        "Work-life balance",
        "Continuous learning",
        "Job security",
      ],
    },
    {
      id: 10,
      text: "Which of these technologies interests you the most?",
      category: "tech_interest",
      options: [
        "Artificial Intelligence",
        "Biotechnology",
        "Financial Technology",
        "Digital Media",
        "Renewable Energy",
        "None of these",
      ],
    },
  ]

  let currentQuestion = 0
  let answers = []
  let userProfile = {}

  // Initialize quiz
  function initQuiz() {
    currentQuestion = 0
    answers = []
    userProfile = {}
    showQuestion(currentQuestion)
    updateProgress()

    quizQuestion.style.display = "block"
    resultContainer.style.display = "none"
  }

  function showQuestion(index) {
    const question = questions[index]
    questionNumber.textContent = index + 1
    questionElement.textContent = question.text

    // Clear previous options
    optionsContainer.innerHTML = ""

    // Create new options
    question.options.forEach((option, i) => {
      const optionDiv = document.createElement("div")
      optionDiv.className = "option"

      const input = document.createElement("input")
      input.type = "radio"
      input.id = `option-${i}`
      input.name = "quiz-option"
      input.value = option

      const label = document.createElement("label")
      label.setAttribute("for", `option-${i}`)
      label.textContent = option

      optionDiv.appendChild(input)
      optionDiv.appendChild(label)
      optionsContainer.appendChild(optionDiv)

      // Add event listener to each option
      input.addEventListener("change", function () {
        // Save answer with category
        answers.push({
          questionId: question.id,
          category: question.category,
          answer: this.value,
        })

        // Move to next question or show result
        setTimeout(() => {
          if (currentQuestion < questions.length - 1) {
            currentQuestion++
            showQuestion(currentQuestion)
            updateProgress()
          } else {
            processResults()
          }
        }, 300)
      })
    })
  }

  function updateProgress() {
    const progress = ((currentQuestion + 1) / questions.length) * 100
    progressBar.style.width = `${progress}%`
    progressText.textContent = `Question ${currentQuestion + 1} of ${questions.length}`
  }

  async function processResults() {
    // Show loading indicator
    quizQuestion.style.display = "none"
    loadingIndicator.style.display = "flex"

    try {
      // Organize answers by category
      questions.forEach((question, index) => {
        if (answers[index]) {
          if (!userProfile[question.category]) {
            userProfile[question.category] = []
          }
          userProfile[question.category].push(answers[index].answer)
        }
      })

      // Send to server for AI analysis
      const response = await fetch("/api/analyze-quiz", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ answers, userProfile }),
      })

      if (!response.ok) {
        throw new Error("Failed to analyze quiz results")
      }

      const result = await response.json()

      // Display results
      displayResults(result)
    } catch (error) {
      console.error("Error processing results:", error)
      // Fallback to basic analysis if AI fails
      const basicResult = performBasicAnalysis()
      displayResults(basicResult)
    } finally {
      loadingIndicator.style.display = "none"
      resultContainer.style.display = "block"
    }
  }

  function performBasicAnalysis() {
    // Simple algorithm as fallback
    const categories = {
      science: 0,
      commerce: 0,
      arts: 0,
      technology: 0,
      healthcare: 0,
      social: 0,
    }

    // Map answers to categories
    answers.forEach((answer) => {
      const value = answer.answer

      // Science indicators
      if (
        [
          "Mathematics",
          "Biology",
          "Solving complex problems",
          "Conducting experiments",
          "In a hospital or research lab",
          "Research skills",
          "Technical skills",
          "Making new discoveries",
          "Laboratory or research facility",
          "Biotechnology",
        ].includes(value)
      ) {
        categories.science++
      }

      // Commerce indicators
      if (
        [
          "Economics",
          "Analyzing market trends",
          "Running a business",
          "Business skills",
          "Financial success",
          "Financial stability",
          "Financial Technology",
        ].includes(value)
      ) {
        categories.commerce++
      }

      // Arts indicators
      if (
        [
          "Literature",
          "Creative writing",
          "In a creative field",
          "Creative skills",
          "Creative expression",
          "Creative studio",
          "Digital Media",
        ].includes(value)
      ) {
        categories.arts++
      }

      // Technology indicators
      if (
        [
          "Computer Science",
          "Working in a tech company",
          "Technical skills",
          "Artificial Intelligence",
          "From home",
        ].includes(value)
      ) {
        categories.technology++
      }

      // Healthcare indicators
      if (
        ["Biology", "In a hospital or research lab", "Helping others", "Making a difference", "Biotechnology"].includes(
          value,
        )
      ) {
        categories.healthcare++
      }

      // Social indicators
      if (
        [
          "Psychology",
          "Helping others",
          "Teaching or mentoring others",
          "Working for social causes",
          "People skills",
          "Making a difference",
        ].includes(value)
      ) {
        categories.social++
      }
    })

    // Find top categories
    const sortedCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .filter((category) => category[1] > 0)

    // Generate basic recommendation
    let recommendation = "Based on your answers, you might be well-suited for "
    let details = []

    if (sortedCategories.length > 0) {
      const topCategory = sortedCategories[0][0]

      const categoryRecommendations = {
        science: {
          stream: "the Science stream",
          careers: ["Research Scientist", "Data Analyst", "Environmental Scientist"],
          strengths: ["Analytical thinking", "Problem-solving", "Attention to detail"],
        },
        commerce: {
          stream: "the Commerce stream",
          careers: ["Business Analyst", "Financial Advisor", "Marketing Specialist"],
          strengths: ["Business acumen", "Numerical skills", "Strategic thinking"],
        },
        arts: {
          stream: "the Arts stream",
          careers: ["Content Creator", "Graphic Designer", "Journalist"],
          strengths: ["Creativity", "Communication skills", "Artistic expression"],
        },
        technology: {
          stream: "the Technology field",
          careers: ["Software Developer", "IT Consultant", "UX Designer"],
          strengths: ["Technical aptitude", "Logical thinking", "Innovation"],
        },
        healthcare: {
          stream: "the Healthcare field",
          careers: ["Doctor", "Nurse", "Medical Researcher"],
          strengths: ["Empathy", "Scientific knowledge", "Attention to detail"],
        },
        social: {
          stream: "the Social Sciences field",
          careers: ["Psychologist", "Social Worker", "Teacher"],
          strengths: ["Empathy", "Communication", "Desire to help others"],
        },
      }

      recommendation += categoryRecommendations[topCategory].stream

      details = [
        {
          title: "Potential Careers",
          content: categoryRecommendations[topCategory].careers.join(", "),
        },
        {
          title: "Your Strengths",
          content: categoryRecommendations[topCategory].strengths.join(", "),
        },
        {
          title: "Next Steps",
          content: "Consider researching specific careers in this field and the educational requirements for each.",
        },
      ]

      // Add secondary recommendation if applicable
      if (sortedCategories.length > 1 && sortedCategories[1][1] > 1) {
        const secondCategory = sortedCategories[1][0]
        recommendation += `. You also show potential for ${categoryRecommendations[secondCategory].stream}.`
      }
    } else {
      recommendation =
        "Your interests seem diverse. Consider exploring multiple streams or consult with a career counselor for personalized advice."
    }

    return {
      recommendation,
      details,
    }
  }

  function displayResults(result) {
    resultText.textContent = result.recommendation

    // Clear previous detailed results
    detailedResults.innerHTML = ""

    // Add detailed sections
    if (result.details && result.details.length > 0) {
      result.details.forEach((detail) => {
        const section = document.createElement("div")
        section.className = "result-section"

        const title = document.createElement("h3")
        title.textContent = detail.title

        const content = document.createElement("p")
        content.textContent = detail.content

        section.appendChild(title)
        section.appendChild(content)
        detailedResults.appendChild(section)
      })
    }

    // Add career resources section
    const resourcesSection = document.createElement("div")
    resourcesSection.className = "result-section resources"

    const resourcesTitle = document.createElement("h3")
    resourcesTitle.textContent = "Career Resources"

    const resourcesList = document.createElement("ul")

    const resources = [
      { name: "Explore Streams", link: "/streams" },
      { name: "Compare Careers", link: "/compare" },
      { name: "Ask Career Questions", link: "/qa" },
      { name: "Scholarships", link: "/scholarships" },
    ]

    resources.forEach((resource) => {
      const item = document.createElement("li")
      const link = document.createElement("a")
      link.href = resource.link
      link.textContent = resource.name
      item.appendChild(link)
      resourcesList.appendChild(item)
    })

    resourcesSection.appendChild(resourcesTitle)
    resourcesSection.appendChild(resourcesList)
    detailedResults.appendChild(resourcesSection)
  }

  // Retake quiz button
  if (retakeBtn) {
    retakeBtn.addEventListener("click", initQuiz)
  }

  // Initialize the quiz
  initQuiz()
})
