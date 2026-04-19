import React, { useEffect, useState } from "react";
import AnimeCard from "./AnimeCard";

const API = "https://animatch-ofks.onrender.com";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [savedAnime, setSavedAnime] = useState([]);
  const [stats, setStats] = useState(null);
  const [loadingAnime, setLoadingAnime] = useState(true);

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) {
      window.location.hash = "/";
      return;
    }

    const fetchData = async () => {
      // ---------------- USER INFO ----------------
      try {
        const userRes = await fetch(`${API}/dashboard/${username}`);
        const userData = await userRes.json();
        if (userRes.ok && userData.user) setUser(userData.user);
      } catch (err) {
        console.error("User fetch error:", err);
      }

      // ---------------- SAVED ANIME ----------------
      try {
        const savedRes = await fetch(`${API}/saved-anime/${username}`);
        if (!savedRes.ok) {
          setSavedAnime([]);
          setLoadingAnime(false);
          return;
        }
        const savedData = await savedRes.json();
        setSavedAnime(Array.isArray(savedData) ? savedData : []);
      } catch (err) {
        console.error("Saved anime fetch error:", err);
        setSavedAnime([]);
      }

      // ---------------- USER STATS ----------------
      try {
        const statsRes = await fetch(`${API}/user-stats/${username}`);
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      } catch (err) {
        console.error("Stats fetch error:", err);
      }

      setLoadingAnime(false);
    };

    fetchData();
  }, []);

  if (!user) return <p>Loading your profile...</p>;

  return (
    <div className="dashboard" style={{ padding: "20px" }}>
      <h1>Welcome, {user.username}!</h1>

      {/* ---------------- PROFILE INFO ---------------- */}
      <div className="profile-info">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Age:</strong> {user.age}</p>
        <p><strong>Gender:</strong> {user.gender}</p>
      </div>

      {/* ---------------- STATS PANEL ---------------- */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: "12px",
            margin: "20px 0",
            padding: "16px",
            backgroundColor: "#f9f9f9",
            borderRadius: "12px",
            border: "1px solid #eee"
          }}
        >
          <StatBox label="Saved" value={stats.totalSaved} emoji="📚" />
          <StatBox label="Watched" value={stats.totalWatched} emoji="✅" />
          <StatBox label="Unwatched" value={stats.totalUnwatched} emoji="🕐" />
          <StatBox
            label="Avg Rating"
            value={stats.avgRating ? `${stats.avgRating}/10` : "—"}
            emoji="⭐"
          />
          <StatBox
            label="Top Genre"
            value={stats.topGenre || "—"}
            emoji="🎭"
          />
        </div>
      )}

      {/* ---------------- NAV BUTTONS ---------------- */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", margin: "15px 0" }}>
        <button onClick={() => (window.location.hash = "/watchlist")}>
          📋 My Watchlist
        </button>

        <button onClick={() => (window.location.hash = "/search")}>
          🔍 Search Anime
        </button>

        <button onClick={() => (window.location.hash = "/quiz")}>
          📝 Take Quiz
        </button>

        <button
          onClick={() => {
            localStorage.removeItem("username");
            window.location.hash = "/";
          }}
          style={{ marginLeft: "auto" }}
        >
          Logout
        </button>
      </div>

      {/* ---------------- SAVED ANIME (PREVIEW — first 6) ---------------- */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <h2>Recently Saved</h2>
        {savedAnime.length > 6 && (
          <button
            onClick={() => (window.location.hash = "/watchlist")}
            style={{ fontSize: "13px" }}
          >
            View all →
          </button>
        )}
      </div>

      {loadingAnime ? (
        <p>Loading saved anime...</p>
      ) : savedAnime.length === 0 ? (
        <p>No saved anime yet. Click "Save to Profile" on any anime card!</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "20px",
            marginTop: "20px"
          }}
        >
          {/* Show only the 6 most recently saved on dashboard — full list is on Watchlist */}
          {savedAnime.slice(0, 6).map((anime) => (
            <AnimeCard
              key={anime.animeId || anime.id}
              anime={{
                ...anime,
                id: anime.animeId,
              }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// Small reusable stat box component
function StatBox({ label, value, emoji }) {
  return (
    <div
      style={{
        textAlign: "center",
        padding: "12px 8px",
        backgroundColor: "#fff",
        borderRadius: "10px",
        border: "1px solid #eee"
      }}
    >
      <div style={{ fontSize: "22px" }}>{emoji}</div>
      <div style={{ fontSize: "20px", fontWeight: "600", margin: "4px 0" }}>{value}</div>
      <div style={{ fontSize: "11px", color: "#888", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</div>
    </div>
  );
}

export default Dashboard;