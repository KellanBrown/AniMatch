const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const axios = require("axios");
const app = express();
const db = require("./database");

app.use(cors());
app.use(express.json());

// ------------------------
// Root route
// ------------------------
app.get("/", (req, res) => {
  res.send("AniMatch backend is running!");
});

// ------------------------
// Dashboard
// ------------------------
app.get("/dashboard/:username", (req, res) => {
  const { username } = req.params;
  const query = `SELECT username, email, age, gender FROM users WHERE username = ?`;

  db.get(query, [username], (err, user) => {
    if (err) return res.status(500).json({ message: "Database error." });
    if (!user) return res.status(404).json({ message: "User not found." });

    res.json({ user, recommendations: [] });
  });
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
  const query = `
    INSERT INTO users (username, email, age, gender, passwordHash)
    VALUES (?, ?, ?, ?, ?)
  `;
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
  if (!username || !password) return res.status(400).json({ message: "Username and password required." });

  const query = `SELECT * FROM users WHERE username = ?`;
  db.get(query, [username], async (err, user) => {
    if (err) return res.status(500).json({ message: "Database error." });
    if (!user) return res.status(401).json({ message: "Invalid credentials." });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid credentials." });

    res.json({ message: `Login successful! Welcome back, ${username}` });
  });
});

// ------------------------
// Recommendations
// ------------------------
app.post("/recommend", async (req, res) => {
  const { genres, maxEpisodes, hiddenGem, mood } = req.body;
  if (!genres || genres.length === 0) return res.status(400).json({ error: "Genres required" });

  const genreMap = {
    Action: 1,
    Adventure: 2,
    Comedy: 4,
    Drama: 8,
    Fantasy: 10,
    Romance: 22,
    Horror: 14,
    SciFi: 24
  };

  try {
    const results = [];

    for (const g of genres) {
      const genreId = genreMap[g];
      if (!genreId) continue;

      const response = await axios.get("https://api.jikan.moe/v4/anime", {
        params: {
          genres: genreId,
          limit: 25, // max allowed by Jikan
          order_by: "popularity",
          sort: "asc"
        }
      });

      if (Array.isArray(response.data.data)) {
        results.push(...response.data.data);
      }
    }

    // Remove duplicates
    const uniqueResults = Array.from(new Map(results.map(a => [a.mal_id, a])).values());

    let filtered = uniqueResults;

    // Episode filter
    if (maxEpisodes) {
      filtered = filtered.filter(a => Number.isInteger(a.episodes) && a.episodes > 0 && a.episodes <= maxEpisodes);
    }

    // Hidden gem filter
    if (hiddenGem) {
      filtered = filtered.filter(
        a =>
          a.members &&
          a.popularity &&
          a.score &&
          a.score >= 7 &&
          a.popularity > 3000 &&
          a.members < 250000
      );
    }

    // Mood-based filtering (optional)
    if (mood) {
      const moodMap = {
        Excited: ["Action", "Adventure", "Comedy"],
        Chill: ["Slice of Life", "Romance", "Drama"],
        Adventurous: ["Fantasy", "Action", "Adventure"],
        Romantic: ["Romance", "Drama", "Fantasy"],
        Sad: ["Drama", "Slice of Life"],
        Comedic: ["Comedy", "Fantasy"]
      };
      const moodGenres = moodMap[mood] || [];
      filtered = filtered.filter(a => moodGenres.some(g => a.genres?.some(ag => ag.name === g)));
    }

    // Map + limit to 12
    const finalResults = filtered
      .slice(0, 12)
      .map(anime => ({
        id: anime.mal_id,
        title: anime.title_english || anime.title,
        image: anime.images?.jpg?.image_url || "",
        rating: anime.score || "N/A",
        url: anime.url,
        episodes: anime.episodes
      }));

    res.json(finalResults);
  } catch (err) {
    console.error("❌ Recommendation error:", err.response?.data || err.message);
    res.status(500).json({ error: "Recommendation failed" });
  }
});

// ------------------------
// START SERVER
// ------------------------
const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});
