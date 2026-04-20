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
        status:     statusMap[anime.animeId]?.status    || "none",
        userRating: statusMap[anime.animeId]?.rating    || null,
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

  const counts = {
    all:       savedAnime.length,
    watching:  savedAnime.filter(a => a.status === "watching").length,
    completed: savedAnime.filter(a => a.status === "completed").length,
    none:      savedAnime.filter(a => a.status === "none").length
  };

  const filtered = savedAnime.filter(anime => {
    if (filter === "watching")  return anime.status === "watching";
    if (filter === "completed") return anime.status === "completed";
    if (filter === "none")      return anime.status === "none";
    return true;
  });

  if (loading) return <div className="am-loading">Loading your watchlist...</div>;

  return (
    <div className="am-page">

      {/* Nav — Profile not Dashboard */}
      <nav className="am-nav">
        <div className="am-logo"><span className="ani">Ani</span><span className="match">Match</span></div>
        <button className="am-btn am-btn-ghost am-btn-sm"  onClick={() => (window.location.hash = "/dashboard")}>⬅ Profile</button>
        <button className="am-btn am-btn-coral am-btn-sm"  onClick={() => (window.location.hash = "/quiz")}>📝 Quiz</button>
        <button className="am-btn am-btn-purple am-btn-sm" onClick={() => (window.location.hash = "/search")}>🔍 Search</button>
      </nav>

      <div style={{ marginBottom: "20px" }}>
        <h1>My <span style={{ color: "var(--teal)" }}>Watchlist</span></h1>
        <p style={{ marginTop: "4px", fontSize: "13px" }}>
          {counts.all} saved · {counts.watching} watching · {counts.completed} completed · {counts.none} not started
        </p>
      </div>

      {/* Filter tabs — all 4 states */}
      <div className="am-tabs" style={{ marginBottom: "24px", flexWrap: "wrap" }}>
        {[
          { key: "all",       label: `All (${counts.all})` },
          { key: "watching",  label: `Watching (${counts.watching})` },
          { key: "completed", label: `Completed (${counts.completed})` },
          { key: "none",      label: `Not Started (${counts.none})` }
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
          <h3>
            {filter === "all"       ? "Nothing saved yet" :
             filter === "watching"  ? "Nothing in progress" :
             filter === "completed" ? "Nothing completed yet" :
                                      "Nothing waiting to start"}
          </h3>
          <p>
            {filter === "all"
              ? "Save anime from the quiz or search to build your list!"
              : "Update an anime card's status to see it here."}
          </p>
        </div>
      ) : (
        <div className="am-grid">
          {filtered.map(anime => (
            <div key={anime.animeId} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {/* hideSimilar=true hides the Find Similar button on profile cards */}
              <AnimeCard anime={anime} hideSimilar={true} />
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