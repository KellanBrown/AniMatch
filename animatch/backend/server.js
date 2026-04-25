const express = require("express");
const cors    = require("cors");
const bcrypt  = require("bcrypt");
const axios   = require("axios");
const crypto  = require("crypto");
const db      = require("./database");

const app = express();
app.use(cors());
app.use(express.json());

// Simple promise-based delay, used to avoid hammering the Jikan API
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Wraps Jikan API calls with basic retry logic. If we get rate-limited (429),
// we wait a bit longer each attempt before trying again.
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

// Fisher-Yates shuffle — produces a new shuffled array without mutating the original
const shuffle = (arr) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// Removes duplicate anime entries by mal_id, keeping the first occurrence
const dedupe = (arr) => Array.from(new Map(arr.map(a => [a.mal_id, a])).values());

// Strips down a raw Jikan anime object to just what the frontend needs.
// Note: rating here is the MAL community score, never a user's personal rating.
const formatAnime = (anime) => ({
  id:       anime.mal_id,
  title:    anime.title_english || anime.title,
  image:    anime.images?.jpg?.image_url || "",
  rating:   anime.score ?? null,
  url:      anime.url,
  episodes: anime.episodes ?? null,
  type:     anime.type     ?? null,
  genres:   (anime.genres  || []).map(g => g.name)
});

