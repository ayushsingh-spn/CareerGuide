// Required external modules for database, server, and utility functions
const mysql = require('mysql2'); // MySQL client for connecting to the database
const express = require("express"); // Express framework for building web applications
const app = express(); // Creates an Express application
const port = 8080; // Port on which the server will listen
const path = require("path"); // Node.js module for handling file paths
const session = require("express-session") // Middleware for handling user sessions
const methodOverride = require("method-override"); // Allows overriding HTTP methods (e.g., PUT, DELETE via POST)
const { v4: uuidv4 } = require("uuid"); // For generating unique user IDs
const bcrypt = require("bcrypt"); // For hashing passwords securely
const flash = require("connect-flash"); // For storing temporary flash messages between requests
const crypto = require("crypto") // For generating secure random tokens (used in verification/password reset)
const { sendVerificationEmail, sendPasswordResetEmail } = require('../Code/public/JS/mailer'); // Custom module for sending emails
const { generateText } = require("ai") // AI SDK function for generating text (likely OpenAI or Gemini)
const { openai } = require("@ai-sdk/openai") // OpenAI integration
const dotenv = require("dotenv") // Load environment variables from .env file
const { GoogleGenerativeAI } = require('@google/generative-ai'); // Google Generative AI SDK
const multer = require("multer") // Middleware for handling multipart/form-data (e.g., file uploads)
const upload = multer({ dest: "public/uploads/" }) // Configure file uploads to be stored in /public/uploads/


// Load environment variables from .env file into process.env
dotenv.config()

// Middleware to parse incoming JSON payloads
app.use(express.json())

// Middleware to parse URL-encoded data (from form submissions)
app.use(express.urlencoded({ extended: true }));

// Middleware to allow HTTP verbs such as PUT or DELETE where the client doesn’t support it
// It looks for a query parameter like `_method=DELETE` to override the original POST
app.use(methodOverride("_method"));

// Session configuration to maintain user login sessions
app.use(
  session({
    secret: "career-guidance-secret-key", // Secret key to sign session ID cookies
    resave: false, // Prevents session from being saved back to the store if unmodified
    saveUninitialized: false, // Don’t save empty sessions (no data) to the store
    cookie: { maxAge: 24 * 60 * 60 * 1000 }, // Session expiration time (24 hours)
  }),
)

// Enable flash messaging middleware (stores messages in session)
app.use(flash())

// Custom middleware to expose flash messages and user session data to all EJS templates
app.use((req, res, next) => {
  res.locals.success = req.flash("success") // Success messages
  res.locals.error = req.flash("error") // Error messages
  res.locals.user = req.session.user || null // User object from session
  res.locals.isAdmin = req.session.isAdmin || false // Admin status from session
  next() // Proceed to next middleware or route
})

// Set EJS as the templating engine
app.set("view engine", "ejs");

// Set the views directory for EJS templates
app.set("views", path.join(__dirname, "views"));

// Serve static CSS files from public/CSS
app.use(express.static(path.join(__dirname, "public/CSS")));

// Serve static JavaScript files from public/JS
app.use(express.static(path.join(__dirname, "public/JS")));

// Serve static images or photos from public/Photos
app.use(express.static(path.join(__dirname, "public/Photos")));

// Establish connection to MySQL database
var connection = mysql.createConnection({
    host: 'localhost', // Database host
    user: 'root', // MySQL username
    database: 'QNA', // Name of the database to use
    password: 'Ayush186' // Password for the MySQL user
});

// Open the MySQL connection
connection.connect();


// Middleware function to protect routes from unauthenticated users
const isLoggedIn = (req, res, next) => {
  // Check if user object exists in session
  if (!req.session.user) {
    req.flash("error", "You must be logged in to access this page")
    return res.redirect("/login") // Redirect to login if not authenticated
  }
  next(); // Proceed if user is logged in
}

// Middleware function to protect admin routes from unauthorized access
const isAdmin = (req, res, next) => {
  // Check if user is logged in and is an admin
  if (!req.session.user || !req.session.isAdmin) {
    req.flash("error", "You must be an admin to access this page")
    return res.redirect("/admin/login") // Redirect to admin login if unauthorized
  }
  next(); // Proceed if user is an admin
}

// Helper function to generate a secure random token (hexadecimal string)
// Used for email verification and password reset functionality
const generateToken = () => {
  return crypto.randomBytes(32).toString("hex")
}

// Utility to calculate how long ago a given date was
// Returns a string like "2 days ago", "5 minutes ago", etc.
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

// Helper function to format a date string into a human-readable format
// Example: "April 5, 2024"
function formatDate(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

// Formats date and time string for display
// Example: "Apr 5, 2024, 04:30 PM"
function formatDatetime(dateString) {
  const date = new Date(dateString)
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

// Assigns a CSS badge class based on the booking status
// Used for UI display of booking status (pending, confirmed, etc.)
function getStatusBadgeClass(status) {
  switch (status) {
    case "pending":
      return "warning"
    case "confirmed":
      return "primary"
    case "completed":
      return "success"
    case "cancelled":
      return "danger"
    default:
      return "secondary" // Default fallback class
  }
}


// Route to handle user registration (sign-up form submission)
app.post("/signup", async (req, res) => {
  try {
    // Destructure user input fields from the request body
    const { name, email, password, confirmPassword } = req.body

    // Check for missing input fields
    if (!name || !email || !password || !confirmPassword) {
      req.flash("error", "All fields are required")
      return res.redirect("/signup") // Redirect back if fields are missing
    }

    // Check if passwords match
    if (password !== confirmPassword) {
      req.flash("error", "Passwords do not match")
      return res.redirect("/signup") // Redirect back if passwords differ
    }

    // Check if the email already exists in the database
    connection.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) throw err

      // If user with email already exists, redirect with error
      if (results.length > 0) {
        req.flash("error", "Email already in use")
        return res.redirect("/signup")
      }

      // Securely hash the user's password using bcrypt
      const hashedPassword = await bcrypt.hash(password, 10)

      // Generate a new unique ID for the user
      const id = uuidv4()

      // Generate a unique email verification token and its expiration time (24 hours)
      const verificationToken = generateToken()
      const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

      // Prepare SQL query to insert new user into the database
      const q = `INSERT INTO users (id, name, email, password, verification_token, verification_expiry) 
                VALUES (?, ?, ?, ?, ?, ?)`

      // Execute the insert query with values
      connection.query(
        q,
        [id, name, email, hashedPassword, verificationToken, verificationExpiry],
        async (err, result) => {
          if (err) throw err

          // Send verification email to the new user
          const emailSent = await sendVerificationEmail(email, verificationToken, name)

          // Flash success message depending on whether the email was sent
          if (emailSent) {
            req.flash("success", "Registration successful! Please check your email to verify your account.")
          } else {
            req.flash(
              "success",
              "Registration successful! However, we couldn't send a verification email. Please contact support.",
            )
          }

          // Redirect to login page after successful registration
          res.redirect("/login")
        },
      )
    })
  } catch (error) {
    // Catch and log any errors during the registration process
    console.error("Error during signup:", error)
    req.flash("error", "An error occurred during signup")
    res.redirect("/signup")
  }
})


