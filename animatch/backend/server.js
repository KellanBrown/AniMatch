const express = require("express");
const cors    = require("cors");
const bcrypt  = require("bcrypt");
const axios   = require("axios");
const db      = require("./database");

const app = express();
app.use(cors());
app.use(express.json());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// ---------------- ROOT ----------------
app.get("/", (req, res) => res.send("AniMatch backend is running!"));

// ---------------- SIGNUP ----------------
app.post("/signup", async (req, res) => {
  const { username, email, age, gender, password } = req.body;
  if (!username || !email || !age || !gender || !password)
    return res.status(400).json({ message: "All fields required." });

  const passwordHash = await bcrypt.hash(password, 10);
  db.run(
    `INSERT INTO users (username, email, age, gender, passwordHash) VALUES (?, ?, ?, ?, ?)`,
    [username, email, age, gender, passwordHash],
    function (err) {
      if (err) {
        if (err.message.includes("UNIQUE")) return res.status(400).json({ message: "User exists." });
        return res.status(500).json({ message: "Database error." });
      }
      res.json({ message: `Signup successful! Welcome, ${username}` });
    }
  );
});

// ---------------- LOGIN ----------------
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  db.get(`SELECT * FROM users WHERE username = ?`, [username], async (err, user) => {
    if (err)   return res.status(500).json({ message: "Database error." });
    if (!user) return res.status(401).json({ message: "Invalid credentials." });
    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ message: "Invalid credentials." });
    res.json({ message: `Login successful! Welcome back, ${username}` });
  });
});

// ---------------- DASHBOARD ----------------
app.get("/dashboard/:username", (req, res) => {
  const { username } = req.params;
  db.get(
    `SELECT username, email, age, gender FROM users WHERE username = ?`,
    [username],
    (err, user) => {
      if (err)   return res.status(500).json({ message: "Database error." });
      if (!user) return res.status(404).json({ message: "User not found." });
      res.json({ user, recommendations: [] });
    }
  );
});

// ---------------- SAVED ANIME FETCH ----------------
app.get("/saved-anime/:username", (req, res) => {
  const { username } = req.params;
  db.all(`SELECT * FROM saved_anime WHERE username = ?`, [username], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error." });
    res.json(rows);
  });
});

// ---------------- ANIME STATUS (single card) ----------------
app.get("/anime-status/:username/:animeId", (req, res) => {
  const { username, animeId } = req.params;
  db.get(`SELECT watched FROM watch_status WHERE username = ? AND animeId = ?`, [username, animeId], (err, watchRow) => {
    if (err) return res.status(500).json({ message: "Database error." });
    db.get(`SELECT rating FROM ratings WHERE username = ? AND animeId = ?`, [username, animeId], (err2, ratingRow) => {
      if (err2) return res.status(500).json({ message: "Database error." });
      db.get(`SELECT currentEp FROM episode_progress WHERE username = ? AND animeId = ?`, [username, animeId], (err3, epRow) => {
        if (err3) return res.status(500).json({ message: "Database error." });
        res.json({
          watched:   watchRow  ? watchRow.watched   : 0,
          rating:    ratingRow ? ratingRow.rating    : null,
          currentEp: epRow     ? epRow.currentEp     : 0
        });
      });
    });
  });
});

// ---------------- ALL STATUS (watchlist page) ----------------
app.get("/all-status/:username", (req, res) => {
  const { username } = req.params;
  db.all(
    `SELECT
       sa.animeId,
       COALESCE(ws.watched, 0)  AS watched,
       r.rating,
       COALESCE(ep.currentEp, 0) AS currentEp
     FROM saved_anime sa
     LEFT JOIN watch_status    ws ON ws.username = sa.username AND ws.animeId = sa.animeId
     LEFT JOIN ratings         r  ON r.username  = sa.username AND r.animeId  = sa.animeId
     LEFT JOIN episode_progress ep ON ep.username = sa.username AND ep.animeId = sa.animeId
     WHERE sa.username = ?`,
    [username],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Database error." });
      res.json(rows);
    }
  );
});

