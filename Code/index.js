const express = require("express");
const app = express();
const port = 8080;
const path = require("path");

app.use(express.urlencoded({ extended: true }));

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public/CSS")));
app.use(express.static(path.join(__dirname, "public/JS")));
app.use(express.static(path.join(__dirname, "public/Photos")));

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
    res.render('qa');
});






app.listen(port, () => {
    console.log("Listening on port : 8080");
});