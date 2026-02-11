const sqlite3 = require("sqlite3").verbose();
const path = require("path");

// Database file
const dbPath = path.resolve(__dirname, "animatch.db");
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error("Error opening database", err.message);
  } else {
    console.log("✅ SQLite database connected!");
  }
});

// Create users table if it doesn't exist
db.run(
  `CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT,
    age INTEGER,
    gender TEXT,
    passwordHash TEXT
  )`,
  (err) => {
    if (err) console.error("Error creating table", err.message);
  }
);

module.exports = db;