// ---------------- USER STATS ----------------
app.get("/user-stats/:username", (req, res) => {
  const { username } = req.params;
  db.get(
    `SELECT
       COUNT(sa.id)                                       AS totalSaved,
       SUM(CASE WHEN ws.watched = 1 THEN 1 ELSE 0 END)   AS totalWatched,
       SUM(CASE WHEN ws.watched = 0 OR ws.watched IS NULL THEN 1 ELSE 0 END) AS totalUnwatched,
       ROUND(AVG(r.rating), 1)                            AS avgRating
     FROM saved_anime sa
     LEFT JOIN watch_status ws ON ws.username = sa.username AND ws.animeId = sa.animeId
     LEFT JOIN ratings      r  ON r.username  = sa.username AND r.animeId  = sa.animeId
     WHERE sa.username = ?`,
    [username],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Database error." });
      res.json({
        totalSaved:     row.totalSaved     || 0,
        totalWatched:   row.totalWatched   || 0,
        totalUnwatched: row.totalUnwatched || 0,
        avgRating:      row.avgRating      || null,
        topGenre:       null
      });
    }
  );
});

// ---------------- REMOVE ANIME ----------------
app.delete("/remove-anime", (req, res) => {
  const { username, animeId } = req.body;
  if (!username || !animeId) return res.status(400).json({ message: "Missing data." });

  db.run(`DELETE FROM saved_anime      WHERE username = ? AND animeId = ?`, [username, animeId]);
  db.run(`DELETE FROM watch_status     WHERE username = ? AND animeId = ?`, [username, animeId]);
  db.run(`DELETE FROM ratings          WHERE username = ? AND animeId = ?`, [username, animeId]);
  db.run(`DELETE FROM episode_progress WHERE username = ? AND animeId = ?`, [username, animeId],
    function (err) {
      if (err) return res.status(500).json({ message: "Failed to remove." });
      res.json({ message: "Anime removed." });
    }
  );
});

// ---------------- SEARCH ----------------
app.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Search query required" });
    await delay(300);
    const response = await axios.get("https://api.jikan.moe/v4/anime", { params: { q: query, limit: 12 } });
    const results  = response.data.data.map(anime => ({
      id: anime.mal_id, title: anime.title_english || anime.title,
      image: anime.images?.jpg?.image_url || "",
      rating: anime.score || "N/A", episodes: anime.episodes || null, url: anime.url
    }));
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: "Search failed" });
  }
});

// ---------------- RECOMMENDATIONS ----------------
app.post("/recommend", async (req, res) => {
  const { genres = [], maxEpisodes, hiddenGem, mood } = req.body;
  const genreMap  = { Action:1, Adventure:2, Comedy:4, Drama:8, Fantasy:10, Romance:22, Horror:14, SciFi:24 };
  const moodBoost = {
    Excited: ["Action","Adventure"], Chill: ["Comedy","Fantasy"],
    Adventurous: ["Action","Fantasy","Adventure"], Romantic: ["Romance"],
    Sad: ["Drama","Romance"], Comedic: ["Comedy"]
  };
  try {
    let results = [], finalGenres = [...genres];
    if (mood && moodBoost[mood]) finalGenres = [...new Set([...finalGenres, ...moodBoost[mood]])];
    if (finalGenres.length === 0) finalGenres = ["Action"];

    for (const g of finalGenres) {
      const genreId = genreMap[g];
      if (!genreId) continue;
      const response = await axios.get("https://api.jikan.moe/v4/anime", {
        params: { genres: genreId, limit: 25, order_by: "score", sort: "desc" }
      });
      results.push(...response.data.data);
      await delay(600);
    }

    let filtered = Array.from(new Map(results.map(a => [a.mal_id, a])).values());
    if (maxEpisodes) filtered = filtered.filter(a => a.episodes && a.episodes <= maxEpisodes);
    if (hiddenGem)   filtered = filtered.filter(a => a.score >= 7 && a.members < 300000);
    else             filtered = filtered.filter(a => a.score >= 6);

    const scored = filtered.map(anime => {
      let score = anime.score || 0;
      if (anime.score >= 8) score += 2;
      if (anime.members > 50000 && anime.members < 2000000) score += 1;
      return { anime, score };
    });
    scored.sort((a, b) => b.score - a.score);

    res.json(scored.slice(0, 12).map(({ anime }) => ({
      id: anime.mal_id, title: anime.title_english || anime.title,
      image: anime.images?.jpg?.image_url || "",
      rating: anime.score || "N/A", url: anime.url, episodes: anime.episodes || null
    })));
  } catch (error) {
    res.status(500).json([]);
  }
});

