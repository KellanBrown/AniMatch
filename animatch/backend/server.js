const express = require("express");
const cors    = require("cors");
const bcrypt  = require("bcrypt");
const axios   = require("axios");
const db      = require("./database");

const app = express();
app.use(cors());
app.use(express.json());

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry on 429 rate limit
const fetchJikan = async (url, params = {}, retries = 3) => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, { params });
      return res.data;
    } catch (err) {
      if (err.response?.status === 429 && i < retries - 1) {
        await delay(1200 * (i + 1));
      } else {
        throw err;
      }
    }
  }
};

// Shuffle an array (Fisher-Yates)
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Deduplicate by mal_id
const dedupe = (arr) => Array.from(new Map(arr.map(a => [a.mal_id, a])).values());

// Format a raw Jikan anime object into our standard shape
const formatAnime = (anime) => ({
  id:       anime.mal_id,
  title:    anime.title_english || anime.title,
  image:    anime.images?.jpg?.image_url || "",
  rating:   anime.score || "N/A",
  url:      anime.url,
  episodes: anime.episodes || null,
  genres:   (anime.genres || []).map(g => g.name)
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

// ---- ALL STATUS (watchlist) ----
app.get("/all-status/:username", (req, res) => {
  const { username } = req.params;
  db.all(
    `SELECT sa.animeId,
       COALESCE(ws.watched, 0)   AS watched,
       r.rating,
       COALESCE(ep.currentEp, 0) AS currentEp
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
       SUM(CASE WHEN ws.watched = 1 THEN 1 ELSE 0 END) AS totalWatched,
       SUM(CASE WHEN ws.watched = 0 OR ws.watched IS NULL THEN 1 ELSE 0 END) AS totalUnwatched,
       ROUND(AVG(r.rating), 1) AS avgRating
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

// ---- REMOVE ANIME ----
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

// ---- SEARCH ----
app.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Search query required" });
    await delay(300);
    const data    = await fetchJikan("https://api.jikan.moe/v4/anime", { q: query, limit: 12 });
    const results = data.data.map(formatAnime);
    res.json(results);
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
});

// ---- RECOMMENDATIONS (COMPLETELY REBUILT) ----
// Strategy: pull from multiple Jikan sources, shuffle heavily, score & filter.
// This ensures variety across every quiz attempt.
app.post("/recommend", async (req, res) => {
  const { genres = [], maxEpisodes, hiddenGem, mood, seedAnimeId, seedAnimeTitle } = req.body;

  const genreMap = { Action:1, Adventure:2, Comedy:4, Drama:8, Fantasy:10, Romance:22, Horror:14, SciFi:24 };
  const moodBoost = {
    Excited:     ["Action","Adventure"],
    Chill:       ["Comedy","Fantasy"],
    Adventurous: ["Action","Fantasy","Adventure"],
    Romantic:    ["Romance","Drama"],
    Sad:         ["Drama","Romance"],
    Comedic:     ["Comedy"]
  };

  // Mood → keyword searches for more diverse results
  const moodKeywords = {
    Excited:     ["epic battle","tournament","shounen"],
    Chill:       ["slice of life","iyashikei","healing"],
    Adventurous: ["adventure quest","journey","isekai"],
    Romantic:    ["love story","romance","shoujo"],
    Sad:         ["tragedy","emotional","tearjerker"],
    Comedic:     ["comedy","gag","parody"]
  };

  try {
    let pool = [];

    // -- Strategy 1: Genre-based fetches with RANDOM page offsets --
    // Using page offsets means we don't always get page 1 (the same top anime)
    let finalGenres = [...genres];
    if (mood && moodBoost[mood]) {
      finalGenres = [...new Set([...finalGenres, ...moodBoost[mood]])];
    }
    if (finalGenres.length === 0) finalGenres = ["Action"];

    for (const g of finalGenres) {
      const genreId = genreMap[g];
      if (!genreId) continue;

      // Fetch two different random pages per genre for variety
      const page1 = Math.floor(Math.random() * 3) + 1;
      const page2 = Math.floor(Math.random() * 3) + 4;

      try {
        const d1 = await fetchJikan("https://api.jikan.moe/v4/anime", {
          genres: genreId, limit: 20, order_by: "score", sort: "desc", page: page1
        });
        pool.push(...(d1.data || []));
        await delay(500);

        const d2 = await fetchJikan("https://api.jikan.moe/v4/anime", {
          genres: genreId, limit: 20, order_by: "popularity", sort: "asc", page: page2
        });
        pool.push(...(d2.data || []));
        await delay(500);
      } catch (e) { console.warn(`Genre ${g} fetch failed:`, e.message); }
    }

    // -- Strategy 2: Mood keyword searches --
    if (mood && moodKeywords[mood]) {
      const keywords = shuffle(moodKeywords[mood]);
      for (const kw of keywords.slice(0, 2)) {
        try {
          const d = await fetchJikan("https://api.jikan.moe/v4/anime", {
            q: kw, limit: 15, order_by: "score", sort: "desc"
          });
          pool.push(...(d.data || []));
          await delay(500);
        } catch (e) { console.warn(`Keyword fetch failed for "${kw}":`, e.message); }
      }
    }

    // -- Strategy 3: Seed anime recommendations (if user named an anime they love) --
    if (seedAnimeId) {
      try {
        const d = await fetchJikan(`https://api.jikan.moe/v4/anime/${seedAnimeId}/recommendations`);
        const seedRecs = (d.data || []).slice(0, 20).map(item => item.entry);
        // Fetch full details for each seed rec so we have score/episodes
        for (const entry of seedRecs.slice(0, 8)) {
          try {
            const detail = await fetchJikan(`https://api.jikan.moe/v4/anime/${entry.mal_id}`);
            if (detail.data) pool.push(detail.data);
            await delay(400);
          } catch (e) { /* skip if detail fetch fails */ }
        }
      } catch (e) { console.warn("Seed anime recs failed:", e.message); }
    }

    // If seed was given as a title search instead
    if (seedAnimeTitle && !seedAnimeId) {
      try {
        const d = await fetchJikan("https://api.jikan.moe/v4/anime", { q: seedAnimeTitle, limit: 1 });
        if (d.data && d.data[0]) {
          const seedId = d.data[0].mal_id;
          const recs   = await fetchJikan(`https://api.jikan.moe/v4/anime/${seedId}/recommendations`);
          const seedRecs = (recs.data || []).slice(0, 15).map(item => item.entry);
          for (const entry of seedRecs.slice(0, 6)) {
            try {
              const detail = await fetchJikan(`https://api.jikan.moe/v4/anime/${entry.mal_id}`);
              if (detail.data) pool.push(detail.data);
              await delay(400);
            } catch (e) { /* skip */ }
          }
        }
      } catch (e) { console.warn("Seed title search failed:", e.message); }
    }

    // -- Strategy 4: Current season for freshness --
    try {
      const seasonal = await fetchJikan("https://api.jikan.moe/v4/seasons/now", { limit: 20 });
      pool.push(...(seasonal.data || []));
    } catch (e) { console.warn("Seasonal fetch failed:", e.message); }

    // ---- FILTER ----
    let filtered = dedupe(pool);

    // Remove anything with no score or very low score
    filtered = filtered.filter(a => a.score && a.score >= 6.5);

    if (maxEpisodes) {
      filtered = filtered.filter(a => !a.episodes || a.episodes <= maxEpisodes);
    }

    if (hiddenGem) {
      // Hidden gems: decent score but not mainstream popular
      filtered = filtered.filter(a => a.score >= 7.2 && (a.members || 0) < 400000);
    }

    // ---- SCORE & DIVERSIFY ----
    const scored = filtered.map(anime => {
      let score = anime.score || 0;

      // Boost highly rated
      if (anime.score >= 8.5) score += 2;
      else if (anime.score >= 8.0) score += 1;

      // Slight boost for seed-related results (they're more personally relevant)
      if (seedAnimeId || seedAnimeTitle) {
        const genres = (anime.genres || []).map(g => g.name);
        if (genres.some(g => finalGenres.includes(g))) score += 0.5;
      }

      // Add randomness so results vary every quiz attempt
      score += Math.random() * 1.5;

      return { anime, score };
    });

    // Sort by score
    scored.sort((a, b) => b.score - a.score);

    // Take top 40 candidates, then shuffle the top 20 to add even more variety
    const candidates = scored.slice(0, 40);
    const shuffled   = shuffle(candidates.slice(0, 20));
    const final      = [...shuffled, ...candidates.slice(20)];

    const results = final.slice(0, 15).map(({ anime }) => formatAnime(anime));

    res.json(results);

  } catch (error) {
    console.error("Recommendation error:", error.message);
    res.status(500).json([]);
  }
});