// Route to handle email verification when user clicks the verification link
app.get("/verify-email", (req, res) => {
  const { token } = req.query // Extract token from query string

  // If token is missing, render failure view
  if (!token) {
    return res.render("verify-email", {
      verified: false,
      expired: false,
      email: "",
      layout: "auth-layout", // Uses a specific layout for authentication pages
    })
  }

  // Query the database to find a user with the given verification token
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

    // If no user is found with the token, show failure
    if (results.length === 0) {
      return res.render("verify-email", {
        verified: false,
        expired: false,
        email: "",
        layout: "auth-layout",
      })
    }

    const user = results[0] // Get user record
    const now = new Date()
    const expiryDate = new Date(user.verification_expiry)

    // If token has expired, render view with expiration message
    if (now > expiryDate) {
      return res.render("verify-email", {
        verified: false,
        expired: true,
        email: user.email,
        layout: "auth-layout",
      })
    }

    // Mark user as verified and remove token/expiry from DB
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

        // Show success message if verification succeeded
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


// Route to resend verification email manually (e.g. if original link expired)
app.post("/resend-verification", async (req, res) => {
  const { email } = req.body // Get email input

  // If email is not provided, show error
  if (!email) {
    req.flash("error", "Email is required")
    return res.redirect("/login")
  }

  // Check if a user with that email exists
  connection.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) {
      console.error("Error finding user:", err)
      req.flash("error", "An error occurred. Please try again.")
      return res.redirect("/login")
    }

    // If user does not exist, show generic error (to prevent info leakage)
    if (results.length === 0) {
      req.flash("error", "No account found with that email address")
      return res.redirect("/login")
    }

    const user = results[0]

    // If email already verified, no need to send again
    if (user.email_verified) {
      req.flash("success", "Your email is already verified. You can log in.")
      return res.redirect("/login")
    }

    // Generate a new token and expiry for re-verification
    const verificationToken = generateToken()
    const verificationExpiry = new Date(Date.now() + 24 * 60 * 60 * 1000)

    // Save the new token and expiry in the database
    connection.query(
      "UPDATE users SET verification_token = ?, verification_expiry = ? WHERE id = ?",
      [verificationToken, verificationExpiry, user.id],
      async (err, result) => {
        if (err) {
          console.error("Error updating verification token:", err)
          req.flash("error", "An error occurred. Please try again.")
          return res.redirect("/login")
        }

        // Attempt to send the verification email
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


// Route to handle user login (standard user login form)
app.post("/login", (req, res) => {
  try {
    const { email, password } = req.body // Extract email and password from request

    // Validate input: both fields must be filled
    if (!email || !password) {
      req.flash("error", "Email and password are required")
      return res.redirect("/login")
    }

    // Query database to find user by email
    connection.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) throw err

      // If no user found, send error
      if (results.length === 0) {
        req.flash("error", "Invalid email or password")
        return res.redirect("/login")
      }

      const user = results[0]

      // Compare input password with hashed password in DB using bcrypt
      const isPasswordMatch = await bcrypt.compare(password, user.password)

      if (!isPasswordMatch) {
        req.flash("error", "Invalid email or password")
        return res.redirect("/login")
      }

      // If user is not an admin and email is not verified, prompt them to verify
      if (!user.is_admin && !user.email_verified) {
        req.flash(
          "error",
          "Please verify your email before logging in. <a href='/resend-verification?email=" +
            email +
            "'>Resend verification email</a>",
        )
        return res.redirect("/login")
      }

      // Set user session with user info (excluding password)
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
      }

      // Set admin session flag
      req.session.isAdmin = user.is_admin === 1

      req.flash("success", "Logged in successfully")

      // Redirect to homepage (or dashboard if admin, handled elsewhere)
      res.redirect("/")
    })
  } catch (error) {
    // Catch any unexpected server errors
    console.error("Error during login:", error)
    req.flash("error", "An error occurred during login")
    res.redirect("/login")
  }
})


// Route to render the "Forgot Password" page
app.get("/forgot-password", (req, res) => {
  res.render("forgot-password", { layout: "auth-layout" }) // Uses auth layout template
})

// Route to handle submission of the "Forgot Password" form
app.post("/forgot-password", (req, res) => {
  const { email } = req.body // Extract email from request

  // If email is missing, redirect with error
  if (!email) {
    req.flash("error", "Email is required")
    return res.redirect("/forgot-password")
  }

  // Search for a user with the given email
  connection.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) {
      console.error("Error finding user:", err)
      req.flash("error", "An error occurred. Please try again.")
      return res.redirect("/forgot-password")
    }

    // Always show a success message (even if email doesn't exist)
    // This prevents attackers from determining valid emails
    if (results.length === 0) {
      req.flash("success", "If an account with that email exists, we've sent a password reset link.")
      return res.redirect("/forgot-password")
    }

    const user = results[0]

    // Generate a secure reset token and its expiry time (1 hour from now)
    const resetToken = generateToken()
    const resetTokenExpiry = new Date(Date.now() + 1 * 60 * 60 * 1000)

    // Save the token and expiry in the database for the user
    connection.query(
      "UPDATE users SET reset_token = ?, reset_token_expiry = ? WHERE id = ?",
      [resetToken, resetTokenExpiry, user.id],
      async (err, result) => {
        if (err) {
          console.error("Error updating reset token:", err)
          req.flash("error", "An error occurred. Please try again.")
          return res.redirect("/forgot-password")
        }

        // Send the password reset email to the user
        const emailSent = await sendPasswordResetEmail(user.email, resetToken, user.name)

        // Always show a generic success message
        req.flash("success", "If an account with that email exists, we've sent a password reset link.")
        res.redirect("/forgot-password")
      },
    )
  })
})


// Route to render the "Reset Password" page using token from the email link
app.get("/reset-password", (req, res) => {
  const { token } = req.query // Extract reset token from query

  // If no token is provided, redirect to login
  if (!token) {
    req.flash("error", "Invalid or missing reset token")
    return res.redirect("/login")
  }

  // Verify the token against the database
  connection.query("SELECT * FROM users WHERE reset_token = ?", [token], (err, results) => {
    if (err) {
      console.error("Error verifying reset token:", err)
      req.flash("error", "An error occurred. Please try again.")
      return res.redirect("/login")
    }

    // If token not found or invalid
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

    // If token is valid and not expired, render reset password form
    res.render("reset-password", {
      token: token,
      error: req.flash("error"),
      layout: "auth-layout",
    })
  })
})