// Silently saves an anime to the user's list when they set a watch status,
// so they don't have to hit a separate "Save" button. Skips if already saved.
const autoSave = (username, anime) => {
  if (!username || !anime?.id) return;
  db.get(
    `SELECT id FROM saved_anime WHERE username = ? AND animeId = ?`,
    [username, anime.id],
    (err, existing) => {
      if (err || existing) return;
      db.run(
        `INSERT INTO saved_anime (username, animeId, title, image, url, genres, episodes, type, malScore)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [username, anime.id, anime.title, anime.image, anime.url,
         JSON.stringify(anime.genres || []), anime.episodes ?? null,
         anime.type ?? null, anime.malScore ?? null],
        (err2) => { if (err2) console.error("Auto-save error:", err2.message); }
      );
    }
  );
};

app.get("/", (req, res) => res.send("AniMatch backend is running!"));

// Creates a new user. All fields are required, and we hash the password
// before storing it — never save plaintext passwords.
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
        if (err.message.includes("UNIQUE")) return res.status(400).json({ message: "Username or email already exists." });
        return res.status(500).json({ message: "Database error." });
      }
      res.json({ message: `Signup successful! Welcome, ${username}` });
    }
  );
});

// Looks up the user by username, then uses bcrypt to compare the submitted
// password against the stored hash. Returns a generic error either way so
// we don't leak whether the username exists.
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

// Generates a one-time reset token tied to the user's account.
// We always return a success message even if the email isn't found —
// this prevents attackers from probing which emails are registered.
app.post("/forgot-password", (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ message: "Email required." });

  db.get(`SELECT username FROM users WHERE email = ?`, [email], (err, user) => {
    if (err)   return res.status(500).json({ message: "Database error." });
    if (!user) return res.json({ message: "If that email exists, a reset link has been generated." });

    const token     = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60).toISOString(); // expires in 1 hour

    db.run(
      `INSERT INTO password_resets (username, token, expiresAt, used) VALUES (?, ?, ?, 0)`,
      [user.username, token, expiresAt],
      function (err2) {
        if (err2) return res.status(500).json({ message: "Could not create reset token." });
        // In a real app you'd email this link. For now we return it directly so you can test it.
        res.json({
          message: "Reset token generated!",
          resetToken: token,
          username: user.username,
          note: "Use this token on the reset password screen. Valid for 1 hour."
        });
      }
    );
  });
});

// Validates the token, checks it hasn't expired or been used, then
// updates the password and marks the token as consumed so it can't be reused.
app.post("/reset-password", async (req, res) => {
  const { token, newPassword } = req.body;
  if (!token || !newPassword) return res.status(400).json({ message: "Token and new password required." });
  if (newPassword.length < 6)  return res.status(400).json({ message: "Password must be at least 6 characters." });

  db.get(
    `SELECT * FROM password_resets WHERE token = ? AND used = 0`,
    [token],
    async (err, reset) => {
      if (err)    return res.status(500).json({ message: "Database error." });
      if (!reset) return res.status(400).json({ message: "Invalid or already used token." });
      if (new Date(reset.expiresAt) < new Date())
        return res.status(400).json({ message: "Token has expired. Please request a new one." });

      const passwordHash = await bcrypt.hash(newPassword, 10);
      db.run(`UPDATE users SET passwordHash = ? WHERE username = ?`, [passwordHash, reset.username], (err2) => {
        if (err2) return res.status(500).json({ message: "Failed to update password." });
        db.run(`UPDATE password_resets SET used = 1 WHERE token = ?`, [token]);
        res.json({ message: "Password reset successfully! You can now log in." });
      });
    }
  );
});

// Returns basic profile info for the dashboard. Recommendations are
// handled separately so this stays fast.
app.get("/dashboard/:username", (req, res) => {
  const { username } = req.params;
  db.get(`SELECT username, email, age, gender FROM users WHERE username = ?`, [username], (err, user) => {
    if (err)   return res.status(500).json({ message: "Database error." });
    if (!user) return res.status(404).json({ message: "User not found." });
    res.json({ user, recommendations: [] });
  });
});

app.get("/saved-anime/:username", (req, res) => {
  const { username } = req.params;
  db.all(`SELECT * FROM saved_anime WHERE username = ?`, [username], (err, rows) => {
    if (err) return res.status(500).json({ message: "Database error." });
    res.json(rows);
  });
});

// Fetches watch status, personal rating, episode progress, and notes for
// a single anime card. Four separate queries because the data lives in
// four separate tables.
app.get("/anime-status/:username/:animeId", (req, res) => {
  const { username, animeId } = req.params;
  db.get(`SELECT status, updatedAt FROM watch_status WHERE username = ? AND animeId = ?`, [username, animeId], (err, watchRow) => {
    if (err) return res.status(500).json({ message: "Database error." });
    db.get(`SELECT rating FROM ratings WHERE username = ? AND animeId = ?`, [username, animeId], (err2, ratingRow) => {
      if (err2) return res.status(500).json({ message: "Database error." });
      db.get(`SELECT currentEp FROM episode_progress WHERE username = ? AND animeId = ?`, [username, animeId], (err3, epRow) => {
        if (err3) return res.status(500).json({ message: "Database error." });
        db.get(`SELECT note FROM anime_notes WHERE username = ? AND animeId = ?`, [username, animeId], (err4, noteRow) => {
          res.json({
            status:    watchRow  ? (watchRow.status || "none") : "none",
            updatedAt: watchRow  ? watchRow.updatedAt           : null,
            rating:    ratingRow ? ratingRow.rating              : null,
            currentEp: epRow     ? epRow.currentEp               : 0,
            note:      noteRow   ? noteRow.note                  : ""
          });
        });
      });
    });
  });
});

// Joins all four status tables in a single query so the watchlist page
// doesn't need to fire per-card requests. Much faster than anime-status
// when you're loading a full list.
app.get("/all-status/:username", (req, res) => {
  const { username } = req.params;
  db.all(
    `SELECT
       sa.animeId, sa.title, sa.image, sa.url, sa.genres,
       sa.episodes, sa.type, sa.malScore,
       COALESCE(ws.status, 'none') AS status,
       ws.updatedAt,
       r.rating,
       COALESCE(ep.currentEp, 0)   AS currentEp,
       COALESCE(an.note, '')       AS note
     FROM saved_anime sa
     LEFT JOIN watch_status     ws ON ws.username = sa.username AND ws.animeId = sa.animeId
     LEFT JOIN ratings          r  ON r.username  = sa.username AND r.animeId  = sa.animeId
     LEFT JOIN episode_progress ep ON ep.username = sa.username AND ep.animeId = sa.animeId
     LEFT JOIN anime_notes      an ON an.username = sa.username AND an.animeId = sa.animeId
     WHERE sa.username = ?`,
    [username],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Database error." });
      res.json(rows);
    }
  );
});

// Aggregates the user's library into summary numbers shown on the dashboard.
// The genre query runs separately because it needs to parse JSON arrays stored
// in the genres column, and SQLite doesn't have a native JSON_EACH in all versions.
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
      db.all(`SELECT genres FROM saved_anime WHERE username = ? AND genres != '' AND genres IS NOT NULL`, [username], (err2, genreRows) => {
        let topGenre = null;
        if (!err2 && genreRows.length > 0) {
          const counts = {};
          genreRows.forEach(r => {
            try { JSON.parse(r.genres).forEach(g => { counts[g] = (counts[g] || 0) + 1; }); } catch (e) {}
          });
          // Pick whichever genre appears most across the user's saved anime
          topGenre = Object.entries(counts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;
        }
        res.json({
          totalSaved:     row.totalSaved     || 0,
          totalCompleted: row.totalCompleted || 0,
          totalWatching:  row.totalWatching  || 0,
          avgRating:      row.avgRating      || null,
          topGenre
        });
      });
    }
  );
});

// Removes an anime and all its associated data (status, rating, progress, notes)
// from every table. The deletes are fire-and-forget except for the last one,
// which is where we send the response.
app.delete("/remove-anime", (req, res) => {
  const { username, animeId } = req.body;
  if (!username || !animeId) return res.status(400).json({ message: "Missing data." });
  db.run(`DELETE FROM saved_anime      WHERE username = ? AND animeId = ?`, [username, animeId]);
  db.run(`DELETE FROM watch_status     WHERE username = ? AND animeId = ?`, [username, animeId]);
  db.run(`DELETE FROM ratings          WHERE username = ? AND animeId = ?`, [username, animeId]);
  db.run(`DELETE FROM episode_progress WHERE username = ? AND animeId = ?`, [username, animeId]);
  db.run(`DELETE FROM anime_notes      WHERE username = ? AND animeId = ?`, [username, animeId],
    function (err) {
      if (err) return res.status(500).json({ message: "Failed to remove." });
      res.json({ message: "Anime removed." });
    }
  );
});

app.get("/search", async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) return res.status(400).json({ error: "Search query required" });
    await delay(300); // small pause to be polite to the Jikan API
    const data = await fetchJikan("https://api.jikan.moe/v4/anime", { q: query, limit: 12 });
    res.json(data.data.map(formatAnime));
  } catch (error) {
    console.error("Search error:", error.message);
    res.status(500).json({ error: "Search failed" });
  }
});

// Builds a recommendation pool from multiple sources: genre-based queries,
// mood keywords, seed anime recommendations, and the current airing season.
// Everything gets deduplicated and scored before we return the top results.
app.post("/recommend", async (req, res) => {
  const { genres = [], maxEpisodes, hiddenGem, mood, seedAnimeId, seedAnimeTitle } = req.body;

  // Maps genre names to Jikan's internal genre IDs
  const genreMap = { Action:1, Adventure:2, Comedy:4, Drama:8, Fantasy:10, Romance:22, Horror:14, SciFi:24 };

  // If the user picked a mood, we expand their genre list automatically
  const moodBoost = { Excited:["Action","Adventure"], Chill:["Comedy","Fantasy"], Adventurous:["Action","Fantasy","Adventure"], Romantic:["Romance","Drama"], Sad:["Drama","Romance"], Comedic:["Comedy"] };

  // Additional search terms that go with each mood
  const moodKeywords = { Excited:["epic battle","tournament","shounen"], Chill:["slice of life","iyashikei","healing"], Adventurous:["adventure quest","journey","isekai"], Romantic:["love story","romance","shoujo"], Sad:["tragedy","emotional","tearjerker"], Comedic:["comedy","gag","parody"] };

  const ALLOWED_TYPES = ["TV","ONA","OVA"];

  try {
    let pool = [], finalGenres = [...genres];
    if (mood && moodBoost[mood]) finalGenres = [...new Set([...finalGenres, ...moodBoost[mood]])];
    if (finalGenres.length === 0) finalGenres = ["Action"];

    // Pull two pages per genre: one sorted by score, one by popularity.
    // Randomizing the page number adds variety so you don't see the same results every time.
    for (const g of finalGenres) {
      const genreId = genreMap[g];
      if (!genreId) continue;
      try {
        const d1 = await fetchJikan("https://api.jikan.moe/v4/anime", { genres: genreId, limit: 20, order_by: "score", sort: "desc", page: Math.floor(Math.random() * 3) + 1, type: "tv" });
        pool.push(...(d1.data || [])); await delay(500);
        const d2 = await fetchJikan("https://api.jikan.moe/v4/anime", { genres: genreId, limit: 20, order_by: "popularity", sort: "asc", page: Math.floor(Math.random() * 3) + 4, type: "tv" });
        pool.push(...(d2.data || [])); await delay(500);
      } catch (e) {}
    }

    // Add keyword-based results for the selected mood
    if (mood && moodKeywords[mood]) {
      for (const kw of shuffle(moodKeywords[mood]).slice(0, 2)) {
        try { const d = await fetchJikan("https://api.jikan.moe/v4/anime", { q: kw, limit: 15, order_by: "score", sort: "desc", type: "tv" }); pool.push(...(d.data || [])); await delay(500); } catch (e) {}
      }
    }

    // If a seed anime was provided, fetch what MAL recommends based on it
    const processSeedRecs = async (seedId) => {
      try {
        const d = await fetchJikan(`https://api.jikan.moe/v4/anime/${seedId}/recommendations`);
        for (const entry of (d.data || []).slice(0, 8)) {
          try { const detail = await fetchJikan(`https://api.jikan.moe/v4/anime/${entry.entry.mal_id}`); if (detail.data) pool.push(detail.data); await delay(400); } catch (e) {}
        }
      } catch (e) {}
    };

    if (seedAnimeId) await processSeedRecs(seedAnimeId);
    if (seedAnimeTitle && !seedAnimeId) {
      // If we only have a title, search for it first to get the ID, then pull its recs
      try {
        const d = await fetchJikan("https://api.jikan.moe/v4/anime", { q: seedAnimeTitle, limit: 1 });
        if (d.data?.[0]) await processSeedRecs(d.data[0].mal_id);
      } catch (e) {}
    }

    // Toss in currently airing anime for freshness
    try { const s = await fetchJikan("https://api.jikan.moe/v4/seasons/now", { limit: 20 }); pool.push(...(s.data || [])); } catch (e) {}

    let filtered = dedupe(pool)
      .filter(a => ALLOWED_TYPES.includes((a.type || "").toUpperCase()) || !a.type)
      .filter(a => a.score && a.score >= 6.5);
    if (maxEpisodes) filtered = filtered.filter(a => !a.episodes || a.episodes <= maxEpisodes);

    // Hidden gem mode: must be well-rated but not widely known (low member count)
    if (hiddenGem) filtered = filtered.filter(a => a.score >= 7.2 && (a.members || 0) < 400000);

    // Boost highly-rated shows, then add a small random factor so the list
    // feels different on each request rather than always returning the same order.
    const scored = filtered.map(anime => {
      let score = anime.score || 0;
      if (anime.score >= 8.5) score += 2;
      else if (anime.score >= 8.0) score += 1;
      score += Math.random() * 1.5;
      return { anime, score };
    }).sort((a, b) => b.score - a.score);

    // Shuffle the top 20 to mix things up, then append the rest in order
    const candidates = scored.slice(0, 40);
    const final = [...shuffle(candidates.slice(0, 20)), ...candidates.slice(20)];
    res.json(final.slice(0, 15).map(({ anime }) => formatAnime(anime)));
  } catch (error) {
    console.error("Recommendation error:", error.message);
    res.status(500).json([]);
  }
});

