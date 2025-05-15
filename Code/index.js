const mysql = require('mysql2');
const express = require("express");
const app = express();
const port = 8080;
const path = require("path");
const session = require("express-session")
const methodOverride = require("method-override");
const { v4: uuidv4 } = require("uuid");
const bcrypt = require("bcrypt");
const flash = require("connect-flash");
const crypto = require("crypto")
const { sendVerificationEmail, sendPasswordResetEmail } = require('../Code/public/JS/mailer');
const { generateText } = require("ai")
const { openai } = require("@ai-sdk/openai")
const dotenv = require("dotenv")
const { GoogleGenerativeAI } = require('@google/generative-ai');

// Load environment variables
dotenv.config()

// Add JSON body parser middleware
app.use(express.json())
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

// Set up session
app.use(
  session({
    secret: "career-guidance-secret-key",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // 24 hours
  }),
)

// Set up flash messages
app.use(flash())

// Middleware to make flash messages available to all templates
app.use((req, res, next) => {
  res.locals.success = req.flash("success")
  res.locals.error = req.flash("error")
  res.locals.user = req.session.user || null
  res.locals.isAdmin = req.session.isAdmin || false
  next()
})

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public/CSS")));
app.use(express.static(path.join(__dirname, "public/JS")));
app.use(express.static(path.join(__dirname, "public/Photos")));

// Create the connection to database
var connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    database: 'QNA',
    password: 'Ayush186'
  });

  connection.connect();

// Authentication middleware
const isLoggedIn = (req, res, next) => {
  if (!req.session.user) {
    req.flash("error", "You must be logged in to access this page")
    return res.redirect("/login")
  }
  next()
}

const isAdmin = (req, res, next) => {
  if (!req.session.user || !req.session.isAdmin) {
    req.flash("error", "You must be an admin to access this page")
    return res.redirect("/admin/login")
  }
  next()
}

// Helper function to generate a random token
const generateToken = () => {
  return crypto.randomBytes(32).toString("hex")
}

app.post("/signup", async (req, res) => {
  try {
    const { name, email, password, confirmPassword } = req.body

    // Validate input
    if (!name || !email || !password || !confirmPassword) {
      req.flash("error", "All fields are required")
      return res.redirect("/signup")
    }

    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match")
      return res.redirect("/signup")
    }

    // Check if user already exists
    connection.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) throw err

      if (results.length > 0) {
        req.flash("error", "Email already in use")
        return res.redirect("/signup")
      }

      const hashedPassword = await bcrypt.hash(password, 10)
      const id = uuidv4()

      // Generate verification token
      const verificationToken = generateToken()
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

      // Insert user into database
      const q = `INSERT INTO users (id, name, email, password, verification_token, verification_expiry) 
                VALUES (?, ?, ?, ?, ?, ?)`

      connection.query(
        q,
        [id, name, email, password, verificationToken, verificationExpiry],
        async (err, result) => {
        if (err) throw err

        // Send verification email
        const emailSent = await sendVerificationEmail(email, verificationToken, name)

        if (emailSent) {
          req.flash("success", "Registration successful! Please check your email to verify your account.")
        } else {
          req.flash(
            "success",
            "Registration successful! However, we couldn't send a verification email. Please contact support.",
          )
        }
        res.redirect("/login")
      },
    )
    })
  } catch (error) {
    console.error("Error during signup:", error)
    req.flash("error", "An error occurred during signup")
    res.redirect("/signup")
  }
})


// Email verification route
app.get("/verify-email", (req, res) => {
  const { token } = req.query

  if (!token) {
    return res.render("verify-email", {
      verified: false,
      expired: false,
      email: "",
      layout: "auth-layout",
    })
  }

  // Check if token is valid
  connection.query("SELECT * FROM users WHERE verification_token = ?", [token], (err, results) => {
    if (err) {
      console.error("Error verifying email:", err)
      return res.render("verify-email", {
        verified: false,
        expired: false,
        email: "",
        layout: "auth-layout",
      })
    }

    if (results.length === 0) {
      return res.render("verify-email", {
        verified: false,
        expired: false,
        email: "",
        layout: "auth-layout",
      })
    }

    const user = results[0]
    const now = new Date()
    const expiryDate = new Date(user.verification_expiry)

    // Check if token has expired
    if (now > expiryDate) {
      return res.render("verify-email", {
        verified: false,
        expired: true,
        email: user.email,
        layout: "auth-layout",
      })
    }

    // Update user as verified
    connection.query(
      "UPDATE users SET email_verified = TRUE, verification_token = NULL, verification_expiry = NULL WHERE id = ?",
      [user.id],
      (err, result) => {
        if (err) {
          console.error("Error updating user verification status:", err)
          return res.render("verify-email", {
            verified: false,
            expired: false,
            email: user.email,
            layout: "auth-layout",
          })
        }

        return res.render("verify-email", {
          verified: true,
          expired: false,
          email: user.email,
          layout: "auth-layout",
        })
      },
    )
  })
})

