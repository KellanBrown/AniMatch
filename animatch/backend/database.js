// import required modules for SQLite and file path handling
const sqlite3 = require("sqlite3").verbose();
const path    = require("path");

// build the absolute path to the database file
const dbPath = path.resolve(__dirname, "animatch.db");

// create a connection to the SQLite database
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    // log an error if the database fails to open
    console.error("Error opening database", err.message);
  } else {
    // confirm that the database connected successfully
    console.log("SQLite database connected!");
  }
});

// create the users table to store account information
db.run(`CREATE TABLE IF NOT EXISTS users (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  username     TEXT UNIQUE,
  email        TEXT UNIQUE,
  age          INTEGER,
  gender       TEXT,
  passwordHash TEXT
)`, err => { 
  if (err) console.error("users:", err.message); 
});

// create a table for anime saved by users
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
)`, err => { 
  if (err) console.error("saved_anime:", err.message); 
});

// try to add newer columns in case the table was created earlier without them
// errors are ignored because the column may already exist
[
  "genres TEXT DEFAULT '[]'",
  "episodes INTEGER DEFAULT NULL",
  "type TEXT DEFAULT NULL",
  "malScore REAL DEFAULT NULL"
].forEach(col => {
  db.run(`ALTER TABLE saved_anime ADD COLUMN ${col}`, () => {});
});

// create a table to track a user's watch status for each anime
db.run(`CREATE TABLE IF NOT EXISTS watch_status (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT,
  animeId   INTEGER,
  status    TEXT DEFAULT 'none',
  updatedAt TEXT DEFAULT (datetime('now')),
  UNIQUE(username, animeId)
)`, err => { 
  if (err) console.error("watch_status:", err.message); 
});

// attempt to add missing columns for older versions of the table
[
  "status TEXT DEFAULT 'none'",
  "updatedAt TEXT DEFAULT (datetime('now'))"
].forEach(col => {
  db.run(`ALTER TABLE watch_status ADD COLUMN ${col}`, () => {});
});

// check the existing columns to handle migration from an older schema
db.all(`PRAGMA table_info(watch_status)`, (err, cols) => {
  if (err || !cols) return;

  const hasStatus  = cols.some(c => c.name === "status");
  const hasWatched = cols.some(c => c.name === "watched");

  // if the old "watched" column exists but "status" does not, convert the data
  if (!hasStatus && hasWatched) {
    db.run(`ALTER TABLE watch_status ADD COLUMN status TEXT DEFAULT 'none'`, () => {
      db.run(`
        UPDATE watch_status 
        SET status = CASE 
          WHEN watched = 1 THEN 'completed' 
          ELSE 'none' 
        END
      `);
    });
  }
});

// create a table for storing user ratings on anime
db.run(`CREATE TABLE IF NOT EXISTS ratings (
  id       INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT,
  animeId  INTEGER,
  rating   REAL,
  UNIQUE(username, animeId)
)`, err => { 
  if (err) console.error("ratings:", err.message); 
});

// track how many episodes a user has watched for each anime
db.run(`CREATE TABLE IF NOT EXISTS episode_progress (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT,
  animeId   INTEGER,
  currentEp INTEGER DEFAULT 0,
  UNIQUE(username, animeId)
)`, err => { 
  if (err) console.error("episode_progress:", err.message); 
});

// allow users to store personal notes for each anime
db.run(`CREATE TABLE IF NOT EXISTS anime_notes (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT,
  animeId   INTEGER,
  note      TEXT DEFAULT '',
  updatedAt TEXT DEFAULT (datetime('now')),
  UNIQUE(username, animeId)
)`, err => { 
  if (err) console.error("anime_notes:", err.message); 
});

// manage friend requests and relationships between users
db.run(`CREATE TABLE IF NOT EXISTS friends (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  requester  TEXT,
  receiver   TEXT,
  status     TEXT DEFAULT 'pending',
  createdAt  TEXT DEFAULT (datetime('now')),
  UNIQUE(requester, receiver)
)`, err => { 
  if (err) console.error("friends:", err.message); 
});

// store password reset tokens and expiration info
db.run(`CREATE TABLE IF NOT EXISTS password_resets (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  username  TEXT,
  token     TEXT UNIQUE,
  expiresAt TEXT,
  used      INTEGER DEFAULT 0
)`, err => { 
  if (err) console.error("password_resets:", err.message); 
});

// export the database so it can be used in other files
module.exports = db;