// Route to handle submission of new password after reset
app.post("/reset-password", async (req, res) => {
  const { token, password, confirmPassword } = req.body // Extract form data

  // Validate input fields
  if (!token || !password || !confirmPassword) {
    req.flash("error", "All fields are required")
    return res.redirect(`/reset-password?token=${token}`)
  }

  // Ensure passwords match
  if (password !== confirmPassword) {
    req.flash("error", "Passwords do not match")
    return res.redirect(`/reset-password?token=${token}`)
  }

  // Check token validity in database
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

    // Token expiration check
    if (now > expiryDate) {
      req.flash("error", "Reset token has expired. Please request a new one.")
      return res.redirect("/forgot-password")
    }

    // Hash the new password before saving
    const hashedPassword = await bcrypt.hash(password, 10)

    // Update the user password and clear the reset token fields
    connection.query(
      "UPDATE users SET password = ?, reset_token = NULL, reset_token_expiry = NULL WHERE id = ?",
      [hashedPassword, user.id],
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


// Route to handle admin login submission
app.post("/admin/login", (req, res) => {
  try {
    const { email, password } = req.body // Get form input

    // Validate required fields
    if (!email || !password) {
      req.flash("error", "Email and password are required")
      return res.redirect("/login") // Redirect to login form if missing input
    }

    // Query database for user with given email
    connection.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
      if (err) throw err

      // If no user found, credentials are invalid
      if (results.length === 0) {
        req.flash("error", "Invalid email or password")
        return res.redirect("/login")
      }

      const user = results[0]

      // Compare provided password with hashed password from DB
      const isPasswordMatch = await bcrypt.compare(password, user.password)
      if (!isPasswordMatch) {
        req.flash("error", "Invalid email or password")
        return res.redirect("/login")
      }

      // Set session variables for authenticated user
      req.session.user = {
        id: user.id,
        name: user.name,
        email: user.email,
      }

      // Set admin flag if user is marked as admin in DB
      req.session.isAdmin = user.is_admin === 1

      // If the user is not actually an admin, deny access
      if (!req.session.isAdmin) {
        req.flash("error", "You must be an admin to access this page")
        return res.redirect("/admin/login")
      }

      req.flash("success", "Logged in successfully")

      // Redirect to admin dashboard upon successful login
      if (user.is_admin === 1) {
        res.redirect("/dashboard")
      }
    })
  } catch (error) {
    // Handle unexpected server errors
    console.error("Error during login:", error)
    req.flash("error", "An error occurred during login")
    res.redirect("/login")
  }
})


// Route to destroy the session and log the user out
app.get("/logout", (req, res) => {
  req.session.destroy() // Clear session data
  res.redirect("/login") // Redirect to login page
})


// Route to display the logged-in user's profile page
app.get("/profile", isLoggedIn, (req, res) => {
  // First query: fetch the logged-in user's basic information
  connection.query("SELECT * FROM users WHERE id = ?", [req.session.user.id], (err, userResults) => {
    if (err) {
      console.error("Error fetching user:", err)
      req.flash("error", "An error occurred while loading your profile")
      return res.redirect("/") // Redirect if query fails
    }

    const user = userResults[0] // Store user details

    // Second query: fetch questions submitted by the user
    connection.query(
      "SELECT * FROM question WHERE user_id = ? ORDER BY created_at DESC",
      [req.session.user.id],
      (err, questionResults) => {
        if (err) {
          console.error("Error fetching questions:", err)
          req.flash("error", "An error occurred while loading your questions")
          return res.render("profile", { user, userQuestions: [], userBookings: [] })
        }

        // Third query: fetch mentor bookings made by the user
        connection.query(
          "SELECT mb.*, m.name AS mentor_name FROM mentor_bookings mb JOIN mentors m ON mb.mentor_id = m.id WHERE mb.user_id = ? ORDER BY mb.created_at DESC",
          [req.session.user.id],
          (err, bookingResults) => {
            if (err) {
              console.error("Error fetching bookings:", err)
              req.flash("error", "An error occurred while loading your bookings")
              return res.render("profile", { user, userQuestions: questionResults, userBookings: bookingResults })
            }

            // Fourth and final query: fetch quiz results submitted by the user
            connection.query(
              "SELECT * FROM quiz_results WHERE user_id = ? ORDER BY created_at DESC",
              [req.session.user.id],
              (err, quizResults) => {
                if (err) {
                  console.error("Error fetching quiz results:", err)
                  req.flash("error", "An error occurred while loading your quiz results")
                  return res.render("profile", {
                    user,
                    userQuestions: questionResults,
                    userBookings: bookingResults,
                    quizResults: [] // Return empty array on failure
                  })
                }

                // Render the profile page with all user-related data
                res.render("profile", {
                  user,
                  userQuestions: questionResults,
                  userBookings: bookingResults,
                  quizResults: quizResults
                })
              }
            )
          }
        )
      }
    )
  })
})

// Route to handle user profile update form submission
app.post("/profile-update", isLoggedIn, (req, res) => {
  const { name, age, phone, school } = req.body // Extract updated fields from form
  const userId = req.session.user.id // Get the currently logged-in user's ID

  // Basic validation: name field must not be empty
  if (!name || name.trim() === "") {
    req.flash("error", "Name is required")
    return res.redirect("/profile")
  }

  // Prepare SQL query to update user details
  const query = `UPDATE users SET name = ?, age = ?, phone = ?, school = ? WHERE id = ?`

  // Execute update query with provided values (null if any optional field is left empty)
  connection.query(query, [name, age || null, phone || null, school || null, userId], (err, result) => {
    if (err) {
      console.error("Error updating profile:", err)
      req.flash("error", "An error occurred while updating your profile")
      return res.redirect("/profile")
    }

    // Update user's session data with new name to reflect changes immediately
    req.session.user.name = name

    req.flash("success", "Profile updated successfully")
    res.redirect("/profile")
  })
})


// Route to render the admin dashboard page
app.get("/dashboard", isAdmin, (req, res) => {

  // Make the timeSince helper available inside EJS views
  res.locals.timeSince = timeSince;

  // Query to fetch the 5 most recent questions
  const q = `SELECT * FROM question ORDER BY created_at DESC LIMIT 5;`;

  connection.query(q, (err, questions) => {
    if (err) {
      console.error("Error fetching questions:", err);
      req.flash("error", "An error occurred while loading questions");
      return res.render("admin/dashboard.ejs", { questions: [], recentUsers: [] });
    }

    // Count total number of questions
    connection.query("SELECT COUNT(*) as total FROM question", (err, countResult) => {
      if (err) {
        console.error("Error counting questions:", err);
        return res.render("admin/dashboard", {
          questions,
          totalQuestions: 0,
          recentUsers: [],
        });
      }

      const totalQuestions = countResult[0].total;

      // Count how many questions have been answered (non-empty answers)
      connection.query(
        "SELECT COUNT(*) as answered FROM question WHERE answers IS NOT NULL AND answers != ''",
        (err, answeredResult) => {
          if (err) {
            console.error("Error counting answered questions:", err);
            return res.render("admin/dashboard", {
              questions,
              totalQuestions,
              answeredQuestions: 0,
              pendingQuestions: totalQuestions,
              recentUsers: [],
            });
          }

          const answeredQuestions = answeredResult[0].answered;
          const pendingQuestions = totalQuestions - answeredQuestions;

          // Count total number of regular users (non-admins)
          connection.query("SELECT COUNT(*) as total FROM users WHERE is_admin = 0", (err, usersResult) => {
            if (err) {
              console.error("Error counting users:", err);
              return res.render("admin/dashboard", {
                questions,
                totalQuestions,
                answeredQuestions,
                pendingQuestions,
                totalUsers: 0,
                recentUsers: [],
                mentors: [],
                bookings: {}
              });
            }

            const totalUsers = usersResult[0].total;

            // Fetch 5 most recently registered users
            connection.query(
              "SELECT id, name, email, created_at, email_verified FROM users WHERE is_admin = 0 ORDER BY created_at DESC LIMIT 5",
              (err, recentUsers) => {
                if (err) {
                  console.error("Error fetching recent users:", err);
                  return res.render("admin/dashboard", {
                    questions,
                    totalQuestions,
                    answeredQuestions,
                    pendingQuestions,
                    totalUsers,
                    recentUsers: [],
                    mentors: [],
                    bookings: {}
                  });
                }

                // Count how many mentors exist in the system
                connection.query("SELECT COUNT(*) as total FROM mentors", (err, mentorsResult) => {
                  const totalMentors = err ? 0 : mentorsResult[0].total;

                  // Fetch 3 most recently added mentors
                  connection.query(
                    "SELECT id, name, specialty, image FROM mentors ORDER BY created_at DESC LIMIT 3",
                    (err, mentors) => {
                      const recentMentors = err ? [] : mentors;

                      // Count bookings grouped by their status (e.g., pending, confirmed)
                      connection.query(
                        "SELECT status, COUNT(*) as count FROM mentor_bookings GROUP BY status",
                        (err, bookingStats) => {
                          const bookings = {
                            total: 0,
                            pending: 0,
                            confirmed: 0,
                            completed: 0,
                            cancelled: 0
                          };

                          if (!err && bookingStats) {
                            bookingStats.forEach(stat => {
                              bookings[stat.status] = stat.count;
                              bookings.total += stat.count;
                            });
                          }

                          // Fetch 5 most recent mentor bookings (with user and mentor names)
                          connection.query(
                            `SELECT mb.*, u.name as user_name, m.name as mentor_name
                             FROM mentor_bookings mb
                             JOIN users u ON mb.user_id = u.id
                             JOIN mentors m ON mb.mentor_id = m.id
                             ORDER BY mb.created_at DESC LIMIT 5`,
                            (err, recentBookings) => {
                              if (err) {
                                console.error("Error fetching recent bookings:", err);
                                recentBookings = [];
                              }

                              // Render the dashboard with all collected data
                              res.render("admin/dashboard", {
                                questions,
                                totalQuestions,
                                answeredQuestions,
                                pendingQuestions,
                                totalUsers,
                                recentUsers,
                                totalMentors,
                                recentMentors,
                                bookings,
                                recentBookings
                              });
                            }
                          );
                        }
                      );
                    }
                  );
                });
              }
            );
          });
        }
      );
    });
  });
});


// Route to display all non-admin users in the admin panel
app.get("/admin/users", isAdmin, (req, res) => {
  connection.query(
    "SELECT id, name, email, created_at, email_verified FROM users WHERE is_admin = 0 ORDER BY created_at DESC",
    (err, users) => {
      if (err) {
        console.error("Error fetching users:", err)
        req.flash("error", "An error occurred while loading users")
        return res.render("admin/users", { users: [] })
      }

      // Render the admin user list view
      res.render("admin/users", { users })
    },
  )
})


// Route to view a specific user's full profile and their questions
app.get("/admin/users/:id", isAdmin, (req, res) => {
  const { id } = req.params

  // Query to get user information by ID
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

    // Fetch all questions posted by this user
    connection.query("SELECT * FROM question WHERE user_id = ? ORDER BY created_at DESC", [id], (err, questions) => {
      if (err) {
        console.error("Error fetching user questions:", err)
        return res.render("admin/user-detail", { user, questions: [] })
      }

      // Render the admin user detail view with user and their questions
      res.render("admin/user-detail", { user, questions })
    })
  })
})