// Resend verification email
app.post("/resend-verification", async (req, res) => {
  const { email } = req.body

  if (!email) {
    req.flash("error", "Email is required")
    return res.redirect("/login")
  }

  // Check if user exists
  connection.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) {
      console.error("Error finding user:", err)
      req.flash("error", "An error occurred. Please try again.")
      return res.redirect("/login")
    }

    if (results.length === 0) {
      req.flash("error", "No account found with that email address")
      return res.redirect("/login")
    }

    const user = results[0]

    // Check if already verified
    if (user.email_verified) {
      req.flash("success", "Your email is already verified. You can log in.")
      return res.redirect("/login")
    }

    // Generate new verification token
    const verificationToken = generateToken()
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours from now

    // Update user with new token
    connection.query(
      "UPDATE users SET verification_token = ?, verification_expiry = ? WHERE id = ?",
      [verificationToken, verificationExpiry, user.id],
      async (err, result) => {
        if (err) {
          console.error("Error updating verification token:", err)
          req.flash("error", "An error occurred. Please try again.")
          return res.redirect("/login")
        }

        // Send verification email
        const emailSent = await sendVerificationEmail(user.email, verificationToken, user.name)

        if (emailSent) {
          req.flash("success", "Verification email sent! Please check your inbox.")
        } else {
          req.flash("error", "Failed to send verification email. Please try again later.")
        }

        res.redirect("/login")
      },
    )
  })
})


app.post("/login", (req, res) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      req.flash("error", "Email and password are required")
      return res.redirect("/login")
    }

    // Check if user exists
    connection.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) throw err

      if (results.length === 0) {
        req.flash("error", "Invalid email or password")
        return res.redirect("/login")
      }

      const user = results[0]

      if (password !== user.password) {
        req.flash("error", "Invalid email or password")
        return res.redirect("/login")
      }

      // Check if email is verified (skip for admin users)
      if (!user.is_admin && !user.email_verified) {
        req.flash(
          "error",
          "Please verify your email before logging in. <a href='/resend-verification?email=" +
            email +
            "'>Resend verification email</a>",
        )
        return res.redirect("/login")
      }

      // Set session
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
      }
      req.session.isAdmin = user.is_admin === 1

      req.flash("success", "Logged in successfully")

        res.redirect("/")
    })
  } catch (error) {
    console.error("Error during login:", error)
    req.flash("error", "An error occurred during login")
    res.redirect("/login")
  }
})

// Forgot password route
app.get("/forgot-password", (req, res) => {
  res.render("forgot-password", { layout: "auth-layout" })
})

app.post("/forgot-password", (req, res) => {
  const { email } = req.body

  if (!email) {
    req.flash("error", "Email is required")
    return res.redirect("/forgot-password")
  }

  // Check if user exists
  connection.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) {
      console.error("Error finding user:", err)
      req.flash("error", "An error occurred. Please try again.")
      return res.redirect("/forgot-password")
    }

    // Always show success message even if email doesn't exist (security best practice)
    if (results.length === 0) {
      req.flash("success", "If an account with that email exists, we've sent a password reset link.")
      return res.redirect("/forgot-password")
    }

    const user = results[0]

    // Generate password reset token
    const resetToken = generateToken()
    const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000) // 1 hour from now

    // Update user with reset token
    connection.query(
      "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
      [resetToken, resetTokenExpiry, user.id],
      async (err, result) => {
        if (err) {
          console.error("Error updating reset token:", err)
          req.flash("error", "An error occurred. Please try again.")
          return res.redirect("/forgot-password")
        }

        // Send password reset email
        const emailSent = await sendPasswordResetEmail(user.email, resetToken, user.name)

        req.flash("success", "If an account with that email exists, we've sent a password reset link.")
        res.redirect("/forgot-password")
      },
    )
  })
})

