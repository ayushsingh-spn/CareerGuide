const mysql = require('mysql2');
const express = require("express");
const app = express();
const port = 8080;
const path = require("path");
const methodOverride = require("method-override");
const { v4: uuidv4 } = require("uuid");

app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));

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
    let id = uuidv4();
    //Query to Insert New question
    let q = `INSERT INTO questions (id, Name, email, Question) VALUES ('${id}','${name}','${email}','${question}'); `;
  
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
    let { givenid } = req.query;
    let q = `SELECT * FROM questions WHERE id='${givenid}'`;
  
    try {
      connection.query(q, (err, result) => {
        if (err) throw err;
        let data = result[0];
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
    let q = `SELECT * FROM questions WHERE id='${id}'`;
  
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
    let q = `SELECT * FROM questions WHERE id='${id}'`;
  
    try {
      connection.query(q, (err, result) => {
        if (err) throw err;
  
        if (password != pass) {
          res.send("WRONG Password entered!");
        } else {
          let q2 = `UPDATE questions SET Answers='${Answers}' WHERE id='${id}'`;
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
    let q = `SELECT * FROM questions WHERE id='${id}'`;
  
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
    let q = `SELECT * FROM questions WHERE id='${id}'`;
  
    try {
      connection.query(q, (err, result) => {
        if (err) throw err;
  
        if (pass != password) {
          res.send("WRONG Password entered!");
        } else {
          let q2 = `DELETE FROM questions WHERE id='${id}'`; //Query to Delete
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