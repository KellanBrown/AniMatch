const express = require("express");
const cors    = require("cors");
const bcrypt  = require("bcrypt");
const axios   = require("axios");
const db      = require("./database");

const app = express();
app.use(cors());
app.use(express.json());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const fetchJikan = async (url, params = {}, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, { params });
      return res.data;
    } catch (err) {
      if (err.response?.status === 429 && i < retries - 1) await delay(1200 * (i + 1));
      else throw err;
    }
  }
};

const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

const dedupe = (arr) => Array.from(new Map(arr.map(a => [a.mal_id, a])).values());

const formatAnime = (anime) => ({
  id:       anime.mal_id,
  title:    anime.title_english || anime.title,
  image:    anime.images?.jpg?.image_url || "",
  rating:   anime.score || "N/A",
  url:      anime.url,
  episodes: anime.episodes || null,
  type:     anime.type     || null,
  genres:   (anime.genres  || []).map(g => g.name)
});

// ---- ROOT ----
app.get("/", (req, res) => res.send("AniMatch backend is running!"));

// ---- SIGNUP ----
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

// ---- LOGIN ----
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

// ---- DASHBOARD ----
app.get("/dashboard/:username", (req, res) => {
  const { username } = req.params;
  db.get(`SELECT username, email, age, gender FROM users WHERE username = ?`, [username], (err, user) => {
    if (err)   return res.status(500).json({ message: "Database error." });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user, recommendations: [] });
  });
});

// ---- SAVED ANIME ----
app.get("/saved-anime/:username", (req, res) => {
  const { username } = req.params;
  db.all(`SELECT * FROM saved_anime WHERE username = ?`, [username], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error." });
    res.json(rows);
  });
});

// ---- ANIME STATUS (single card) ----
app.get("/anime-status/:username/:animeId", (req, res) => {
  const { username, animeId } = req.params;
  db.get(`SELECT status, updatedAt FROM watch_status WHERE username = ? AND animeId = ?`, [username, animeId], (err, watchRow) => {
    if (err) return res.status(500).json({ message: "Database error." });
    db.get(`SELECT rating FROM ratings WHERE username = ? AND animeId = ?`, [username, animeId], (err2, ratingRow) => {
      if (err2) return res.status(500).json({ message: "Database error." });
      db.get(`SELECT currentEp FROM episode_progress WHERE username = ? AND animeId = ?`, [username, animeId], (err3, epRow) => {
        if (err3) return res.status(500).json({ message: "Database error." });
        res.json({
          status:    watchRow  ? (watchRow.status || "none") : "none",
          updatedAt: watchRow  ? watchRow.updatedAt           : null,
          rating:    ratingRow ? ratingRow.rating              : null,
          currentEp: epRow     ? epRow.currentEp               : 0
        });
      });
    });
  });
});

// ---- ALL STATUS (watchlist) — now includes episodes + type from saved_anime ----
app.get("/all-status/:username", (req, res) => {
  const { username } = req.params;
  db.all(
    `SELECT
       sa.animeId,
       sa.title,
       sa.image,
       sa.url,
       sa.genres,
       sa.episodes,
       sa.type,
       COALESCE(ws.status, 'none')   AS status,
       ws.updatedAt,
       r.rating,
       COALESCE(ep.currentEp, 0)     AS currentEp
     FROM saved_anime sa
     LEFT JOIN watch_status     ws ON ws.username = sa.username AND ws.animeId = sa.animeId
     LEFT JOIN ratings          r  ON r.username  = sa.username AND r.animeId  = sa.animeId
     LEFT JOIN episode_progress ep ON ep.username = sa.username AND ep.animeId = sa.animeId
     WHERE sa.username = ?`,
    [username],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Database error." });
      res.json(rows);
    }
  );
});