// Reset password routes
app.get("/reset-password", (req, res) => {
  const { token } = req.query

  if (!token) {
    req.flash("error", "Invalid or missing reset token")
    return res.redirect("/login")
  }

  // Check if token is valid
  connection.query("SELECT * FROM users WHERE reset_token = ?", [token], (err, results) => {
    if (err) {
      console.error("Error verifying reset token:", err)
      req.flash("error", "An error occurred. Please try again.")
      return res.redirect("/login")
    }

    if (results.length === 0) {
      req.flash("error", "Invalid or expired reset token")
      return res.redirect("/login")
    }

    const user = results[0]
    const now = new Date()
    const expiryDate = new Date(user.reset_token_expiry)

    // Check if token has expired
    if (now > expiryDate) {
      req.flash("error", "Reset token has expired. Please request a new one.")
      return res.redirect("/forgot-password")
    }

    res.render("reset-password", {
      token: token,
      error: req.flash("error"),
      layout: "auth-layout",
    })
  })
})

app.post("/reset-password", async (req, res) => {
  const { token, password, confirmPassword } = req.body

  // Validate input
  if (!token || !password || !confirmPassword) {
    req.flash("error", "All fields are required")
    return res.redirect(`/reset-password?token=${token}`)
  }

  if (password !== confirmPassword) {
    req.flash("error", "Passwords do not match")
    return res.redirect(`/reset-password?token=${token}`)
  }

  // Check if token is valid
  connection.query("SELECT * FROM users WHERE reset_token = ?", [token], async (err, results) => {
    if (err) {
      console.error("Error verifying reset token:", err)
      req.flash("error", "An error occurred. Please try again.")
      return res.redirect("/login")
    }

    if (results.length === 0) {
      req.flash("error", "Invalid or expired reset token")
      return res.redirect("/login")
    }

    const user = results[0]
    const now = new Date()
    const expiryDate = new Date(user.reset_token_expiry)

    // Check if token has expired
    if (now > expiryDate) {
      req.flash("error", "Reset token has expired. Please request a new one.")
      return res.redirect("/forgot-password")
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update user password and clear reset token
    connection.query(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
      [password, user.id],
      (err, result) => {
        if (err) {
          console.error("Error updating password:", err)
          req.flash("error", "An error occurred. Please try again.")
          return res.redirect(`/reset-password?token=${token}`)
        }

        req.flash("success", "Password has been reset successfully. You can now log in with your new password.")
        res.redirect("/login")
      },
    )
  })
})

app.post("/admin/login", (req, res) => {
  try {
    const { email, password } = req.body

    // Validate input
    if (!email || !password) {
      req.flash("error", "Email and password are required")
      return res.redirect("/login")
    }

    // Check if user exists
    connection.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) throw err

      if (results.length === 0) {
        req.flash("error", "Invalid email or password")
        return res.redirect("/login")
      }

      const user = results[0]

      if (password !== user.password) {
        req.flash("error", "Invalid email or password")
        return res.redirect("/login")
      }

      // Set session
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
      }
      req.session.isAdmin = user.is_admin === 1

      if (!req.session.isAdmin) {
        req.flash("error", "You must be an admin to access this page")
        return res.redirect("/admin/login")
      }

      req.flash("success", "Logged in successfully")

      // Redirect based on user type
      if (user.is_admin === 1) {
        res.redirect("/dashboard")
      } 
    })
  } catch (error) {
    console.error("Error during login:", error)
    req.flash("error", "An error occurred during login")
    res.redirect("/login")
  }
})

app.get("/logout", (req, res) => {
  req.session.destroy()
  res.redirect("/login")
})

app.get("/profile", isLoggedIn, (req, res) => {
  // First, get the user information
  connection.query("SELECT * FROM users WHERE id = ?", [req.session.user.id], (err, userResults) => {
    if (err) {
      console.error("Error fetching user:", err)
      req.flash("error", "An error occurred while loading your profile")
      return res.redirect("/")
    }

    const user = userResults[0]

    // Then, get the user's questions - now ordered by created_at timestamp
    connection.query(
      "SELECT * FROM question WHERE user_id = ? ORDER BY created_at DESC",
      [req.session.user.id],
      (err, questionResults) => {
        if (err) {
          console.error("Error fetching questions:", err)
          req.flash("error", "An error occurred while loading your questions")
          return res.render("profile", { user, userQuestions: [] })
        }

        res.render("profile", { user, userQuestions: questionResults })
      },
    )
  })
})