// Route to render the edit form for a specific user
app.get("/admin/users/:id/edit", isAdmin, (req, res) => {
  const { id } = req.params

  // Query to fetch the user record by ID
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
    res.render("admin/edit-user", { user }) // Show edit form with prefilled user data
  })
})


// Route to handle admin update submission for user profile
app.post("/admin/users/:id", isAdmin, async (req, res) => {
  const { id } = req.params
  const { name, email, password, email_verified } = req.body
  const isVerified = email_verified === "on" // Checkbox field handling

  try {
    // First, fetch the existing user
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

      // If the email is being changed, check if it's already used by another user
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

      // Start building the SQL query and values array
      let updateQuery = "UPDATE users SET name = ?, email = ?, email_verified = ?"
      const queryParams = [name, email, isVerified]

      // If a new password is provided, hash it and include it in update
      if (password && password.trim() !== "") {
        const hashedPassword = await bcrypt.hash(password, 10)
        updateQuery += ", password = ?"
        queryParams.push(hashedPassword)
      }

      // Finalize the query with WHERE clause
      updateQuery += " WHERE id = ?"
      queryParams.push(id)

      // Execute the update query
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


// Route to display all questions in the admin panel
app.get("/admin/questions", isAdmin, (req, res) => {
  connection.query("SELECT * FROM question ORDER BY created_at DESC", (err, questions) => {
    if (err) {
      console.error("Error fetching questions:", err)
      req.flash("error", "An error occurred while loading questions")
      return res.render("admin/questions", { questions: [] })
    }

    // Render the question management view with the list of all questions
    res.render("admin/questions", { questions })
  })
})


// Route to view a specific question and its associated user
app.get("/admin/questions/:id", isAdmin, (req, res) => {
  const { id } = req.params

  // Fetch question details by ID
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

    // If the question has a linked user, fetch that user's info
    if (question.user_id) {
      connection.query("SELECT * FROM users WHERE id = ?", [question.user_id], (err, userResults) => {
        if (err) {
          console.error("Error fetching user:", err)
          return res.render("admin/question-detail", { question, userData: null, userQuestions: [] })
        }

        const userData = userResults.length > 0 ? userResults[0] : null

        // If user exists, fetch all their questions
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
          // If no user data found, render without additional questions
          res.render("admin/question-detail", { question, userData: null, userQuestions: [] })
        }
      })
    } else {
      // Question not associated with a specific user
      res.render("admin/question-detail", { question, userData: null, userQuestions: [] })
    }
  })
})