// ---- USER STATS ----
app.get("/user-stats/:username", (req, res) => {
  const { username } = req.params;
  db.get(
    `SELECT COUNT(sa.id) AS totalSaved,
       SUM(CASE WHEN ws.status IN ('completed','rewatching') THEN 1 ELSE 0 END) AS totalCompleted,
       SUM(CASE WHEN ws.status IN ('watching','rewatching')  THEN 1 ELSE 0 END) AS totalWatching,
       ROUND(AVG(r.rating), 1) AS avgRating
     FROM saved_anime sa
     LEFT JOIN watch_status ws ON ws.username = sa.username AND ws.animeId = sa.animeId
     LEFT JOIN ratings      r  ON r.username  = sa.username AND r.animeId  = sa.animeId
     WHERE sa.username = ?`,
    [username],
    (err, row) => {
      if (err) return res.status(500).json({ message: "Database error." });
      db.all(
        `SELECT genres FROM saved_anime WHERE username = ? AND genres != '' AND genres IS NOT NULL`,
        [username],
        (err2, genreRows) => {
          let topGenre = null;
          if (!err2 && genreRows.length > 0) {
            const counts = {};
            genreRows.forEach(r => {
              try {
                const gs = JSON.parse(r.genres);
                gs.forEach(g => { counts[g] = (counts[g] || 0) + 1; });
              } catch (e) {}
            });
            const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);
            topGenre = sorted[0]?.[0] || null;
          }
          res.json({
            totalSaved:     row.totalSaved     || 0,
            totalCompleted: row.totalCompleted || 0,
            totalWatching:  row.totalWatching  || 0,
            avgRating:      row.avgRating      || null,
            topGenre
          });
        }
      );
    }
  );
});

// ---- REMOVE ANIME ----
// mode: 'full' (default) = delete everything
// mode: 'status' = only reset watch status (for re-watching use case)
app.delete("/remove-anime", (req, res) => {
  const { username, animeId, mode = "full" } = req.body;
  if (!username || !animeId) return res.status(400).json({ message: "Missing data." });

  if (mode === "status") {
    // Just reset status — keep the anime in saved list
    db.run(
      `INSERT INTO watch_status (username, animeId, status, updatedAt) VALUES (?, ?, 'none', datetime('now'))
       ON CONFLICT(username, animeId) DO UPDATE SET status = 'none', updatedAt = datetime('now')`,
      [username, animeId],
      function (err) {
        if (err) return res.status(500).json({ message: "Failed to reset status." });
        res.json({ message: "Status reset." });
      }
    );
    return;
  }

  // Full removal
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

// ---- SEARCH ----
app.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Search query required" });
    await delay(300);
    const data = await fetchJikan("https://api.jikan.moe/v4/anime", { q: query, limit: 12 });
    res.json(data.data.map(formatAnime));
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
});