// Admin routes
app.get("/dashboard", isAdmin, (req, res) => {

    // Helper function to format time since
    function timeSince(date) {
      const seconds = Math.floor((new Date() - date) / 1000)
  
      let interval = seconds / 31536000
      if (interval > 1) return Math.floor(interval) + " years ago"
  
      interval = seconds / 2592000
      if (interval > 1) return Math.floor(interval) + " months ago"
  
      interval = seconds / 86400
      if (interval > 1) return Math.floor(interval) + " days ago"
  
      interval = seconds / 3600
      if (interval > 1) return Math.floor(interval) + " hours ago"
  
      interval = seconds / 60
      if (interval > 1) return Math.floor(interval) + " minutes ago"
  
      return Math.floor(seconds) + " seconds ago"
    }  

    // Make timeSince available to the template
    res.locals.timeSince = timeSince

  // Get questions from the question table
  const q = `SELECT * FROM question ORDER BY created_at DESC LIMIT 5;`

  connection.query(q, (err, questions) => {
    if (err) {
      console.error("Error fetching questions:", err)
      req.flash("error", "An error occurred while loading questions")
      return res.render("admin/dashboard.ejs", { questions: [], recentUsers: [] })
    }

    // Count total questions
    connection.query("SELECT COUNT(*) as total FROM question", (err, countResult) => {
      if (err) {
        console.error("Error counting questions:", err)
        return res.render("admin/dashboard", {
          questions,
          totalQuestions: 0,
          recentUsers: [],
        })
      }

      const totalQuestions = countResult[0].total

      // Count answered questions
      connection.query(
        "SELECT COUNT(*) as answered FROM question WHERE answers IS NOT NULL AND answers != ''",
        (err, answeredResult) => {
          if (err) {
            console.error("Error counting answered questions:", err)
            return res.render("admin/dashboard", {
              questions,
              totalQuestions,
              answeredQuestions: 0,
              pendingQuestions: totalQuestions,
              recentUsers: [],
            })
          }

          const answeredQuestions = answeredResult[0].answered
          const pendingQuestions = totalQuestions - answeredQuestions

          // Count users
          connection.query("SELECT COUNT(*) as total FROM users WHERE is_admin = 0", (err, usersResult) => {
            if (err) {
              console.error("Error counting users:", err)
              return res.render("admin/dashboard", {
                questions,
                totalQuestions,
                answeredQuestions,
                pendingQuestions,
                totalUsers: 0,
                recentUsers: [],
              })
            }

            const totalUsers = usersResult[0].total

            // Get recent users
            connection.query(
              "SELECT id, name, email, created_at, email_verified FROM users WHERE is_admin = 0 ORDER BY created_at DESC LIMIT 5",
              (err, recentUsers) => {
                if (err) {
                  console.error("Error fetching recent users:", err)
                  return res.render("admin/dashboard", {
                    questions,
                    totalQuestions,
                    answeredQuestions,
                    pendingQuestions,
                    totalUsers,
                    recentUsers: [],
                  })
                }

                res.render("admin/dashboard", {
                  questions,
                  totalQuestions,
                  answeredQuestions,
                  pendingQuestions,
                  totalUsers,
                  recentUsers,
                })
              },
            )
          })
        },
      )
    })
  })
})

// Admin User Management Routes
app.get("/admin/users", isAdmin, (req, res) => {
  connection.query(
    "SELECT id, name, email, created_at, email_verified FROM users WHERE is_admin = 0 ORDER BY created_at DESC",
    (err, users) => {
      if (err) {
        console.error("Error fetching users:", err)
        req.flash("error", "An error occurred while loading users")
        return res.render("admin/users", { users: [] })
      }

      res.render("admin/users", { users })
    },
  )
})

app.get("/admin/users/:id", isAdmin, (req, res) => {
  const { id } = req.params

  // Get user details
  connection.query("SELECT * FROM users WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("Error fetching user:", err)
      req.flash("error", "An error occurred while loading user details")
      return res.redirect("/admin/users")
    }

    if (results.length === 0) {
      req.flash("error", "User not found")
      return res.redirect("/admin/users")
    }

    const user = results[0]

    // Get user's questions
    connection.query("SELECT * FROM question WHERE user_id = ? ORDER BY created_at DESC", [id], (err, questions) => {
      if (err) {
        console.error("Error fetching user questions:", err)
        return res.render("admin/user-detail", { user, questions: [] })
      }

      res.render("admin/user-detail", { user, questions })
    })
  })
})

app.get("/admin/users/:id/edit", isAdmin, (req, res) => {
  const { id } = req.params

  connection.query("SELECT * FROM users WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("Error fetching user:", err)
      req.flash("error", "An error occurred while loading user details")
      return res.redirect("/admin/users")
    }

    if (results.length === 0) {
      req.flash("error", "User not found")
      return res.redirect("/admin/users")
    }

    const user = results[0]
    res.render("admin/edit-user", { user })
  })
})