// Route to render the admin edit form for a specific question
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
    res.render("admin/edit-question", { question }) // Show the edit form
  })
})

// Route to handle form submission to update a question's answer
app.post("/admin/questions/:id", isAdmin, (req, res) => {
  const { id } = req.params
  const { answer } = req.body

  // Validation: answer cannot be empty
  if (!answer || answer.trim() === "") {
    req.flash("error", "Answer cannot be empty")
    return res.redirect(`/admin/questions/${id}/edit`)
  }

  // Update the answer for the selected question
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

// Route to render confirmation page for deleting a question
app.get("/admin/questions/:id/delete", isAdmin, (req, res) => {
  const { id } = req.params

  // Fetch question to confirm it exists before deletion
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
    res.render("admin/delete-question", { question }) // Render deletion confirmation view
  })
})

// Route to handle actual deletion of a question from the DB
app.delete("/admin/questions/:id", isAdmin, (req, res) => {
  const { id } = req.params

  // Execute SQL DELETE command
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

// Route to render the home page
app.get("/", (req, res) => {
  res.render('index'); // Load index.ejs view
});

// Route to render the streams page
app.get("/streams", (req, res) => {
  res.render('streams'); // Load streams.ejs view
});

// Route to render the career quiz page
app.get("/quiz", (req, res) => {
  res.render('quiz'); // Load quiz.ejs view
});

// Route to render the stream comparison page
app.get("/compare", (req, res) => {
  res.render('compare'); // Load compare.ejs view
});

// Route to render the testimonials page
app.get("/testimonials", (req, res) => {
  res.render('testimonials'); // Load testimonials.ejs view
});

// Route to render the scholarships page
app.get("/scholarships", (req, res) => {
  res.render('scholarships'); // Load scholarships.ejs view
});

// Route to render the info page for parents
app.get("/parents", (req, res) => {
  res.render('parents'); // Load parents.ejs view
});

// Route to render the user signup page
app.get("/signup", (req, res) => {
  res.render('signup', { layout: "auth-layout" }); // Use the authentication layout
});

// Route to render the user login page
app.get("/login", (req, res) => {
  res.render('login', { layout: "auth-layout" }); // Use the authentication layout
});

// Route to render the admin login page
app.get("/admin/login", (req, res) => {
  res.render("admin-login", { layout: "auth-layout" }); // Use the authentication layout
});


// Route to render the QA (question & answer) listing page
app.get("/qa", (req, res) => {
  let { id } = req.params;
  let q = `SELECT * FROM question;`; // Query to select all questions

  try {
    connection.query(q, (err, result) => {
      if (err) throw err;
      let questions = result[0]; // Incorrectly tries to use first result only
      res.render("qa", { questions }); // Render all questions to qa.ejs
    });
  } catch (err) {
    res.send("some error with DB");
  }
});

// Route to handle submission of a new question
app.post("/qa_added", (req, res) => {
  // Require login to ask a question
  if (!req.session.user) {
    req.flash("error", "You must be logged in to ask a question")
    return res.redirect("/login")
  }

  const { question } = req.body

  // Ensure question content is not empty
  if (!question || question.trim() === "") {
    req.flash("error", "Question cannot be empty")
    return res.redirect("/qa")
  }

  // Insert the question into the DB with user's info
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
});

// Route to find a specific question by ID
app.get("/qa/:id", (req, res) => {
  const { givenid } = req.query // ID passed as query string

  // First, look for the question in the main `question` table
  const q1 = `SELECT * FROM question WHERE id=?`

  try {
    connection.query(q1, [givenid], (err, result) => {
      if (err) throw err

      if (result.length > 0) {
        const data = result[0]
        return res.render("viewQuestion.ejs", { data }) // Show the question view
      } else {
        // If not found, try fallback old `questions` table
        const q2 = `SELECT * FROM questions WHERE id=?`
        connection.query(q2, [givenid], (err, result) => {
          if (err) throw err

          if (result.length > 0) {
            const data = result[0]
            return res.render("viewQuestion.ejs", { data }) // Show question from backup table
          } else {
            req.flash("error", "Question not found")
            return res.redirect("/qa")
          }
        })
      }
    })
  } catch (err) {
    req.flash("error", "An error occurred while finding the question")
    res.redirect("/qa")
  }
});

// Register helper functions as global template variables
app.locals.formatDate = formatDate; // Human-readable date (e.g., April 5, 2024)
app.locals.formatDatetime = formatDatetime; // Date + time formatted
app.locals.getStatusBadgeClass = getStatusBadgeClass; // UI badge for status



// Route to handle quiz submission and analyze responses via AI or fallback logic
app.post("/api/analyze-quiz", async (req, res) => {
  try {
    console.log("📩 Received quiz submission.");

    const { answers, userProfile } = req.body;

    // Ensure session exists and user is authenticated
    if (!req.session || !req.session.user || !req.session.user.id) {
      console.log("❌ No session.");
      return res.status(403).json({ error: "You must be logged in to take the quiz." });
    }

    const userId = req.session.user.id;

    // Validate presence of answers
    if (!answers || answers.length === 0) {
      console.log("❌ No answers provided.");
      return res.status(400).json({ error: "No answers provided" });
    }

    // Convert answer objects to a formatted string for AI prompt
    const formattedAnswers = answers
      .map(
        (answer) =>
          `Question: ${answer.questionId}. Category: ${answer.category}. Answer: ${answer.answer}`
      )
      .join("\n");

    // Prompt to be passed to the AI model for career guidance analysis
    const prompt = `
      You are a career guidance expert. Analyze the following quiz responses from a student seeking career advice.

      QUIZ RESPONSES:
      ${formattedAnswers}

      Based on these responses, provide:
      1. A personalized career stream recommendation (Science, Commerce, Arts, etc.)
      2. 3-5 specific career paths that match their interests and strengths
      3. Key strengths identified from their answers
      4. Suggested next steps for career exploration

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
    `
    let result = null;

    // ===== Gemini API Integration =====
    const geminiApiKey = process.env.GEMINI_API_KEY;
    if (geminiApiKey) {
      try {
        console.log("⚙️ Trying Gemini...");
        const genAI = new GoogleGenerativeAI(geminiApiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
        const geminiResponse = await model.generateContent(prompt);
        const text = await geminiResponse.response.text();

        // Extract JSON structure from Gemini response text
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          try {
            result = JSON.parse(jsonMatch[0]);
            console.log("✅ Gemini returned valid JSON");
          } catch (err) {
            console.error("❌ JSON parsing error:", err);
          }
        } else {
          console.log("⚠️ Gemini response did not contain JSON.");
        }
      } catch (err) {
        console.error("Gemini error:", err);
      }
    }

    // ===== OpenAI Fallback Integration =====
    if (!result && process.env.OPENAI_API_KEY) {
      try {
        console.log("⚙️ Trying OpenAI...");
        const { text } = await generateText({
          model: openai("gpt-3.5-turbo"), // Fallback model
          prompt,
          temperature: 0.7,
          max_tokens: 1000,
        });

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          console.log("✅ OpenAI returned valid JSON");
          result = JSON.parse(jsonMatch[0]);
        } else {
          console.log("⚠️ OpenAI response did not contain JSON.");
        }
      } catch (err) {
        console.error("OpenAI error:", err);
      }
    }

    // ===== Manual Fallback =====
    if (!result) {
      console.log("🛠️ Using fallback analysis.");
      result = performBasicAnalysis(answers); // Custom fallback method
    }

    console.log("📦 Final analysis result:", result);

    // Validate format before saving to database
    if (!result || !Array.isArray(result.details)) {
      console.error("❌ Invalid result format", result);
      return res.status(500).json({ error: "Invalid analysis format from AI" });
    }

    // Extract and map the response fields
    const detailsMap = {};
    result.details.forEach((d) => {
      detailsMap[d.title] = d.content;
    });

    const recommendation = result.recommendation;
    const potentialCareers = detailsMap["Potential Careers"] || null;
    const strengths = detailsMap["Your Strengths"] || null;
    const nextSteps = detailsMap["Next Steps"] || null;

    console.log("📝 Saving quiz result to DB...");
    console.log({
      userId,
      answers: JSON.stringify(answers),
      recommendation,
      potentialCareers,
      strengths,
      nextSteps,
    });

    // Save the analyzed result into `quiz_results` table
    connection.query(
      `
      INSERT INTO quiz_results 
      (user_id, answers, recommendation, potential_careers, strengths, next_steps)
      VALUES (?, ?, ?, ?, ?, ?)
      `,
      [
        userId,
        JSON.stringify(answers),
        recommendation || "N/A",
        potentialCareers ? JSON.stringify(potentialCareers) : "N/A",
        strengths ? JSON.stringify(strengths) : "N/A",
        nextSteps ? JSON.stringify(nextSteps) : "N/A"
      ],
      (err, resultInsert) => {
        if (err) {
          console.error("❌ DB INSERT ERROR:", err.sqlMessage || err);
          return res.status(500).json({ error: "DB insert failed", dbError: err.sqlMessage || err });
        }

        console.log("✅ DB Insert result:", resultInsert);
        res.json(result); // Return AI or fallback result to frontend
      }
    );
  } catch (error) {
    // Handle unexpected errors and return fallback suggestion
    console.error("❌ Top-level error analyzing quiz:", error);
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
    });
  }
});


