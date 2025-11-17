const express = require("express");
const cors = require("cors");
const app = express();
const cors = require("cors");

app.use(cors());
app.use(express.json()); // ✅ Needed to parse JSON from frontend
app.use('/pictures', express.static(__dirname + '/pictures'));


// Temporary in-memory user storage
let users = [];

// ------------------------
// ROUTES
// ------------------------
// Search anime
app.get("/api/search", async (req, res) => {
    const query = req.query.q;

    try {
        const response = await axios.get(
            `https://api.jikan.moe/v4/anime?q=${query}&limit=10`
        );

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch from MAL API" });
    }
});

// Get anime by ID
app.get("/api/anime/:id", async (req, res) => {
    const id = req.params.id;

    try {
        const response = await axios.get(
            `https://api.jikan.moe/v4/anime/${id}`
        );

        res.json(response.data);
    } catch (err) {
        res.status(500).json({ error: "Failed to fetch anime details" });
    }
});

// Root route
app.get("/", (req, res) => {
  console.log("GET / request received");
  res.send("AniMatch backend is running!");
});

// Get anime profiles
app.get("/profiles", (req, res) => {
  console.log("GET /profiles request received");
  res.json(animeProfiles);
});

// Signup route
app.post("/signup", (req, res) => {
  const { username, password } = req.body;
  console.log("Signup request received:", username);

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required." });
  }

  // Check if user already exists
  const existingUser = users.find((u) => u.username === username);
  if (existingUser) {
    return res.status(400).json({ message: "User already exists." });
  }

  // Store new user
  users.push({ username, password });
  console.log("Current users:", users);
  res.json({ message: `Signup successful! Welcome, ${username}` });
});

// Login route
app.post("/login", (req, res) => {
  const { username, password } = req.body;
  console.log("Login request received:", username);

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password required." });
  }

  const user = users.find(
    (u) => u.username === username && u.password === password
  );

  if (!user) {
    return res.status(401).json({ message: "Invalid username or password." });
  }

  res.json({ message: `Login successful! Welcome back, ${username}` });
});

// ------------------------
// START SERVER
// ------------------------
const PORT = 5000;
app.listen(PORT, "127.0.0.1", () => {
  console.log(`✅ Server running on http://127.0.0.1:${PORT}`);
});