app.post("/admin/users/:id", isAdmin, async (req, res) => {
  const { id } = req.params
  const { name, email, password, email_verified } = req.body
  const isVerified = email_verified === "on"

  try {
    // First check if user exists
    connection.query("SELECT * FROM users WHERE id = ?", [id], async (err, results) => {
      if (err) {
        console.error("Error fetching user:", err)
        req.flash("error", "An error occurred while updating user")
        return res.redirect(`/admin/users/${id}/edit`)
      }

      if (results.length === 0) {
        req.flash("error", "User not found")
        return res.redirect("/admin/users")
      }

      const user = results[0]

      // Check if email is being changed and if it's already in use
      if (email !== user.email) {
        connection.query("SELECT * FROM users WHERE email = ? AND id != ?", [email, id], (err, emailResults) => {
          if (err) {
            console.error("Error checking email:", err)
            req.flash("error", "An error occurred while updating user")
            return res.redirect(`/admin/users/${id}/edit`)
          }

          if (emailResults.length > 0) {
            req.flash("error", "Email is already in use by another user")
            return res.redirect(`/admin/users/${id}/edit`)
          }
        })
      }

      // Prepare update query
      let updateQuery = "UPDATE users SET name = ?, email = ?, email_verified = ?"
      const queryParams = [name, email, isVerified]

      // If password is provided, hash it and include in update
      if (password && password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(password, 10)
        updateQuery += ", password = ?"
        queryParams.push(hashedPassword)
      }

      // Add WHERE clause
      updateQuery += " WHERE id = ?"
      queryParams.push(id)

      // Execute update
      connection.query(updateQuery, queryParams, (err, result) => {
        if (err) {
          console.error("Error updating user:", err)
          req.flash("error", "An error occurred while updating user")
          return res.redirect(`/admin/users/${id}/edit`)
        }

        req.flash("success", "User updated successfully")
        res.redirect("/admin/users")
      })
    })
  } catch (error) {
    console.error("Error updating user:", error)
    req.flash("error", "An error occurred while updating user")
    res.redirect(`/admin/users/${id}/edit`)
  }
})


// Admin Question Management Routes
app.get("/admin/questions", isAdmin, (req, res) => {
  connection.query("SELECT * FROM question ORDER BY created_at DESC", (err, questions) => {
    if (err) {
      console.error("Error fetching questions:", err)
      req.flash("error", "An error occurred while loading questions")
      return res.render("admin/questions", { questions: [] })
    }

    res.render("admin/questions", { questions })
  })
})

app.get("/admin/questions/:id", isAdmin, (req, res) => {
  const { id } = req.params

  // Get question details
  connection.query("SELECT * FROM question WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("Error fetching question:", err)
      req.flash("error", "An error occurred while loading question details")
      return res.redirect("/admin/questions")
    }

    if (results.length === 0) {
      req.flash("error", "Question not found")
      return res.redirect("/admin/questions")
    }

    const question = results[0]

    // Get user details if user_id exists
    if (question.user_id) {
      connection.query("SELECT * FROM users WHERE id = ?", [question.user_id], (err, userResults) => {
        if (err) {
          console.error("Error fetching user:", err)
          return res.render("admin/question-detail", { question, userData: null, userQuestions: [] })
        }

        const userData = userResults.length > 0 ? userResults[0] : null

        // Get other questions by the same user
        if (userData) {
          connection.query(
            "SELECT * FROM question WHERE user_id = ? ORDER BY created_at DESC",
            [userData.id],
            (err, questionResults) => {
              if (err) {
                console.error("Error fetching user questions:", err)
                return res.render("admin/question-detail", { question, userData, userQuestions: [] })
              }

              res.render("admin/question-detail", { question, userData, userQuestions: questionResults })
            },
          )
        } else {
          res.render("admin/question-detail", { question, userData: null, userQuestions: [] })
        }
      })
    } else {
      res.render("admin/question-detail", { question, userData: null, userQuestions: [] })
    }
  })
})

app.get("/admin/questions/:id/edit", isAdmin, (req, res) => {
  const { id } = req.params

  connection.query("SELECT * FROM question WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("Error fetching question:", err)
      req.flash("error", "An error occurred while loading question details")
      return res.redirect("/admin/questions")
    }

    if (results.length === 0) {
      req.flash("error", "Question not found")
      return res.redirect("/admin/questions")
    }

    const question = results[0]
    res.render("admin/edit-question", { question })
  })
})

app.post("/admin/questions/:id", isAdmin, (req, res) => {
  const { id } = req.params
  const { answer } = req.body

  if (!answer || answer.trim() === "") {
    req.flash("error", "Answer cannot be empty")
    return res.redirect(`/admin/questions/${id}/edit`)
  }

  connection.query("UPDATE question SET answers = ? WHERE id = ?", [answer, id], (err, result) => {
    if (err) {
      console.error("Error updating question:", err)
      req.flash("error", "An error occurred while updating the answer")
      return res.redirect(`/admin/questions/${id}/edit`)
    }

    req.flash("success", "Answer updated successfully")
    res.redirect(`/admin/questions/${id}`)
  })
})

