# 🎓 VistaeGuide – Career Guidance Website

**VistaeGuide** is a career guidance platform built to help Indian students after Class 10 make informed decisions about their educational future. It provides personalized stream recommendations — **Science**, **Commerce**, or **Arts** — based on users’ interests, and introduces potential career paths within each stream.

---

## 🌐 Live Demo

🚧 *Coming Soon*

---

## 🛠️ Tech Stack

- **Backend:** Node.js, Express.js  
- **Frontend:** EJS, HTML, CSS  
- **Database:** MySQL  
- **Tools:** Git, GitHub, dotenv

---

## 📌 Features

- 🔐 Student registration and login system  
- 🧠 Stream selection quiz based on interests  
- 🎯 Career suggestions for Science, Commerce, and Arts  
- 📚 Informative pages for different career paths  
- 🛠️ Admin panel to manage quiz content (optional)  
- 📱 Responsive UI for mobile and desktop use

---

## 🚀 Getting Started

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/vistaeguide.git
cd vistaeguide
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Setup MySQL Database
- Open MySQL and create a new database:
```sql
CREATE DATABASE vistaeguide;
```
- Import the required tables using a provided `.sql` file (e.g., `db/schema.sql`)

### 4. Create a `.env` File
Inside the root directory, create a `.env` file with your local MySQL credentials:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=vistaeguide
```

### 5. Run the App
```bash
node app.js
```

Then open your browser and visit:  
👉 `http://localhost:3000`

---

## 📁 Project Structure

```
vistaeguide/
│
├── dataset/              # SQL schema and sample data
│   └── database.sql
│
├──Code
    ├── public/
    │   ├── css/              # Stylesheets
    │   ├── js/               # Client-side scripts
    │   └── photos/           # Image assets
    │
    ├── views/                # EJS template files
    │
    ├── index.js                # Main application file
    ├── .env                  # Environment config (not tracked)
    └── package.json          # Project metadata and dependencies
```

---

## 🔄 Development Methodology

This project follows the **Waterfall Model**, which includes:

1. 📋 Requirement Gathering  
2. 🧩 System Design  
3. 💻 Development (Node.js, EJS, MySQL)  
4. 🧪 Testing with real users  
5. 🚀 Final Deployment (can be added later)

---

## 🧑‍🎓 Use Case

VistaeGuide is ideal for:
- Students unsure about their future stream
- Parents and teachers supporting career decisions
- Schools offering basic counseling services

---

## 🤝 Contributing

Contributions, feedback, and suggestions are welcome!

To contribute:
1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Commit your changes: `git commit -m "Add feature"`
4. Push to the branch: `git push origin feature-name`
5. Open a pull request

---

## 🙋‍♂️ Author

**Ayush Singh**  
[GitHub](https://github.com/ayushsingh-spn) | [LinkedIn](https://linkedin.com/in/ayushsingh2103)

---

## 📄 License

This project is licensed under the **MIT License**. See the `LICENSE` file for details.

---
