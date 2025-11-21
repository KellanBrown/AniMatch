const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt"); // For hashing passwords
const axios = require("axios"); // For Jikan API requests
const app = express();
const db = require("./database");

app.use(cors());
app.use(express.json());
app.use('/pictures', express.static(__dirname + '/pictures'));

// ------------------------
// Dashboard route
// ------------------------
app.get("/dashboard/:username", (req, res) => {
  const { username } = req.params;

  const query = `SELECT username, email, age, gender FROM users WHERE username = ?`;
  db.get(query, [username], (err, user) => {
    if (err) return res.status(500).json({ message: "Database error." });
    if (!user) return res.status(404).json({ message: "User not found." });

    // Example placeholder recommendations
    const recommendations = [
      { title: "Naruto", score: 9.0 },
      { title: "That Time I Got Reincarnated as a Slime", score: 8.5 },
      { title: "My Hero Academia", score: 8.8 },
    ];

    res.json({ user, recommendations });
  });
});


// Root route
app.get("/", (req, res) => {
  console.log("GET / request received");
  res.send("AniMatch backend is running!");
});

// ------------------------
// Signup
// ------------------------
app.post("/signup", async (req, res) => {
  const { username, email, age, gender, password } = req.body;
  if (!username || !email || !age || !gender || !password) {
    return res.status(400).json({ message: "All fields are required." });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const query = `INSERT INTO users (username, email, age, gender, passwordHash) VALUES (?, ?, ?, ?, ?)`;
  db.run(query, [username, email, age, gender, passwordHash], function (err) {
    if (err) {
      if (err.message.includes("UNIQUE")) {
        return res.status(400).json({ message: "User already exists." });
      }
      return res.status(500).json({ message: "Database error." });
    }
    res.json({ message: `Signup successful! Welcome, ${username}` });
  });
});


// ------------------------
// Login
// ------------------------
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required." });
  }

  const query = `SELECT * FROM users WHERE username = ?`;
  db.get(query, [username], async (err, user) => {
    if (err) return res.status(500).json({ message: "Database error." });
    if (!user) return res.status(401).json({ message: "Invalid username or password." });

    const validPassword = await bcrypt.compare(password, user.passwordHash);
    if (!validPassword) return res.status(401).json({ message: "Invalid username or password." });

    res.json({ message: `Login successful! Welcome back, ${username}` });
  });
});


// ------------------------
// Dashboard (placeholder for recommendations)
// ------------------------
app.get("/dashboard/:username", (req, res) => {
  const { username } = req.params;
  const user = users.find(u => u.username === username);

  if (!user) {
    return res.status(404).json({ message: "User not found." });
  }

  // Example: send a placeholder recommendation
  res.json({
    username,
    recommendations: [
      { title: "Naruto", score: 9.0 },
      { title: "That Time I Got Reincarnated as a Slime", score: 8.5 },
    ]
  });
});

// ------------------------
// Jikan API search
// ------------------------
app.get("/api/search", async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    const response = await axios.get(
      `https://api.jikan.moe/v4/anime?q=${query}&limit=10`
    );
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch from Jikan API" });
  }
});

// Get anime by ID
app.get("/api/anime/:id", async (req, res) => {
  const id = req.params.id;

  try {
    const response = await axios.get(`https://api.jikan.moe/v4/anime/${id}`);
    res.json(response.data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch anime details" });
  }
});

// ------------------------
// START SERVER
// ------------------------
const PORT = 5000;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ Server running on http://127.0.0.1:${PORT}`);
});