app.get("/admin/questions/:id/delete", isAdmin, (req, res) => {
  const { id } = req.params

  connection.query("SELECT * FROM question WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("Error fetching question:", err)
      req.flash("error", "An error occurred while loading question details")
      return res.redirect("/admin/questions")
    }

    if (results.length === 0) {
      req.flash("error", "Question not found")
      return res.redirect("/admin/questions")
    }

    const question = results[0]
    res.render("admin/delete-question", { question })
  })
})

app.delete("/admin/questions/:id", isAdmin, (req, res) => {
  const { id } = req.params

  connection.query("DELETE FROM question WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("Error deleting question:", err)
      req.flash("error", "An error occurred while deleting the question")
      return res.redirect(`/admin/questions/${id}`)
    }

    req.flash("success", "Question deleted successfully")
    res.redirect("/admin/questions")
  })
})

//Home page
app.get("/", (req, res) => {
    res.render('index');
});

//Stream page
app.get("/streams", (req, res) => {
    res.render('streams');
});

//Career Quiz Page
app.get("/quiz", (req, res) => {
    res.render('quiz');
});

//Compare Page
app.get("/compare", (req, res) => {
    res.render('compare');
});

//Testimonials Page
app.get("/testimonials", (req, res) => {
    res.render('testimonials');
});

//Scholarships Page
app.get("/scholarships", (req, res) => {
    res.render('scholarships');
});

//For Parents Page
app.get("/parents", (req, res) => {
    res.render('parents');
});

//For signup page
app.get("/signup", (req, res) => {
    res.render('signup', { layout: "auth-layout" });
});

//For login page
app.get("/login", (req, res) => {
    res.render('login', { layout: "auth-layout" });
});

//For admin-login page
app.get("/admin/login", (req, res) => {
  res.render("admin-login", { layout: "auth-layout" })
});

//QA Page
app.get("/qa", (req, res) => {

    let { id } = req.params;
    let q = `SELECT * FROM question;`;
  
    try {
      connection.query(q, (err, result) => {
        if (err) throw err;
        let questions = result[0];
        res.render("qa", { questions });
      });
    } catch (err) {
      res.send("some error with DB");
    }
});

// app.get("/qa_added", (req, res) => {

//     let { id } = req.params;
//     let q = `SELECT * FROM questions ORDER BY id DESC;`;
  
//     try {
//       connection.query(q, (err, result) => {
//         if (err) throw err;
//         let questions = result[0];
//         res.render("qa_added", { questions });
//       });
//     } catch (err) {
//       res.send("some error with DB");
//     }
// });

//For adding qna to my sql
// Update the POST route for question submission to require login
app.post("/qa_added", (req, res) => {
  // Check if user is logged in
  if (!req.session.user) {
    req.flash("error", "You must be logged in to ask a question")
    return res.redirect("/login")
  }

  const { question } = req.body

  // Validate the question
  if (!question || question.trim() === "") {
    req.flash("error", "Question cannot be empty")
    return res.redirect("/qa")
  }

  // Insert the question with user association
  const q = `INSERT INTO question (user_id, name, email, question) 
             VALUES (?, ?, ?, ?);`

  try {
    connection.query(
      q,
      [req.session.user.id, req.session.user.name, req.session.user.email, question],
      (err, result) => {
        if (err) throw err
        console.log("added new question with user association")
        req.flash("success", "Your question has been submitted successfully!")
        res.redirect("/qa")
      },
    )
  } catch (err) {
    console.error("Error submitting question:", err)
    req.flash("error", "An error occurred while submitting your question")
    res.redirect("/qa")
  }
})

//for finding question
app.get("/qa/:id", (req, res) => {
  const { givenid } = req.query

  // First try to find in the question table
  const q1 = `SELECT * FROM question WHERE id=?`

  try {
    connection.query(q1, [givenid], (err, result) => {
      if (err) throw err

      if (result.length > 0) {
        const data = result[0]
        res.render("viewQuestion.ejs", { data })
      } else {
        // If not found, try the old questions table
        const q2 = `SELECT * FROM questions WHERE id=?`
        connection.query(q2, [givenid], (err, result) => {
          if (err) throw err

          if (result.length > 0) {
            const data = result[0]
            res.render("viewQuestion.ejs", { data })
          } else {
            req.flash("error", "Question not found")
            res.redirect("/qa")
          }
        })
      }
    })
  } catch (err) {
    req.flash("error", "An error occurred while finding the question")
    res.redirect("/qa")
  }
})

