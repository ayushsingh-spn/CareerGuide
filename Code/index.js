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

      const id = uuidv4()

      // Insert user into database
      const q = `INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)`
      connection.query(q, [id, name, email, password], (err, result) => {
        if (err) throw err

        req.flash("success", "Registration successful! Please log in")
        res.redirect("/login")
      })
    })
  } catch (error) {
    console.error("Error during signup:", error)
    req.flash("error", "An error occurred during signup")
    res.redirect("/signup")
  }
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
  connection.query("SELECT * FROM users WHERE id = ?", [req.session.user.id], (err, results) => {
    if (err) throw err

    const user = results[0]
    res.render("profile", { user })
  })
})

//For dashboard page
app.get("/dashboard", isAdmin, (req, res) => {
  res.render('dasboard');
});


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
    res.render('signup');
});

//For login page
app.get("/login", (req, res) => {
    res.render('login');
});

//For admin-login page
app.get("/admin/login", (req, res) => {
    res.render('admin-login');
});

//QA Page
app.get("/qa", (req, res) => {

    let { id } = req.params;
    let q = `SELECT * FROM questions;`;
  
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

app.get("/qa_added", (req, res) => {

    let { id } = req.params;
    let q = `SELECT * FROM questions ORDER BY id DESC;`;
  
    try {
      connection.query(q, (err, result) => {
        if (err) throw err;
        let questions = result[0];
        res.render("qa_added", { questions });
      });
    } catch (err) {
      res.send("some error with DB");
    }
});

//For adding qna to my sql
app.post("/qa_added", (req, res) => {
    let { name, email, question } = req.body;
    let randomid = uuidv4();
    //Query to Insert New question
    let q = `INSERT INTO questions (randomid, Name, email, Question) VALUES ('${randomid}','${name}','${email}','${question}'); `;
  
    try {
      connection.query(q, (err, result) => {
        if (err) throw err;
        console.log("added new question");
        res.redirect("/qa_added");
      });
    } catch (err) {
      res.send("some error occurred");
    }
  });

  //for finding question
  app.get("/qa/:id", (req, res) => {
    let { id } = req.params; // FIX: use req.params.id instead of req.query.givenid
    let q = `SELECT * FROM questions WHERE randomid='${id}'`;
  
    try {
      connection.query(q, (err, result) => {
        if (err) throw err;
        let data = result[0];
        if (!data) {
          return res.send("No question found with the given ID.");
        }
        res.render("viewQuestion.ejs", { data });
      });
    } catch (err) {
      res.send("some error with DB");
    }
  });
  

  app.get("/answer", (req, res) => {
    let q = `SELECT * FROM questions`;
    try {
      connection.query(q, (err, result) => {
        if (err) throw err;
        let data = result;
        res.render("answer.ejs", { data });
      });
    } catch (err) {
      res.send("some error occurred");
    }
  });

  app.get("/answer/:id/edit", (req, res) => {
    let { id } = req.params;
    let q = `SELECT * FROM questions WHERE randomid='${id}'`;
  
    try {
      connection.query(q, (err, result) => {
        if (err) throw err;
        let data = result[0];
        res.render("edit.ejs", { data });
      });
    } catch (err) {
      res.send("some error with DB");
    }
  });

  app.patch("/answer/:id", (req, res) => {
    let { id } = req.params;
    let { Answers, password } = req.body;
    let pass = "Ayush";
    console.log(Answers);
    let q = `SELECT * FROM questions WHERE randomid='${id}'`;
  
    try {
      connection.query(q, (err, result) => {
        if (err) throw err;
  
        if (password != pass) {
          res.send("WRONG Password entered!");
        } else {
          let q2 = `UPDATE questions SET Answers='${Answers}' WHERE randomid='${id}'`;
          connection.query(q2, (err, result) => {
            if (err) throw err;
            else {
              console.log(result);
              console.log("updated!");
              res.redirect("/answer");
            }
          });
        }
      });
    } catch (err) {
      res.send("some error with DB");
    }
  });

  app.get("/answer/:id/delete", (req, res) => {
    let { id } = req.params;
    let q = `SELECT * FROM questions WHERE randomid='${id}'`;
  
    try {
      connection.query(q, (err, result) => {
        if (err) throw err;
        let question = result[0];
        res.render("delete.ejs", { question });
      });
    } catch (err) {
      res.send("some error with DB");
    }
  });
  
  app.delete("/answer/:id/", (req, res) => {
    let { id } = req.params;
    let { password } = req.body;
    let pass = "Ayush";
    let q = `SELECT * FROM questions WHERE randomid='${id}'`;
  
    try {
      connection.query(q, (err, result) => {
        if (err) throw err;
  
        if (pass != password) {
          res.send("WRONG Password entered!");
        } else {
          let q2 = `DELETE FROM questions WHERE randomid='${id}'`; //Query to Delete
          connection.query(q2, (err, result) => {
            if (err) throw err;
            else {
              console.log(result);
              console.log("deleted!");
              res.redirect("/answer");
            }
          });
        }
      });
    } catch (err) {
      res.send("some error with DB");
    }
  });









app.listen(port, () => {
    console.log("Listening on port : 8080");
});