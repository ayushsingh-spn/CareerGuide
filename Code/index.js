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
  // Get questions from the question table
  const q = `SELECT * FROM question ORDER BY created_at DESC LIMIT 10;`

  connection.query(q, (err, result) => {
    if (err) {
      console.error("Error fetching questions:", err)
      req.flash("error", "An error occurred while loading questions")
      return res.render("dashboard", { questions: [] })
    }

    // Count total questions
    connection.query("SELECT COUNT(*) as total FROM question", (err, countResult) => {
      if (err) {
        console.error("Error counting questions:", err)
        return res.render("dashboard", { questions: result, totalQuestions: 0 })
      }

      // Count answered questions
      connection.query(
        "SELECT COUNT(*) as answered FROM question WHERE answers IS NOT NULL AND answers != ''",
        (err, answeredResult) => {
          if (err) {
            console.error("Error counting answered questions:", err)
            return res.render("dashboard", {
              questions: result,
              totalQuestions: countResult[0].total,
              answeredQuestions: 0,
            })
          }

          // Count users
          connection.query("SELECT COUNT(*) as total FROM users WHERE is_admin = 0", (err, usersResult) => {
            if (err) {
              console.error("Error counting users:", err)
              return res.render("dashboard", {
                questions: result,
                totalQuestions: countResult[0].total,
                answeredQuestions: answeredResult[0].answered,
                totalUsers: 0,
              })
            }

            res.render("dashboard", {
              questions: result,
              totalQuestions: countResult[0].total,
              answeredQuestions: answeredResult[0].answered,
              totalUsers: usersResult[0].total,
            })
          })
        },
      )
    })
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

app.get("/answer", isAdmin, (req, res) => {
  const q = `SELECT * FROM question ORDER BY created_at DESC`
  try {
    connection.query(q, (err, result) => {
      if (err) throw err
      const data = result
      res.render("answer.ejs", { data })
    })
  } catch (err) {
    res.send("some error occurred")
  }
})

app.get("/answer/:id/edit", isAdmin, (req, res) => {
  const { id } = req.params
  const q = `SELECT * FROM question WHERE id=?`

  try {
    connection.query(q, [id], (err, result) => {
      if (err) throw err
      const data = result[0]
      res.render("edit.ejs", { data })
    })
  } catch (err) {
    res.send("some error with DB")
  }
})

app.patch("/answer/:id", isAdmin, (req, res) => {
  const { id } = req.params
  const { Answers, password } = req.body
  const pass = "Ayush"
  console.log(Answers)

  // Check if the question exists in the question table
  const q1 = `SELECT * FROM question WHERE id=?`

  try {
    connection.query(q1, [id], (err, result) => {
      if (err) throw err

      if (password != pass) {
        res.send("WRONG Password entered!")
      } else {
        // Update the question table
        if (result.length > 0) {
          const q2 = `UPDATE question SET answers=? WHERE id=?`
          connection.query(q2, [Answers, id], (err, result) => {
            if (err) throw err
            console.log("Updated in question table")
            req.flash("success", "Answer updated successfully")
            res.redirect("/answer")
          })
        } else {
          req.flash("error", "Question not found")
          res.redirect("/answer")
        }
      }
    })
  } catch (err) {
    res.send("some error with DB")
  }
})

app.get("/answer/:id/delete", isAdmin, (req, res) => {
  const { id } = req.params
  const q = `SELECT * FROM question WHERE id=?`

  try {
    connection.query(q, [id], (err, result) => {
      if (err) throw err
      const question = result[0]
      res.render("delete.ejs", { question })
    })
  } catch (err) {
    res.send("some error with DB")
  }
})

app.delete("/answer/:id/", isAdmin, (req, res) => {
  const { id } = req.params
  const { password } = req.body
  const pass = "Ayush"
  const q = `SELECT * FROM question WHERE id=?`

  try {
    connection.query(q, [id], (err, result) => {
      if (err) throw err

      if (pass != password) {
        res.send("WRONG Password entered!")
      } else {
        const q2 = `DELETE FROM question WHERE id=?` //Query to Delete
        connection.query(q2, [id], (err, result) => {
          if (err) throw err
          else {
            console.log(result)
            console.log("deleted!")
            req.flash("success", "Question deleted successfully")
            res.redirect("/answer")
          }
        })
      }
    })
  } catch (err) {
    res.send("some error with DB")
  }
})









app.listen(port, () => {
    console.log("Listening on port : 8080");
});