// ---- RECOMMENDATIONS ----
app.post("/recommend", async (req, res) => {
  const { genres = [], maxEpisodes, hiddenGem, mood, seedAnimeId, seedAnimeTitle } = req.body;
  const genreMap = { Action:1, Adventure:2, Comedy:4, Drama:8, Fantasy:10, Romance:22, Horror:14, SciFi:24 };
  const moodBoost = {
    Excited:["Action","Adventure"], Chill:["Comedy","Fantasy"],
    Adventurous:["Action","Fantasy","Adventure"], Romantic:["Romance","Drama"],
    Sad:["Drama","Romance"], Comedic:["Comedy"]
  };
  const moodKeywords = {
    Excited:["epic battle","tournament","shounen"], Chill:["slice of life","iyashikei","healing"],
    Adventurous:["adventure quest","journey","isekai"], Romantic:["love story","romance","shoujo"],
    Sad:["tragedy","emotional","tearjerker"], Comedic:["comedy","gag","parody"]
  };
  const ALLOWED_TYPES = ["TV","ONA","OVA"];

  try {
    let pool = [];
    let finalGenres = [...genres];
    if (mood && moodBoost[mood]) finalGenres = [...new Set([...finalGenres, ...moodBoost[mood]])];
    if (finalGenres.length === 0) finalGenres = ["Action"];

    for (const g of finalGenres) {
      const genreId = genreMap[g];
      if (!genreId) continue;
      const p1 = Math.floor(Math.random() * 3) + 1;
      const p2 = Math.floor(Math.random() * 3) + 4;
      try {
        const d1 = await fetchJikan("https://api.jikan.moe/v4/anime", { genres: genreId, limit: 20, order_by: "score", sort: "desc", page: p1, type: "tv" });
        pool.push(...(d1.data || []));
        await delay(500);
        const d2 = await fetchJikan("https://api.jikan.moe/v4/anime", { genres: genreId, limit: 20, order_by: "popularity", sort: "asc", page: p2, type: "tv" });
        pool.push(...(d2.data || []));
        await delay(500);
      } catch (e) { console.warn(`Genre ${g}:`, e.message); }
    }

    if (mood && moodKeywords[mood]) {
      for (const kw of shuffle(moodKeywords[mood]).slice(0, 2)) {
        try {
          const d = await fetchJikan("https://api.jikan.moe/v4/anime", { q: kw, limit: 15, order_by: "score", sort: "desc", type: "tv" });
          pool.push(...(d.data || []));
          await delay(500);
        } catch (e) {}
      }
    }

    if (seedAnimeId) {
      try {
        const d = await fetchJikan(`https://api.jikan.moe/v4/anime/${seedAnimeId}/recommendations`);
        for (const entry of (d.data || []).slice(0, 8)) {
          try {
            const detail = await fetchJikan(`https://api.jikan.moe/v4/anime/${entry.entry.mal_id}`);
            if (detail.data) pool.push(detail.data);
            await delay(400);
          } catch (e) {}
        }
      } catch (e) {}
    }

    if (seedAnimeTitle && !seedAnimeId) {
      try {
        const d = await fetchJikan("https://api.jikan.moe/v4/anime", { q: seedAnimeTitle, limit: 1 });
        if (d.data?.[0]) {
          const recs = await fetchJikan(`https://api.jikan.moe/v4/anime/${d.data[0].mal_id}/recommendations`);
          for (const entry of (recs.data || []).slice(0, 6)) {
            try {
              const detail = await fetchJikan(`https://api.jikan.moe/v4/anime/${entry.entry.mal_id}`);
              if (detail.data) pool.push(detail.data);
              await delay(400);
            } catch (e) {}
          }
        }
      } catch (e) {}
    }

    try {
      const seasonal = await fetchJikan("https://api.jikan.moe/v4/seasons/now", { limit: 20 });
      pool.push(...(seasonal.data || []));
    } catch (e) {}

    let filtered = dedupe(pool);
    filtered = filtered.filter(a => ALLOWED_TYPES.includes((a.type || "").toUpperCase()) || !a.type);
    filtered = filtered.filter(a => a.score && a.score >= 6.5);
    if (maxEpisodes) filtered = filtered.filter(a => !a.episodes || a.episodes <= maxEpisodes);
    if (hiddenGem) filtered = filtered.filter(a => a.score >= 7.2 && (a.members || 0) < 400000);

    const scored = filtered.map(anime => {
      let score = anime.score || 0;
      if (anime.score >= 8.5) score += 2;
      else if (anime.score >= 8.0) score += 1;
      score += Math.random() * 1.5;
      return { anime, score };
    });

    scored.sort((a, b) => b.score - a.score);
    const candidates = scored.slice(0, 40);
    const final = [...shuffle(candidates.slice(0, 20)), ...candidates.slice(20)];
    res.json(final.slice(0, 15).map(({ anime }) => formatAnime(anime)));

  } catch (error) {
    console.error("Recommendation error:", error.message);
    res.status(500).json([]);
  }
});

