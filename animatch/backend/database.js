const sqlite3 = require("sqlite3").verbose();
const path    = require("path");

const dbPath = path.resolve(__dirname, "animatch.db");
const db     = new sqlite3.Database(dbPath, (err) => {
  if (err) console.error("Error opening database", err.message);
  else     console.log("✅ SQLite database connected!");
});

// USERS
db.run(`CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT UNIQUE,
  email        TEXT,
  age          INTEGER,
  gender       TEXT,
  passwordHash TEXT
)`, err => { if (err) console.error("users table error:", err.message); });

// SAVED ANIME — genres column added for top-genre stat
db.run(`CREATE TABLE IF NOT EXISTS saved_anime (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  animeId  INTEGER,
  title    TEXT,
  image    TEXT,
  url      TEXT,
  genres   TEXT DEFAULT ''
)`, err => { if (err) console.error("saved_anime table error:", err.message); });

// Migrate: add genres column if it doesn't exist yet (safe no-op if already there)
db.run(`ALTER TABLE saved_anime ADD COLUMN genres TEXT DEFAULT ''`,
  () => {}); // intentionally ignore error — means column already exists

// WATCH STATUS — status is 'none' | 'watching' | 'completed'
db.run(`CREATE TABLE IF NOT EXISTS watch_status (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  animeId  INTEGER,
  status   TEXT DEFAULT 'none',
  UNIQUE(username, animeId)
)`, err => { if (err) console.error("watch_status table error:", err.message); });

// Migrate: if old table has a 'watched' integer column, rename to status text
// We do this by checking if the new 'status' column exists
db.all(`PRAGMA table_info(watch_status)`, (err, cols) => {
  if (err) return;
  const hasStatus  = cols.some(c => c.name === "status");
  const hasWatched = cols.some(c => c.name === "watched");
  if (!hasStatus && hasWatched) {
    // Migrate old boolean watched -> status string
    db.run(`ALTER TABLE watch_status ADD COLUMN status TEXT DEFAULT 'none'`, () => {
      db.run(`UPDATE watch_status SET status = CASE WHEN watched = 1 THEN 'completed' ELSE 'none' END`);
    });
  }
});

// RATINGS — supports decimals (0.5 steps)
db.run(`CREATE TABLE IF NOT EXISTS ratings (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  animeId  INTEGER,
  rating   REAL,
  UNIQUE(username, animeId)
)`, err => { if (err) console.error("ratings table error:", err.message); });

// EPISODE PROGRESS
db.run(`CREATE TABLE IF NOT EXISTS episode_progress (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT,
  animeId   INTEGER,
  currentEp INTEGER DEFAULT 0,
  UNIQUE(username, animeId)
)`, err => { if (err) console.error("episode_progress table error:", err.message); });

module.exports = db;