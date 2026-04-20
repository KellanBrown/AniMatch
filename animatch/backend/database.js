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
)`, err => { if (err) console.error("users:", err.message); });

// SAVED ANIME — now stores episodes + type so cards always have full data
db.run(`CREATE TABLE IF NOT EXISTS saved_anime (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  animeId  INTEGER,
  title    TEXT,
  image    TEXT,
  url      TEXT,
  genres   TEXT DEFAULT '[]',
  episodes INTEGER DEFAULT NULL,
  type     TEXT DEFAULT NULL
)`, err => { if (err) console.error("saved_anime:", err.message); });

// Safe migrations — no-op if columns already exist
db.run(`ALTER TABLE saved_anime ADD COLUMN genres   TEXT    DEFAULT '[]'`, () => {});
db.run(`ALTER TABLE saved_anime ADD COLUMN episodes INTEGER DEFAULT NULL`,  () => {});
db.run(`ALTER TABLE saved_anime ADD COLUMN type     TEXT    DEFAULT NULL`,  () => {});

// WATCH STATUS — status: 'none' | 'watching' | 'completed' | 'rewatching'
// updatedAt lets us show "picked up X days ago"
db.run(`CREATE TABLE IF NOT EXISTS watch_status (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT,
  animeId   INTEGER,
  status    TEXT DEFAULT 'none',
  updatedAt TEXT DEFAULT (datetime('now')),
  UNIQUE(username, animeId)
)`, err => { if (err) console.error("watch_status:", err.message); });

db.run(`ALTER TABLE watch_status ADD COLUMN status    TEXT DEFAULT 'none'`,           () => {});
db.run(`ALTER TABLE watch_status ADD COLUMN updatedAt TEXT DEFAULT (datetime('now'))`, () => {});

// Migrate old boolean 'watched' column if it exists
db.all(`PRAGMA table_info(watch_status)`, (err, cols) => {
  if (err || !cols) return;
  const hasStatus  = cols.some(c => c.name === "status");
  const hasWatched = cols.some(c => c.name === "watched");
  if (!hasStatus && hasWatched) {
    db.run(`ALTER TABLE watch_status ADD COLUMN status TEXT DEFAULT 'none'`, () => {
      db.run(`UPDATE watch_status SET status = CASE WHEN watched = 1 THEN 'completed' ELSE 'none' END`);
    });
  }
});

// RATINGS — REAL for 0.5 steps
db.run(`CREATE TABLE IF NOT EXISTS ratings (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  animeId  INTEGER,
  rating   REAL,
  UNIQUE(username, animeId)
)`, err => { if (err) console.error("ratings:", err.message); });

// EPISODE PROGRESS
db.run(`CREATE TABLE IF NOT EXISTS episode_progress (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT,
  animeId   INTEGER,
  currentEp INTEGER DEFAULT 0,
  UNIQUE(username, animeId)
)`, err => { if (err) console.error("episode_progress:", err.message); });

module.exports = db;