// app.get("/answer", isAdmin, (req, res) => {
//   const q = `SELECT * FROM question ORDER BY created_at DESC`
//   try {
//     connection.query(q, (err, result) => {
//       if (err) throw err
//       const data = result
//       res.render("answer.ejs", { data })
//     })
//   } catch (err) {
//     res.send("some error occurred")
//   }
// })

// app.get("/answer/:id/edit", isAdmin, (req, res) => {
//   const { id } = req.params
//   const q = `SELECT * FROM question WHERE id=?`

//   try {
//     connection.query(q, [id], (err, result) => {
//       if (err) throw err
//       const data = result[0]
//       res.render("edit.ejs", { data })
//     })
//   } catch (err) {
//     res.send("some error with DB")
//   }
// })

// app.patch("/answer/:id", isAdmin, (req, res) => {
//   const { id } = req.params
//   const { Answers, password } = req.body
//   const pass = "Ayush"
//   console.log(Answers)

//   // Check if the question exists in the question table
//   const q1 = `SELECT * FROM question WHERE id=?`

//   try {
//     connection.query(q1, [id], (err, result) => {
//       if (err) throw err

//       if (password != pass) {
//         res.send("WRONG Password entered!")
//       } else {
//         // Update the question table
//         if (result.length > 0) {
//           const q2 = `UPDATE question SET answers=? WHERE id=?`
//           connection.query(q2, [Answers, id], (err, result) => {
//             if (err) throw err
//             console.log("Updated in question table")
//             req.flash("success", "Answer updated successfully")
//             res.redirect("/dashboard")
//           })
//         } else {
//           req.flash("error", "Question not found")
//           res.redirect("/dashboard")
//         }
//       }
//     })
//   } catch (err) {
//     res.send("some error with DB")
//   }
// })

// app.get("/answer/:id/delete", isAdmin, (req, res) => {
//   const { id } = req.params
//   const q = `SELECT * FROM question WHERE id=?`

//   try {
//     connection.query(q, [id], (err, result) => {
//       if (err) throw err
//       const question = result[0]
//       res.render("delete.ejs", { question })
//     })
//   } catch (err) {
//     res.send("some error with DB")
//   }
// })

// app.delete("/answer/:id/", isAdmin, (req, res) => {
//   const { id } = req.params
//   const { password } = req.body
//   const pass = "Ayush"
//   const q = `SELECT * FROM question WHERE id=?`

//   try {
//     connection.query(q, [id], (err, result) => {
//       if (err) throw err

//       if (pass != password) {
//         res.send("WRONG Password entered!")
//       } else {
//         const q2 = `DELETE FROM question WHERE id=?` //Query to Delete
//         connection.query(q2, [id], (err, result) => {
//           if (err) throw err
//           else {
//             console.log(result)
//             console.log("deleted!")
//             req.flash("success", "Question deleted successfully")
//             res.redirect("/dashboard")
//           }
//         })
//       }
//     })
//   } catch (err) {
//     res.send("some error with DB")
//   }
// })