// ---- PERSONALIZED RECOMMENDATIONS ("Because you liked X") ----
// Looks at the user's saved anime, picks the ones rated >= 7 (or all saved if no ratings),
// fetches Jikan recommendations for each, deduplicates, and returns fresh suggestions
// that aren't already in the user's saved list.
app.get("/personalized-recs/:username", async (req, res) => {
  const { username } = req.params;

  try {
    // Get the user's saved anime + their ratings
    const saved = await new Promise((resolve, reject) => {
      db.all(
        `SELECT sa.animeId, sa.title, r.rating
         FROM saved_anime sa
         LEFT JOIN ratings r ON r.username = sa.username AND r.animeId = sa.animeId
         WHERE sa.username = ?`,
        [username],
        (err, rows) => { if (err) reject(err); else resolve(rows); }
      );
    });

    if (saved.length === 0) return res.json([]);

    // Pick seed anime: prefer highly rated ones, fall back to all saved
    const savedIds = new Set(saved.map(s => s.animeId));
    let seeds = saved.filter(s => s.rating && s.rating >= 7);
    if (seeds.length === 0) seeds = saved;

    // Shuffle seeds and take up to 4 to keep response time reasonable
    const seedSample = shuffle(seeds).slice(0, 4);

    let pool = [];

    for (const seed of seedSample) {
      try {
        const data = await fetchJikan(`https://api.jikan.moe/v4/anime/${seed.animeId}/recommendations`);
        const recs = (data.data || []).slice(0, 12).map(item => ({
          ...item.entry,
          _seedTitle: seed.title  // track which seed triggered this rec
        }));

        // Fetch full details for score/episodes
        for (const entry of recs.slice(0, 5)) {
          if (savedIds.has(entry.mal_id)) continue; // skip already saved
          try {
            const detail = await fetchJikan(`https://api.jikan.moe/v4/anime/${entry.mal_id}`);
            if (detail.data) pool.push({ ...detail.data, _seedTitle: entry._seedTitle });
            await delay(350);
          } catch (e) { /* skip */ }
        }
        await delay(500);
      } catch (e) {
        console.warn(`Personalized recs failed for seed ${seed.animeId}:`, e.message);
      }
    }

    // Dedupe and remove already-saved anime
    let filtered = dedupe(pool).filter(a => !savedIds.has(a.mal_id) && a.score >= 6.5);

    // Shuffle for variety
    filtered = shuffle(filtered);

    // Return up to 12 with the seed title attached so frontend can show "Because you liked X"
    const results = filtered.slice(0, 12).map(anime => ({
      ...formatAnime(anime),
      seedTitle: anime._seedTitle || null
    }));

    res.json(results);

  } catch (error) {
    console.error("Personalized recs error:", error.message);
    res.status(500).json([]);
  }
});

// ---- SAVE ANIME ----
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

// ---- WATCH STATUS ----
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

// ---- RATE ANIME ----
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