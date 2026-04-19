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
)`, err => { if (err) console.error("Error creating users table", err.message); });

// SAVED ANIME
db.run(`CREATE TABLE IF NOT EXISTS saved_anime (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  animeId  INTEGER,
  title    TEXT,
  image    TEXT,
  url      TEXT
)`, err => { if (err) console.error("Error creating saved_anime table", err.message); });

// WATCH STATUS
db.run(`CREATE TABLE IF NOT EXISTS watch_status (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  animeId  INTEGER,
  watched  INTEGER DEFAULT 0,
  UNIQUE(username, animeId)
)`, err => { if (err) console.error("Error creating watch_status table", err.message); });

// RATINGS
db.run(`CREATE TABLE IF NOT EXISTS ratings (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  animeId  INTEGER,
  rating   INTEGER,
  UNIQUE(username, animeId)
)`, err => { if (err) console.error("Error creating ratings table", err.message); });

// EPISODE PROGRESS (NEW)
db.run(`CREATE TABLE IF NOT EXISTS episode_progress (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT,
  animeId   INTEGER,
  currentEp INTEGER DEFAULT 0,
  UNIQUE(username, animeId)
)`, err => { if (err) console.error("Error creating episode_progress table", err.message); });

module.exports = db;