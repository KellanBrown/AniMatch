const express = require("express");
const cors = require("cors");
const bcrypt = require("bcrypt");
const axios = require("axios");
const db = require("./database");

const app = express();

// ------------------- MIDDLEWARE -------------------
app.use(cors());
app.use(express.json());

// ------------------- ROOT -------------------
app.get("/", (req, res) => {
  res.send("AniMatch backend is running!");
});

// ------------------- HELPER -------------------
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ------------------- AUTH -------------------

// SIGNUP
app.post("/signup", async (req, res) => {
  const { username, email, age, gender, password } = req.body;

  if (!username || !email || !age || !gender || !password) {
    return res.status(400).json({ message: "All fields required." });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  db.run(
    `INSERT INTO users (username, email, age, gender, passwordHash)
     VALUES (?, ?, ?, ?, ?)`,
    [username, email, age, gender, passwordHash],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) {
          return res.status(400).json({ message: "User exists." });
        }
        return res.status(500).json({ message: "Database error." });
      }

      res.json({ message: `Signup successful! Welcome, ${username}` });
    }
  );
});

// LOGIN
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  db.get(
    `SELECT * FROM users WHERE username = ?`,
    [username],
    async (err, user) => {
      if (err) return res.status(500).json({ message: "Database error." });
      if (!user) return res.status(401).json({ message: "Invalid credentials." });

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return res.status(401).json({ message: "Invalid credentials." });

      res.json({ message: `Login successful! Welcome back, ${username}` });
    }
  );
});

// ------------------- DASHBOARD -------------------
app.get("/dashboard/:username", (req, res) => {
  const { username } = req.params;

  db.get(
    `SELECT username, email, age, gender FROM users WHERE username = ?`,
    [username],
    (err, user) => {
      if (err) return res.status(500).json({ message: "Database error." });
      if (!user) return res.status(404).json({ message: "User not found." });

      res.json({ user, recommendations: [] });
    }
  );
});

// ------------------- SEARCH -------------------
app.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Search query required" });

    await delay(500);

    const response = await axios.get("https://api.jikan.moe/v4/anime", {
      params: { q: query, limit: 12 }
    });

    const results = response.data.data.map(anime => ({
      id: anime.mal_id,
      title: anime.title_english || anime.title,
      image: anime.images?.jpg?.image_url || "",
      rating: anime.score || "N/A",
      episodes: anime.episodes,
      url: anime.url
    }));

    res.json(results);
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
});

// ------------------- RECOMMENDATIONS -------------------
app.post("/recommend", async (req, res) => {
  const { genres, maxEpisodes, hiddenGem } = req.body;

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
    let results = [];

    for (const g of genres) {
      const genreId = genreMap[g];
      if (!genreId) continue;

      const response = await axios.get("https://api.jikan.moe/v4/anime", {
        params: { genres: genreId, limit: 25 }
      });

      results.push(...response.data.data);
      await delay(1000);
    }

    let filtered = Array.from(
      new Map(results.map(a => [a.mal_id, a])).values()
    );

    if (maxEpisodes) {
      filtered = filtered.filter(a =>
        a.episodes &&
        a.episodes <= maxEpisodes
      );
    }

    if (hiddenGem) {
      filtered = filtered.filter(a =>
        a.score >= 7 &&
        a.members < 250000
      );
    }

    const finalResults = filtered.slice(0, 12).map(anime => ({
      id: anime.mal_id,
      title: anime.title_english || anime.title,
      image: anime.images?.jpg?.image_url || "",
      rating: anime.score || "N/A",
      url: anime.url,
      episodes: anime.episodes
    }));

    res.json(finalResults);
  } catch (error) {
    console.error("Recommendation error:", error.message);
    res.status(500).json([]);
  }
});

// ------------------- ⭐ SAVE ANIME (FIXED) -------------------
app.post("/save-anime", (req, res) => {
  const { username, anime } = req.body;

  if (!username || !anime) {
    return res.status(400).json({ message: "Missing data." });
  }

  const { id, title, image, url } = anime;

  db.run(
    `INSERT INTO saved_anime (username, animeId, title, image, url)
     VALUES (?, ?, ?, ?, ?)`,
    [username, id, title, image, url],
    function (err) {
      if (err) {
        console.error("Save error:", err.message);
        return res.status(500).json({ message: "Failed to save anime." });
      }

      res.json({ message: "Anime saved successfully!" });
    }
  );
});

// ------------------- START SERVER -------------------
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});