// ---------------- SAVE ANIME ----------------
app.post("/save-anime", (req, res) => {
  const { username, anime } = req.body;
  if (!username || !anime) return res.status(400).json({ message: "Missing data." });
  const { id, title, image, url } = anime;
  db.get(`SELECT id FROM saved_anime WHERE username = ? AND animeId = ?`, [username, id], (err, existing) => {
    if (err)      return res.status(500).json({ message: "Database error." });
    if (existing) return res.status(409).json({ message: "Already saved." });
    db.run(
      `INSERT INTO saved_anime (username, animeId, title, image, url) VALUES (?, ?, ?, ?, ?)`,
      [username, id, title, image, url],
      function (err2) {
        if (err2) return res.status(500).json({ message: "Failed to save anime." });
        res.json({ message: "Anime saved successfully!" });
      }
    );
  });
});

// ---------------- WATCH STATUS ----------------
app.post("/watch-status", (req, res) => {
  const { username, animeId, watched } = req.body;
  if (!username || animeId === undefined) return res.status(400).json({ message: "Missing data." });
  db.run(
    `INSERT INTO watch_status (username, animeId, watched) VALUES (?, ?, ?)
     ON CONFLICT(username, animeId) DO UPDATE SET watched = excluded.watched`,
    [username, animeId, watched ? 1 : 0],
    function (err) {
      if (err) return res.status(500).json({ message: "Failed to update watch status." });
      res.json({ message: "Watch status updated!" });
    }
  );
});

// ---------------- RATE ANIME ----------------
app.post("/rate-anime", (req, res) => {
  const { username, animeId, rating } = req.body;
  if (!username || animeId === undefined || rating === undefined)
    return res.status(400).json({ message: "Missing data." });
  if (rating < 1 || rating > 10) return res.status(400).json({ message: "Rating must be 1–10." });
  db.run(
    `INSERT INTO ratings (username, animeId, rating) VALUES (?, ?, ?)
     ON CONFLICT(username, animeId) DO UPDATE SET rating = excluded.rating`,
    [username, animeId, rating],
    function (err) {
      if (err) return res.status(500).json({ message: "Failed to save rating." });
      res.json({ message: "Rating saved!" });
    }
  );
});

// ---------------- EPISODE PROGRESS (NEW) ----------------
app.post("/episode-progress", (req, res) => {
  const { username, animeId, currentEp } = req.body;
  if (!username || animeId === undefined || currentEp === undefined)
    return res.status(400).json({ message: "Missing data." });

  db.run(
    `INSERT INTO episode_progress (username, animeId, currentEp) VALUES (?, ?, ?)
     ON CONFLICT(username, animeId) DO UPDATE SET currentEp = excluded.currentEp`,
    [username, animeId, currentEp],
    function (err) {
      if (err) return res.status(500).json({ message: "Failed to save progress." });
      res.json({ message: "Progress saved!" });
    }
  );
});

// ---------------- START ----------------
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));