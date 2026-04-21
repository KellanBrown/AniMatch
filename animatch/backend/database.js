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
  email        TEXT UNIQUE,
  age          INTEGER,
  gender       TEXT,
  passwordHash TEXT
)`, err => { if (err) console.error("users:", err.message); });

// SAVED ANIME
db.run(`CREATE TABLE IF NOT EXISTS saved_anime (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  animeId  INTEGER,
  title    TEXT,
  image    TEXT,
  url      TEXT,
  genres   TEXT DEFAULT '[]',
  episodes INTEGER DEFAULT NULL,
  type     TEXT DEFAULT NULL,
  malScore REAL DEFAULT NULL
)`, err => { if (err) console.error("saved_anime:", err.message); });

// Safe migrations
["genres TEXT DEFAULT '[]'", "episodes INTEGER DEFAULT NULL",
 "type TEXT DEFAULT NULL", "malScore REAL DEFAULT NULL"].forEach(col => {
  db.run(`ALTER TABLE saved_anime ADD COLUMN ${col}`, () => {});
});

// WATCH STATUS
db.run(`CREATE TABLE IF NOT EXISTS watch_status (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT,
  animeId   INTEGER,
  status    TEXT DEFAULT 'none',
  updatedAt TEXT DEFAULT (datetime('now')),
  UNIQUE(username, animeId)
)`, err => { if (err) console.error("watch_status:", err.message); });

["status TEXT DEFAULT 'none'", "updatedAt TEXT DEFAULT (datetime('now'))"].forEach(col => {
  db.run(`ALTER TABLE watch_status ADD COLUMN ${col}`, () => {});
});

// Migrate old boolean watched column
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

// RATINGS
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

// ANIME NOTES — personal journal entries per saved anime
db.run(`CREATE TABLE IF NOT EXISTS anime_notes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT,
  animeId   INTEGER,
  note      TEXT DEFAULT '',
  updatedAt TEXT DEFAULT (datetime('now')),
  UNIQUE(username, animeId)
)`, err => { if (err) console.error("anime_notes:", err.message); });

// FRIENDS
db.run(`CREATE TABLE IF NOT EXISTS friends (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  requester  TEXT,
  receiver   TEXT,
  status     TEXT DEFAULT 'pending',
  createdAt  TEXT DEFAULT (datetime('now')),
  UNIQUE(requester, receiver)
)`, err => { if (err) console.error("friends:", err.message); });

// PASSWORD RESET TOKENS
db.run(`CREATE TABLE IF NOT EXISTS password_resets (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT,
  token     TEXT UNIQUE,
  expiresAt TEXT,
  used      INTEGER DEFAULT 0
)`, err => { if (err) console.error("password_resets:", err.message); });

module.exports = db;