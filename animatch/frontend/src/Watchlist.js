import React, { useEffect, useState } from "react";
import AnimeCard from "./components/AnimeCard";

const API = "https://animatch-ofks.onrender.com";

function Watchlist() {
  const [savedAnime, setSavedAnime] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all"); // "all" | "watched" | "unwatched"
  const [removeMsg, setRemoveMsg] = useState("");

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) {
      window.location.hash = "/";
      return;
    }
    fetchWatchlist(username);
  }, []);

  const fetchWatchlist = async (username) => {
    setLoading(true);
    try {
      // Pull saved anime + their watch/rating status in one go
      const [savedRes, statusRes] = await Promise.all([
        fetch(`${API}/saved-anime/${username}`),
        fetch(`${API}/all-status/${username}`)
      ]);

      const saved = await savedRes.json();
      const statuses = statusRes.ok ? await statusRes.json() : [];

      // Merge status data into each anime object
      const statusMap = {};
      statuses.forEach(s => { statusMap[s.animeId] = s; });

      const merged = (Array.isArray(saved) ? saved : []).map(anime => ({
        ...anime,
        id: anime.animeId,
        image: anime.image,
        watched: statusMap[anime.animeId]?.watched || 0,
        userRating: statusMap[anime.animeId]?.rating || null
      }));

      setSavedAnime(merged);
    } catch (err) {
      console.error("Watchlist fetch error:", err);
      setSavedAnime([]);
    }
    setLoading(false);
  };

  const handleRemove = async (animeId) => {
    const username = localStorage.getItem("username");
    try {
      const res = await fetch(`${API}/remove-anime`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, animeId })
      });
      if (res.ok) {
        setSavedAnime(prev => prev.filter(a => a.animeId !== animeId));
        setRemoveMsg("Removed!");
        setTimeout(() => setRemoveMsg(""), 2000);
      }
    } catch (err) {
      console.error("Remove error:", err);
    }
  };

  const filtered = savedAnime.filter(anime => {
    if (filter === "watched")   return anime.watched;
    if (filter === "unwatched") return !anime.watched;
    return true;
  });

  if (loading) return <p style={{ padding: "20px" }}>Loading your watchlist...</p>;

  return (
    <div style={{ padding: "20px" }}>

      {/* HEADER */}
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "6px" }}>
        <button onClick={() => (window.location.hash = "/dashboard")}>
          ⬅ Back to Dashboard
        </button>
        <h1 style={{ margin: 0 }}>My Watchlist</h1>
      </div>

      {removeMsg && (
        <p style={{ color: "#4CAF50", fontSize: "13px" }}>{removeMsg}</p>
      )}

      {/* FILTER TABS */}
      <div style={{ display: "flex", gap: "8px", margin: "16px 0" }}>
        {["all", "watched", "unwatched"].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            style={{
              padding: "6px 14px",
              borderRadius: "20px",
              border: "1px solid #ccc",
              cursor: "pointer",
              backgroundColor: filter === f ? "#333" : "transparent",
              color: filter === f ? "#fff" : "inherit",
              fontWeight: filter === f ? "500" : "400"
            }}
          >
            {f === "all" ? `All (${savedAnime.length})`
              : f === "watched" ? `Watched (${savedAnime.filter(a => a.watched).length})`
              : `Unwatched (${savedAnime.filter(a => !a.watched).length})`}
          </button>
        ))}
      </div>

      {/* EMPTY STATE */}
      {filtered.length === 0 ? (
        <p>
          {filter === "all"
            ? 'No saved anime yet. Hit "Save to Profile" on any anime card!'
            : `No ${filter} anime yet.`}
        </p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "20px",
            marginTop: "10px"
          }}
        >
          {filtered.map(anime => (
            <div key={anime.animeId} style={{ display: "flex", flexDirection: "column" }}>
              <AnimeCard anime={anime} />

              {/* User's own rating badge (read from DB, shown above the remove button) */}
              {anime.userRating && (
                <p style={{ fontSize: "12px", margin: "4px 0 0", color: "#888" }}>
                  Your rating: <strong>{anime.userRating}/10</strong>
                </p>
              )}

              <button
                onClick={() => handleRemove(anime.animeId)}
                style={{
                  marginTop: "6px",
                  width: "100%",
                  cursor: "pointer",
                  backgroundColor: "#e74c3c",
                  color: "white",
                  border: "none",
                  padding: "6px",
                  borderRadius: "6px",
                  fontSize: "12px"
                }}
              >
                🗑 Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Watchlist;