// AI-powered quiz analysis endpoint
app.post("/api/analyze-quiz", async (req, res) => {
  try {
    const { answers, userProfile } = req.body

    if (!answers || answers.length === 0) {
      return res.status(400).json({ error: "No answers provided" })
    }

    // Format the user's answers for the AI prompt
    const formattedAnswers = answers
      .map((answer) => `Question: ${answer.questionId}. Category: ${answer.category}. Answer: ${answer.answer}`)
      .join("\n")

    // Create a comprehensive prompt for the AI
    const prompt = `
      You are a career guidance expert. Analyze the following quiz responses from a student seeking career advice.
      
      QUIZ RESPONSES:
      ${formattedAnswers}
      
      Based on these responses, provide:
      1. A personalized career stream recommendation (Science, Commerce, Arts, etc.)
      2. 3-5 specific career paths that match their interests and strengths
      4. Key strengths identified from their answers
      5. Suggested next steps for career exploration
      
      Format your response as a JSON object with the following structure:
      {
        "recommendation": "Your main recommendation as a paragraph",
        "details": [
          {
            "title": "Potential Careers",
            "content": "List of recommended careers"
          },
          {
            "title": "Your Strengths",
            "content": "List of identified strengths"
          },
          {
            "title": "Next Steps",
            "content": "Suggested actions for career exploration"
          }
        ]
      }
      
      Keep your response focused on career guidance for students.
    `

    // Try Google's Gemini API first
    const geminiApiKey = process.env.GEMINI_API_KEY

    if (geminiApiKey) {
      try {
        // Initialize the Gemini API
        const genAI = new GoogleGenerativeAI(geminiApiKey)
        
        // For text-only input, use the gemini-pro model
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" })

        const result = await model.generateContent(prompt)
        const response = await result.response
        const text = response.text()

        try {
          // Extract JSON from the response
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0])
            return res.json(result)
          }
        } catch (parseError) {
          console.error("Error parsing Gemini response:", parseError)
          // Fall through to OpenAI or fallback
        }
      } catch (geminiError) {
        console.error("Error with Gemini analysis:", geminiError)
        // Fall through to OpenAI or fallback
      }
    }

    // Try OpenAI as a backup if Hugging Face fails
    const openaiApiKey = process.env.OPENAI_API_KEY

    if (openaiApiKey) {
      try {
        // Call the AI model
        const { text } = await generateText({
          model: openai("gpt-3.5-turbo"), // Use a less expensive model
          prompt: prompt,
          temperature: 0.7,
          max_tokens: 1000,
        })

        // Parse the AI response
        try {
          // Extract JSON from the response
          const jsonMatch = text.match(/\{[\s\S]*\}/)
          if (jsonMatch) {
            const result = JSON.parse(jsonMatch[0])
            return res.json(result)
          }
        } catch (parseError) {
          console.error("Error parsing OpenAI response:", parseError)
          // Fall through to the fallback analysis
        }
      } catch (aiError) {
        console.error("Error with OpenAI analysis:", aiError)
        // Fall through to the fallback analysis
      }
    }

    // If we reach here, use the enhanced fallback analysis
    const result = performBasicAnalysis(answers)
    res.json(result)
  } catch (error) {
    console.error("Error analyzing quiz:", error)
    res.status(500).json({
      error: "Failed to analyze quiz results",
      recommendation:
        "Based on your answers, you might be interested in exploring multiple career paths. Consider consulting with a career counselor for personalized advice.",
      details: [
        {
          title: "Next Steps",
          content:
            "Try retaking the quiz or explore our streams information pages for more details about different career paths.",
        },
      ],
    })
  }
})

// Fallback analysis function
function performBasicAnalysis(answers) {
  // Simple algorithm as fallback (similar to the client-side one)
  const categories = {
    science: 0,
    commerce: 0,
    arts: 0,
    technology: 0,
    healthcare: 0,
    social: 0,
  }

  // Map answers to categories (simplified version)
  answers.forEach((answer) => {
    const value = answer.answer

    if (["Mathematics", "Biology", "Solving complex problems", "Conducting experiments"].includes(value)) {
      categories.science++
    }

    if (["Economics", "Analyzing market trends", "Running a business"].includes(value)) {
      categories.commerce++
    }

    if (["Literature", "Creative writing", "In a creative field"].includes(value)) {
      categories.arts++
    }

    // Add more mappings as needed
  })

  // Find top category
  const topCategory = Object.entries(categories).sort((a, b) => b[1] - a[1])[0][0]

  // Generate basic recommendation
  const recommendations = {
    science: {
      recommendation: "Based on your answers, you might be well-suited for the Science stream.",
      careers: "Research Scientist, Data Analyst, Environmental Scientist",
      strengths: "Analytical thinking, Problem-solving, Attention to detail",
    },
    commerce: {
      recommendation: "Based on your answers, you might be well-suited for the Commerce stream.",
      careers: "Business Analyst, Financial Advisor, Marketing Specialist",
      strengths: "Business acumen, Numerical skills, Strategic thinking",
    },
    arts: {
      recommendation: "Based on your answers, you might be well-suited for the Arts stream.",
      careers: "Content Creator, Graphic Designer, Journalist",
      strengths: "Creativity, Communication skills, Artistic expression",
    },
    // Add more recommendations as needed
  }

  const result = recommendations[topCategory] || {
    recommendation:
      "Your interests seem diverse. Consider exploring multiple streams or consult with a career counselor for personalized advice.",
    careers: "Various fields based on your diverse interests",
    strengths: "Adaptability, Diverse skill set",
  }

  return {
    recommendation: result.recommendation,
    details: [
      {
        title: "Potential Careers",
        content: result.careers,
      },
      {
        title: "Your Strengths",
        content: result.strengths,
      },
      {
        title: "Next Steps",
        content: "Consider researching specific careers in this field and the educational requirements for each.",
      },
    ],
  }
}







app.listen(port, () => {
    console.log("Listening on port : 8080");
});