// ---- PERSONALIZED RECS ----
app.get("/personalized-recs/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const saved = await new Promise((resolve, reject) => {
      db.all(
        `SELECT sa.animeId, sa.title, r.rating FROM saved_anime sa
         LEFT JOIN ratings r ON r.username = sa.username AND r.animeId = sa.animeId
         WHERE sa.username = ?`,
        [username], (err, rows) => { if (err) reject(err); else resolve(rows); }
      );
    });

    if (saved.length === 0) return res.json([]);
    const savedIds = new Set(saved.map(s => s.animeId));
    let seeds = saved.filter(s => s.rating && s.rating >= 7);
    if (seeds.length === 0) seeds = saved;

    let pool = [];
    for (const seed of shuffle(seeds).slice(0, 4)) {
      try {
        const data = await fetchJikan(`https://api.jikan.moe/v4/anime/${seed.animeId}/recommendations`);
        for (const entry of (data.data || []).slice(0, 5)) {
          if (savedIds.has(entry.entry.mal_id)) continue;
          try {
            const detail = await fetchJikan(`https://api.jikan.moe/v4/anime/${entry.entry.mal_id}`);
            if (detail.data) pool.push({ ...detail.data, _seedTitle: seed.title });
            await delay(350);
          } catch (e) {}
        }
        await delay(500);
      } catch (e) {}
    }

    let filtered = dedupe(pool).filter(a => !savedIds.has(a.mal_id) && a.score >= 6.5);
    res.json(shuffle(filtered).slice(0, 12).map(anime => ({
      ...formatAnime(anime),
      seedTitle: anime._seedTitle || null
    })));
  } catch (error) {
    console.error("Personalized recs error:", error.message);
    res.status(500).json([]);
  }
});

// ---- SAVE ANIME (now stores episodes + type) ----
app.post("/save-anime", (req, res) => {
  const { username, anime } = req.body;
  if (!username || !anime) return res.status(400).json({ message: "Missing data." });
  const { id, title, image, url, genres = [], episodes = null, type = null } = anime;
  const genresJson = JSON.stringify(genres);

  db.get(`SELECT id FROM saved_anime WHERE username = ? AND animeId = ?`, [username, id], (err, existing) => {
    if (err)      return res.status(500).json({ message: "Database error." });
    if (existing) return res.status(409).json({ message: "Already saved." });
    db.run(
      `INSERT INTO saved_anime (username, animeId, title, image, url, genres, episodes, type)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, id, title, image, url, genresJson, episodes, type],
      function (err2) {
        if (err2) return res.status(500).json({ message: "Failed to save anime." });
        res.json({ message: "Anime saved successfully!" });
      }
    );
  });
});

// ---- WATCH STATUS (tracks updatedAt for "last watched" display) ----
app.post("/watch-status", (req, res) => {
  const { username, animeId, status } = req.body;
  const valid = ["none","watching","completed","rewatching"];
  if (!username || animeId === undefined) return res.status(400).json({ message: "Missing data." });
  if (!valid.includes(status)) return res.status(400).json({ message: "Invalid status." });

  db.run(
    `INSERT INTO watch_status (username, animeId, status, updatedAt) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(username, animeId) DO UPDATE SET status = excluded.status, updatedAt = datetime('now')`,
    [username, animeId, status],
    function (err) {
      if (err) return res.status(500).json({ message: "Failed to update watch status." });
      res.json({ message: "Watch status updated!" });
    }
  );
});

// ---- RATE ANIME ----
app.post("/rate-anime", (req, res) => {
  const { username, animeId, rating } = req.body;
  if (!username || animeId === undefined || rating === undefined)
    return res.status(400).json({ message: "Missing data." });
  const r = parseFloat(rating);
  if (isNaN(r) || r < 0.5 || r > 10) return res.status(400).json({ message: "Rating must be 0.5–10." });
  const rounded = Math.round(r * 2) / 2;
  db.run(
    `INSERT INTO ratings (username, animeId, rating) VALUES (?, ?, ?)
     ON CONFLICT(username, animeId) DO UPDATE SET rating = excluded.rating`,
    [username, animeId, rounded],
    function (err) {
      if (err) return res.status(500).json({ message: "Failed to save rating." });
      res.json({ message: "Rating saved!", rating: rounded });
    }
  );
});

// ---- EPISODE PROGRESS ----
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

// ---- START ----
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));