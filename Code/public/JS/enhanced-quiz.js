document.addEventListener("DOMContentLoaded", () => {
  // Grabbing references to key DOM elements needed for quiz UI updates
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

  // Defining the array of quiz questions, each with a unique ID, category, and a set of multiple-choice options
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

  // Variables to track current quiz progress, selected answers, and categorized user preferences
  let currentQuestion = 0
  let answers = []
  let userProfile = {}

  // Function to initialize the quiz, reset states, and load the first question
  function initQuiz() {
    currentQuestion = 0
    answers = []
    userProfile = {}
    showQuestion(currentQuestion)
    updateProgress()
    quizQuestion.style.display = "block"
    resultContainer.style.display = "none"
  }

  // Function to render a question and its corresponding options based on the index
  function showQuestion(index) {
    const question = questions[index]
    questionNumber.textContent = index + 1
    questionElement.textContent = question.text

    // Clear previously displayed options from the DOM
    optionsContainer.innerHTML = ""

    // Dynamically create radio buttons and labels for each option in the current question
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

      // Append input and label to the option container div
      optionDiv.appendChild(input)
      optionDiv.appendChild(label)
      optionsContainer.appendChild(optionDiv)

      // Attach an event listener to handle answer selection
      input.addEventListener("change", function () {
        // Store the user's answer along with the question ID and category
        answers.push({
          questionId: question.id,
          category: question.category,
          answer: this.value,
        })

        // Automatically move to the next question or trigger result processing
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

  // Function to update the quiz progress bar and status text
  function updateProgress() {
    const progress = ((currentQuestion + 1) / questions.length) * 100
    progressBar.style.width = `${progress}%`
    progressText.textContent = `Question ${currentQuestion + 1} of ${questions.length}`
  }

  // Function to handle result processing after the last question is answered
  async function processResults() {
    // Hide quiz and show loading indicator while results are calculated
    quizQuestion.style.display = "none"
    loadingIndicator.style.display = "flex"

    try {
      // Organize answers into userProfile object, grouped by category
      questions.forEach((question, index) => {
        if (answers[index]) {
          if (!userProfile[question.category]) {
            userProfile[question.category] = []
          }
          userProfile[question.category].push(answers[index].answer)
        }
      })

      // Send collected answers and profile to backend API for AI-based analysis
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

      // Display final AI-generated result
      displayResults(result)
    } catch (error) {
      console.error("Error processing results:", error)

      // If AI fails, fallback to simple in-browser logic to analyze answers
      const basicResult = performBasicAnalysis()
      displayResults(basicResult)
    } finally {
      // Hide loading and show results
      loadingIndicator.style.display = "none"
      resultContainer.style.display = "block"
    }
  }

  // Fallback function for analyzing quiz results if backend is unavailable
  function performBasicAnalysis() {
    // Define scoring buckets for different career-oriented streams
    const categories = {
      science: 0,
      commerce: 0,
      arts: 0,
      technology: 0,
      healthcare: 0,
      social: 0,
    }

    // Manually map certain answer values to these predefined categories
    answers.forEach((answer) => {
      const value = answer.answer

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

      if (
        ["Biology", "In a hospital or research lab", "Helping others", "Making a difference", "Biotechnology"].includes(
          value,
        )
      ) {
        categories.healthcare++
      }

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

    // Sort categories by highest count
    const sortedCategories = Object.entries(categories)
      .sort((a, b) => b[1] - a[1])
      .filter((category) => category[1] > 0)

    // Initialize response message
    let recommendation = "Based on your answers, you might be well-suited for "
    let details = []

    if (sortedCategories.length > 0) {
      const topCategory = sortedCategories[0][0]

      // Define result content based on top category
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

      // Optionally add second-highest category if score is high enough
      if (sortedCategories.length > 1 && sortedCategories[1][1] > 1) {
        const secondCategory = sortedCategories[1][0]
        recommendation += `. You also show potential for ${categoryRecommendations[secondCategory].stream}.`
      }
    } else {
      // If no clear dominant category, show general advice
      recommendation =
        "Your interests seem diverse. Consider exploring multiple streams or consult with a career counselor for personalized advice."
    }

    return {
      recommendation,
      details,
    }
  }

  // Function to render the final results on the screen
  function displayResults(result) {
    resultText.textContent = result.recommendation

    // Clear any previously shown detailed result sections
    detailedResults.innerHTML = ""

    // Create and insert each detailed section such as careers or strengths
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

    // Create section for external resources (links to more content)
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

  // Setup retake button to restart the quiz when clicked
  if (retakeBtn) {
    retakeBtn.addEventListener("click", initQuiz)
  }

  // Kick off the quiz as soon as DOM is ready
  initQuiz()
})
