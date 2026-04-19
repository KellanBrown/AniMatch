import React, { useEffect, useState } from "react";
import AnimeCard from "./components/AnimeCard";

const API = "https://animatch-ofks.onrender.com";

function Watchlist() {
  const [savedAnime, setSavedAnime] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filter, setFilter]         = useState("all");

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) { window.location.hash = "/"; return; }
    fetchWatchlist(username);
  }, []);

  const fetchWatchlist = async (username) => {
    setLoading(true);
    try {
      const [savedRes, statusRes] = await Promise.all([
        fetch(`${API}/saved-anime/${username}`),
        fetch(`${API}/all-status/${username}`)
      ]);
      const saved    = await savedRes.json();
      const statuses = statusRes.ok ? await statusRes.json() : [];

      const statusMap = {};
      statuses.forEach(s => { statusMap[s.animeId] = s; });

      const merged = (Array.isArray(saved) ? saved : []).map(anime => ({
        ...anime,
        id:         anime.animeId,
        watched:    statusMap[anime.animeId]?.watched || 0,
        userRating: statusMap[anime.animeId]?.rating  || null,
        currentEp:  statusMap[anime.animeId]?.currentEp || 0
      }));

      setSavedAnime(merged);
    } catch (err) {
      console.error(err);
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
      if (res.ok) setSavedAnime(prev => prev.filter(a => a.animeId !== animeId));
    } catch (err) { console.error(err); }
  };

  const watchedCount   = savedAnime.filter(a => a.watched).length;
  const unwatchedCount = savedAnime.filter(a => !a.watched).length;

  const filtered = savedAnime.filter(anime => {
    if (filter === "watched")   return anime.watched;
    if (filter === "unwatched") return !anime.watched;
    return true;
  });

  if (loading) return <div className="am-loading">Loading your watchlist...</div>;

  return (
    <div className="am-page">

      {/* Nav */}
      <nav className="am-nav">
        <div className="am-logo"><span className="ani">Ani</span><span className="match">Match</span></div>
        <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => (window.location.hash = "/dashboard")}>⬅ Dashboard</button>
        <button className="am-btn am-btn-coral am-btn-sm" onClick={() => (window.location.hash = "/quiz")}>📝 Quiz</button>
        <button className="am-btn am-btn-purple am-btn-sm" onClick={() => (window.location.hash = "/search")}>🔍 Search</button>
      </nav>

      <div style={{ marginBottom: "20px" }}>
        <h1>My <span style={{ color: "var(--teal)" }}>Watchlist</span></h1>
        <p style={{ marginTop: "4px", fontSize: "13px" }}>{savedAnime.length} saved · {watchedCount} watched · {unwatchedCount} to watch</p>
      </div>

      {/* Filter tabs */}
      <div className="am-tabs" style={{ marginBottom: "24px" }}>
        {[
          { key: "all",       label: `All (${savedAnime.length})` },
          { key: "watched",   label: `Watched (${watchedCount})` },
          { key: "unwatched", label: `To Watch (${unwatchedCount})` }
        ].map(t => (
          <button
            key={t.key}
            className={`am-tab${filter === t.key ? " active" : ""}`}
            onClick={() => setFilter(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="am-empty">
          <h3>{filter === "all" ? "Nothing saved yet" : `No ${filter} anime`}</h3>
          <p>{filter === "all" ? "Save anime from the quiz or search to build your list!" : "Try switching the filter above."}</p>
        </div>
      ) : (
        <div className="am-grid">
          {filtered.map(anime => (
            <div key={anime.animeId} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <AnimeCard anime={anime} />
              {anime.userRating && (
                <p style={{ fontSize: "11px", color: "var(--text-dim)", fontWeight: 700, textAlign: "center" }}>
                  Your rating: <span style={{ color: "var(--yellow)" }}>{anime.userRating}/10</span>
                </p>
              )}
              <button
                onClick={() => handleRemove(anime.animeId)}
                className="am-btn am-btn-red am-btn-sm am-btn-full"
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