// Fallback function to analyze quiz responses manually if AI APIs fail
function performBasicAnalysis(answers) {
  // Count frequency of each category (e.g., Science, Arts, Commerce)
  const categories = {
    science: 0,
    commerce: 0,
    arts: 0,
    technology: 0,
    healthcare: 0,
    social: 0,
  }

  // Identify the category with the highest count
  answers.forEach((answer) => {
    const value = answer.answer

    // Return a basic JSON structure mimicking the AI result format
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


// Route to list all available mentors (public page)
app.get("/mentors", (req, res) => {
  // Fetch all mentors from the database
  connection.query("SELECT * FROM mentors ORDER BY name", (err, mentors) => {
    if (err) {
      console.error("Error fetching mentors:", err)
      req.flash("error", "Failed to load mentors.")
      return res.render("mentors", { mentors: [], userBooking: null, user: req.session.user })
    }

    // If user is logged in, fetch their active booking if any
    if (req.session.user) {
      const userId = req.session.user.id
      const bookingQuery = `
        SELECT mb.*, m.name as mentor_name
        FROM mentor_bookings mb
        JOIN mentors m ON mb.mentor_id = m.id
        WHERE mb.user_id = ? AND mb.status IN ('pending', 'confirmed')
        LIMIT 1
      `

      connection.query(bookingQuery, [userId], (err, bookingResults) => {
        if (err) {
          console.error("Error checking user bookings:", err)
          return res.render("mentors", {
            mentors,
            userBooking: null,
            user: req.session.user,
          })
        }

        const userBooking = bookingResults.length > 0 ? bookingResults[0] : null

        // Render mentors page with active booking info
        res.render("mentors", {
          mentors,
          userBooking,
          user: req.session.user,
        })
      })
    } else {
      // If user not logged in, render mentors without booking
      res.render("mentors", {
        mentors,
        userBooking: null,
        user: null,
      })
    }
  })
})

// Book mentor page
app.get("/book-mentor/:id", isLoggedIn, (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;
  
  // First get the mentor details
  connection.query("SELECT * FROM mentors WHERE id = ?", [id], (err, mentorResults) => {
    if (err) {
      console.error("Error fetching mentor:", err);
      req.flash("error", "Failed to load mentor details.");
      return res.redirect("/mentors");
    }
    
    if (mentorResults.length === 0) {
      req.flash("error", "Mentor not found.");
      return res.redirect("/mentors");
    }
    
    const mentor = mentorResults[0];
    
    // Check if user already has a booking
    const bookingQuery = `
      SELECT mb.*, m.name as mentor_name
      FROM mentor_bookings mb
      JOIN mentors m ON mb.mentor_id = m.id
      WHERE mb.user_id = ? AND mb.status IN ('pending', 'confirmed')
    `;
    
    connection.query(bookingQuery, [userId], (err, bookingResults) => {
      if (err) {
        console.error("Error checking existing bookings:", err);
        return res.render("book-mentor", { 
          mentor, 
          existingBooking: null,
          error: "Failed to check existing bookings." 
        });
      }
      
      const existingBooking = bookingResults.length > 0 ? bookingResults[0] : null;
      
      res.render("book-mentor", { 
        mentor,
        existingBooking,
        user: req.session.user
      });
    });
  });
});

// Process mentor booking
app.post("/book-mentor/:id", isLoggedIn, (req, res) => {
  const { id } = req.params;
  const { booking_date, booking_time, notes } = req.body;
  const userId = req.session.user.id;
  
  // First check if user already has a booking
  connection.query(
    "SELECT * FROM mentor_bookings WHERE user_id = ? AND status IN ('pending', 'confirmed')",
    [userId],
    (err, existingBookings) => {
      if (err) {
        console.error("Error checking existing bookings:", err);
        req.flash("error", "Failed to process your booking request.");
        return res.redirect(`/book-mentor/${id}`);
      }
      
      if (existingBookings.length > 0) {
        req.flash("error", "You already have an active booking. Please cancel it first.");
        return res.redirect(`/book-mentor/${id}`);
      }
      
      // Check if the mentor exists
      connection.query("SELECT * FROM mentors WHERE id = ?", [id], (err, mentorResults) => {
        if (err || mentorResults.length === 0) {
          req.flash("error", "Mentor not found.");
          return res.redirect("/mentors");
        }
        

        // Convert 12-hour time format to 24-hour format for MySQL
        let formattedTime = booking_time
        try {
          // Parse the time string
          const timeParts = booking_time.match(/(\d+):(\d+)\s(AM|PM)/i)
          if (timeParts) {
            let hours = Number.parseInt(timeParts[1])
            const minutes = timeParts[2]
            const period = timeParts[3].toUpperCase()

            // Convert to 24-hour format
            if (period === "PM" && hours < 12) {
              hours += 12
            } else if (period === "AM" && hours === 12) {
              hours = 0
            }

            // Format as HH:MM:00
            formattedTime = `${hours.toString().padStart(2, "0")}:${minutes}:00`
          }
        } catch (error) {
          console.error("Error formatting time:", error)
        }

        // Create the booking
        const newBooking = {
          user_id: userId,
          mentor_id: id,
          booking_date,
          booking_time: formattedTime,
          notes,
          status: 'pending'
        };
        
        connection.query("INSERT INTO mentor_bookings SET ?", newBooking, (err, result) => {
          if (err) {
            console.error("Error creating booking:", err);
            req.flash("error", "Failed to create your booking: " + err.message)
            return res.redirect(`/book-mentor/${id}`);
          }
          
          req.flash("success", "Your session has been booked! The mentor will confirm your appointment soon.");
          res.redirect("/profile#Mentor-booking");
        });
      });
    }
  );
});

// Cancel booking
app.post("/cancel-booking/:id", isLoggedIn, (req, res) => {
  const { id } = req.params;
  const userId = req.session.user.id;
  
  // First check if the booking exists and belongs to the user
  connection.query(
    "SELECT * FROM mentor_bookings WHERE id = ? AND user_id = ?",
    [id, userId],
    (err, bookings) => {
      if (err) {
        console.error("Error finding booking:", err);
        req.flash("error", "Failed to cancel booking.");
        return res.redirect("/profile");
      }
      
      if (bookings.length === 0) {
        req.flash("error", "Booking not found or you don't have permission to cancel it.");
        return res.redirect("/profile");
      }
      
      // Update the booking status
      connection.query(
        "UPDATE mentor_bookings SET status = 'cancelled' WHERE id = ?",
        [id],
        (err, result) => {
          if (err) {
            console.error("Error cancelling booking:", err);
            req.flash("error", "Failed to cancel booking.");
            return res.redirect("/profile");
          }
          
          req.flash("success", "Your booking has been cancelled.");
          res.redirect("/profile#Mentor-booking");
        }
      );
    }
  );
});

// Update profile route to include bookings
app.get("/profile", isLoggedIn, (req, res) => {
  // First, get the user information
  connection.query("SELECT * FROM users WHERE id = ?", [req.session.user.id], (err, userResults) => {
    if (err) {
      console.error("Error fetching user:", err);
      req.flash("error", "An error occurred while loading your profile");
      return res.redirect("/");
    }

    const user = userResults[0];

    // Get the user's questions
    connection.query(
      "SELECT * FROM question WHERE user_id = ? ORDER BY created_at DESC",
      [req.session.user.id],
      (err, questionResults) => {
        if (err) {
          console.error("Error fetching questions:", err);
          req.flash("error", "An error occurred while loading your questions");
          return res.render("profile", { user, userQuestions: [], userBookings: [] });
        }
        
        // Get user's bookings
        const bookingsQuery = `
          SELECT mb.*, m.name as mentor_name, m.specialty, m.image
          FROM mentor_bookings mb
          JOIN mentors m ON mb.mentor_id = m.id
          WHERE mb.user_id = ?
          ORDER BY mb.created_at DESC
        `;
        
        connection.query(bookingsQuery, [req.session.user.id], (err, bookingResults) => {
          if (err) {
            console.error("Error fetching bookings:", err);
            return res.render("profile", { 
              user, 
              userQuestions: questionResults,
              userBookings: []
            });
          }
          
          res.render("profile", { 
            user, 
            userQuestions: questionResults,
            userBookings: bookingResults
          });
        });
      }
    );
  });
});

// Admin mentor dashboard routes
// Route to display all mentors in the admin panel
app.get("/admin/mentors", isAdmin, (req, res) => {
  // SQL query: fetch each mentor with a count of their active bookings
  const query = `
    SELECT m.*, 
           COUNT(mb.id) as active_bookings 
    FROM mentors m
    LEFT JOIN mentor_bookings mb ON m.id = mb.mentor_id AND mb.status IN ('pending', 'confirmed')
    GROUP BY m.id
    ORDER BY m.name
  `;
  
  connection.query(query, (err, mentors) => {
    if (err) {
      console.error("Error fetching mentors:", err);
      req.flash("error", "Failed to load mentors.");
      return res.render("admin/mentors", { mentors: [] });
    }

    // Render mentor list in admin panel
    res.render("admin/mentors", { mentors });
  });
});

// Render form to add a new mentor
app.get("/admin/mentors/add", isAdmin, (req, res) => {
  res.render("admin/add-mentor");
});

// Handle submission to add a new mentor to the database
app.post("/admin/mentors/add", isAdmin, upload.none(), (req, res) => {
  const { name, specialty, experience, bio, rate, availability } = req.body;

  // Prepare new mentor object
  const newMentor = {
    name,
    specialty,
    experience,
    bio,
    image: "/placeholder.svg?height=200&width=200", // Use placeholder image for now
    rate,
    availability,
    created_at: new Date()
  };
  
  // Insert new mentor into database
  connection.query("INSERT INTO mentors SET ?", newMentor, (err, result) => {
    if (err) {
      console.error("Error adding mentor:", err);
      req.flash("error", "Failed to add mentor.");
      return res.render("admin/add-mentor", { error: "Failed to add mentor." });
    }

    req.flash("success", "Mentor added successfully.");
    res.redirect("/admin/mentors");
  });
});

// View a specific mentor's details and bookings
app.get("/admin/mentors/:id", isAdmin, (req, res) => {
  const { id } = req.params;
  
  // Fetch mentor by ID
  connection.query("SELECT * FROM mentors WHERE id = ?", [id], (err, mentorResults) => {
    if (err) {
      console.error("Error fetching mentor:", err);
      req.flash("error", "Failed to load mentor details.");
      return res.redirect("/admin/mentors");
    }

    if (mentorResults.length === 0) {
      req.flash("error", "Mentor not found.");
      return res.redirect("/admin/mentors");
    }

    const mentor = mentorResults[0];

    // Get bookings for this mentor
    const bookingsQuery = `
      SELECT mb.*, u.name as user_name, u.email as user_email
      FROM mentor_bookings mb
      JOIN users u ON mb.user_id = u.id
      WHERE mb.mentor_id = ?
      ORDER BY mb.created_at DESC
    `;

    connection.query(bookingsQuery, [id], (err, bookings) => {
      if (err) {
        console.error("Error fetching bookings:", err);
        return res.render("admin/mentor-detail", { 
          mentor, 
          bookings: [],
          bookingStats: { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 }
        });
      }

      // Calculate booking statistics
      const bookingStats = bookings.reduce((stats, booking) => {
        stats.total++;
        stats[booking.status]++;
        return stats;
      }, { total: 0, pending: 0, confirmed: 0, completed: 0, cancelled: 0 });

      // Render mentor detail page
      res.render("admin/mentor-detail", { mentor, bookings, bookingStats });
    });
  });
});

// Render the edit form for an existing mentor
app.get("/admin/mentors/:id/edit", isAdmin, (req, res) => {
  const { id } = req.params;

  // Fetch mentor to pre-fill the edit form
  connection.query("SELECT * FROM mentors WHERE id = ?", [id], (err, results) => {
    if (err) {
      console.error("Error fetching mentor:", err);
      req.flash("error", "Failed to load mentor details.");
      return res.redirect("/admin/mentors");
    }

    if (results.length === 0) {
      req.flash("error", "Mentor not found.");
      return res.redirect("/admin/mentors");
    }

    const mentor = results[0];
    res.render("admin/edit-mentor", { mentor });
  });
});

// Handle mentor update submission
app.post("/admin/mentors/:id/edit", isAdmin, upload.none(), (req, res) => {
  const { id } = req.params;
  const { name, specialty, experience, bio, rate, availability } = req.body;

  const updateData = {
    name,
    specialty,
    experience,
    bio,
    rate,
    availability
  };

  // Update mentor details in database
  connection.query("UPDATE mentors SET ? WHERE id = ?", [updateData, id], (err, result) => {
    if (err) {
      console.error("Error updating mentor:", err);
      req.flash("error", "Failed to update mentor.");
      return res.redirect(`/admin/mentors/${id}/edit`);
    }

    req.flash("success", "Mentor updated successfully.");
    res.redirect("/admin/mentors");
  });
});

// Render confirmation page for deleting a mentor
app.get("/admin/mentors/:id/delete", isAdmin, (req, res) => {
  const { id } = req.params;

  connection.query("SELECT * FROM mentors WHERE id = ?", [id], (err, mentorResults) => {
    if (err) {
      console.error("Error fetching mentor:", err);
      req.flash("error", "Failed to load mentor details.");
      return res.redirect("/admin/mentors");
    }

    if (mentorResults.length === 0) {
      req.flash("error", "Mentor not found.");
      return res.redirect("/admin/mentors");
    }

    const mentor = mentorResults[0];

    // Check if mentor has any bookings before deletion
    connection.query("SELECT COUNT(*) as count FROM mentor_bookings WHERE mentor_id = ?", [id], (err, countResult) => {
      const hasBookings = countResult[0].count > 0;
      const activeBookings = countResult[0].count;

      res.render("admin/delete-mentor", { 
        mentor, 
        hasBookings, 
        activeBookings 
      });
    });
  });
});

// Handle mentor deletion confirmation
app.post("/admin/mentors/:id/delete", isAdmin, (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const pass = "Ayush"; // Hardcoded admin password (should ideally be hashed and stored securely)

  // Password check before deleting
  if (password !== pass) {
    req.flash("error", "Incorrect password.");
    return res.redirect(`/admin/mentors/${id}/delete`);
  }

  // Delete the mentor
  connection.query("DELETE FROM mentors WHERE id = ?", [id], (err, result) => {
    if (err) {
      console.error("Error deleting mentor:", err);
      req.flash("error", "Failed to delete mentor.");
      return res.redirect("/admin/mentors");
    }

    req.flash("success", "Mentor deleted successfully.");
    res.redirect("/admin/mentors");
  });
});


// Admin bookings routes
// Route to display all mentor bookings in the admin panel
app.get("/admin/bookings", isAdmin, (req, res) => {
  const { status, mentor_id, date } = req.query;
  
  let query = `
    SELECT mb.*, 
           u.name as user_name, 
           u.email as user_email,
           m.name as mentor_name
    FROM mentor_bookings mb
    JOIN users u ON mb.user_id = u.id
    JOIN mentors m ON mb.mentor_id = m.id
  `;

  const queryParams = [];
  const conditions = [];

  // Dynamically add filters to the query
  if (status) {
    conditions.push("mb.status = ?");
    queryParams.push(status);
  }

  if (mentor_id) {
    conditions.push("mb.mentor_id = ?");
    queryParams.push(mentor_id);
  }

  if (date) {
    conditions.push("DATE(mb.booking_date) = ?");
    queryParams.push(date);
  }

  if (conditions.length > 0) {
    query += " WHERE " + conditions.join(" AND ");
  }

  query += " ORDER BY mb.booking_date DESC, mb.booking_time";

  // Execute final query with filter values
  connection.query(query, queryParams, (err, bookings) => {
    if (err) {
      console.error("Error fetching bookings:", err);
      req.flash("error", "Failed to load bookings.");
      return res.render("admin/bookings", { 
        bookings: [],
        mentors: [],
        filter: { status, mentor_id, date }
      });
    }

    // Get all mentors for filter dropdown
    connection.query("SELECT id, name FROM mentors ORDER BY name", (err, mentors) => {
      if (err) {
        console.error("Error fetching mentors for filter:", err);
      }

      res.render("admin/bookings", { 
        bookings, 
        mentors: mentors || [],
        filter: { status, mentor_id, date }
      });
    });
  });
});

// Route to update booking status (admin)
app.post("/admin/bookings/:id/status", isAdmin, (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  // Validate status input
  if (!['pending', 'confirmed', 'completed', 'cancelled'].includes(status)) {
    req.flash("error", "Invalid status.");
    return res.redirect("/admin/bookings");
  }

  // Update booking status in DB
  connection.query(
    "UPDATE mentor_bookings SET status = ? WHERE id = ?",
    [status, id],
    (err, result) => {
      if (err) {
        console.error("Error updating booking status:", err);
        req.flash("error", "Failed to update booking status.");
        return res.redirect("/admin/bookings");
      }

      req.flash("success", `Booking status updated to ${status}.`);
      res.redirect("/admin/bookings");
    }
  );
});

// Start the server and listen on specified port
app.listen(port, () => {
    console.log("Listening on port : 8080");
});