// Generates recommendations tailored to what the user has already saved.
// Prioritizes anime they rated 7 or higher as seeds. Falls back to the
// full saved list if nothing is rated yet.
app.get("/personalized-recs/:username", async (req, res) => {
  const { username } = req.params;
  try {
    const saved = await new Promise((resolve, reject) => {
      db.all(`SELECT sa.animeId, sa.title, r.rating FROM saved_anime sa LEFT JOIN ratings r ON r.username = sa.username AND r.animeId = sa.animeId WHERE sa.username = ?`, [username], (err, rows) => { if (err) reject(err); else resolve(rows); });
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
          if (savedIds.has(entry.entry.mal_id)) continue; // skip things they already have
          try { const detail = await fetchJikan(`https://api.jikan.moe/v4/anime/${entry.entry.mal_id}`); if (detail.data) pool.push({ ...detail.data, _seedTitle: seed.title }); await delay(350); } catch (e) {}
        }
        await delay(500);
      } catch (e) {}
    }
    let filtered = dedupe(pool).filter(a => !savedIds.has(a.mal_id) && a.score >= 6.5);
    res.json(shuffle(filtered).slice(0, 12).map(anime => ({ ...formatAnime(anime), seedTitle: anime._seedTitle || null })));
  } catch (error) {
    res.status(500).json([]);
  }
});

app.post("/save-anime", (req, res) => {
  const { username, anime } = req.body;
  if (!username || !anime) return res.status(400).json({ message: "Missing data." });
  const { id, title, image, url, genres = [], episodes = null, type = null, malScore = null } = anime;
  db.get(`SELECT id FROM saved_anime WHERE username = ? AND animeId = ?`, [username, id], (err, existing) => {
    if (err)      return res.status(500).json({ message: "Database error." });
    if (existing) return res.status(409).json({ message: "Already saved." });
    db.run(
      `INSERT INTO saved_anime (username, animeId, title, image, url, genres, episodes, type, malScore) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [username, id, title, image, url, JSON.stringify(genres), episodes, type, malScore],
      function (err2) {
        if (err2) return res.status(500).json({ message: "Failed to save anime." });
        res.json({ message: "Anime saved successfully!" });
      }
    );
  });
});

// Updates the user's watch status for an anime. Also triggers autoSave so the
// anime shows up in their list even if they never manually saved it first.
app.post("/watch-status", (req, res) => {
  const { username, animeId, status, anime } = req.body;
  const valid = ["none","watching","completed","rewatching"];
  if (!username || animeId === undefined) return res.status(400).json({ message: "Missing data." });
  if (!valid.includes(status)) return res.status(400).json({ message: "Invalid status." });

  if (anime) autoSave(username, anime);

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

// Ratings are stored as half-point increments (0.5–10). We round here so
// values like 7.3 don't sneak in through the API.
app.post("/rate-anime", (req, res) => {
  const { username, animeId, rating } = req.body;
  if (!username || animeId === undefined || rating === undefined) return res.status(400).json({ message: "Missing data." });
  const r = parseFloat(rating);
  if (isNaN(r) || r < 0.5 || r > 10) return res.status(400).json({ message: "Rating must be 0.5–10." });
  const rounded = Math.round(r * 2) / 2;
  db.run(
    `INSERT INTO ratings (username, animeId, rating) VALUES (?, ?, ?) ON CONFLICT(username, animeId) DO UPDATE SET rating = excluded.rating`,
    [username, animeId, rounded],
    function (err) {
      if (err) return res.status(500).json({ message: "Failed to save rating." });
      res.json({ message: "Rating saved!", rating: rounded });
    }
  );
});

app.post("/episode-progress", (req, res) => {
  const { username, animeId, currentEp } = req.body;
  if (!username || animeId === undefined || currentEp === undefined) return res.status(400).json({ message: "Missing data." });
  db.run(
    `INSERT INTO episode_progress (username, animeId, currentEp) VALUES (?, ?, ?) ON CONFLICT(username, animeId) DO UPDATE SET currentEp = excluded.currentEp`,
    [username, animeId, currentEp],
    function (err) {
      if (err) return res.status(500).json({ message: "Failed to save progress." });
      res.json({ message: "Progress saved!" });
    }
  );
});

app.post("/anime-note", (req, res) => {
  const { username, animeId, note } = req.body;
  if (!username || animeId === undefined) return res.status(400).json({ message: "Missing data." });
  db.run(
    `INSERT INTO anime_notes (username, animeId, note, updatedAt) VALUES (?, ?, ?, datetime('now'))
     ON CONFLICT(username, animeId) DO UPDATE SET note = excluded.note, updatedAt = datetime('now')`,
    [username, animeId, note || ""],
    function (err) {
      if (err) return res.status(500).json({ message: "Failed to save note." });
      res.json({ message: "Note saved!" });
    }
  );
});

// Checks that the two users are actually friends before exposing anyone's watchlist.
// The friend check queries both directions of the relationship since either person
// could have been the one who sent the original request.
app.post("/friends/request", (req, res) => {
  const { requester, receiver } = req.body;
  if (!requester || !receiver) return res.status(400).json({ message: "Missing data." });
  if (requester === receiver)  return res.status(400).json({ message: "You can't friend yourself!" });

  db.get(`SELECT id FROM users WHERE username = ?`, [receiver], (err, user) => {
    if (err)   return res.status(500).json({ message: "Database error." });
    if (!user) return res.status(404).json({ message: "User not found." });

    db.run(
      `INSERT INTO friends (requester, receiver, status) VALUES (?, ?, 'pending')`,
      [requester, receiver],
      function (err2) {
        if (err2) {
          if (err2.message.includes("UNIQUE")) return res.status(409).json({ message: "Request already sent." });
          return res.status(500).json({ message: "Database error." });
        }
        res.json({ message: `Friend request sent to ${receiver}!` });
      }
    );
  });
});

app.post("/friends/accept", (req, res) => {
  const { requester, receiver } = req.body;
  db.run(
    `UPDATE friends SET status = 'accepted' WHERE requester = ? AND receiver = ? AND status = 'pending'`,
    [requester, receiver],
    function (err) {
      if (err) return res.status(500).json({ message: "Database error." });
      if (this.changes === 0) return res.status(404).json({ message: "Request not found." });
      res.json({ message: "Friend request accepted!" });
    }
  );
});

// Handles both declining a pending request and removing an existing friendship.
// We check both directions so it doesn't matter who calls it.
app.delete("/friends", (req, res) => {
  const { userA, userB } = req.body;
  db.run(
    `DELETE FROM friends WHERE (requester = ? AND receiver = ?) OR (requester = ? AND receiver = ?)`,
    [userA, userB, userB, userA],
    function (err) {
      if (err) return res.status(500).json({ message: "Database error." });
      res.json({ message: "Removed." });
    }
  );
});

// Returns all friend relationships for a user: accepted friends, sent requests,
// and received requests. The direction field tells the frontend which pending
// ones to show as incoming vs outgoing.
app.get("/friends/:username", (req, res) => {
  const { username } = req.params;
  db.all(
    `SELECT
       CASE WHEN requester = ? THEN receiver ELSE requester END AS friendName,
       status,
       CASE WHEN requester = ? THEN 'sent' ELSE 'received' END AS direction
     FROM friends
     WHERE (requester = ? OR receiver = ?)`,
    [username, username, username, username],
    (err, rows) => {
      if (err) return res.status(500).json({ message: "Database error." });
      res.json(rows);
    }
  );
});

app.get("/friends/:username/watchlist/:friendName", (req, res) => {
  const { username, friendName } = req.params;

  db.get(
    `SELECT id FROM friends WHERE status = 'accepted' AND ((requester = ? AND receiver = ?) OR (requester = ? AND receiver = ?))`,
    [username, friendName, friendName, username],
    (err, friendship) => {
      if (err)         return res.status(500).json({ message: "Database error." });
      if (!friendship) return res.status(403).json({ message: "You are not friends with this user." });

      db.all(
        `SELECT sa.animeId, sa.title, sa.image, sa.url, sa.episodes, sa.type, sa.malScore,
           COALESCE(ws.status, 'none') AS status,
           r.rating,
           COALESCE(ep.currentEp, 0)  AS currentEp
         FROM saved_anime sa
         LEFT JOIN watch_status     ws ON ws.username = sa.username AND ws.animeId = sa.animeId
         LEFT JOIN ratings          r  ON r.username  = sa.username AND r.animeId  = sa.animeId
         LEFT JOIN episode_progress ep ON ep.username = sa.username AND ep.animeId = sa.animeId
         WHERE sa.username = ?`,
        [friendName],
        (err2, rows) => {
          if (err2) return res.status(500).json({ message: "Database error." });
          res.json(rows);
        }
      );
    }
  );
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));