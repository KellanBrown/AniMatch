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

  // Pulls everything from all-status in one shot. That endpoint joins all the
  // related tables (watch status, ratings, episode progress, notes) so we
  // don't need multiple requests per card.
  const fetchWatchlist = async (username) => {
    setLoading(true);
    try {
      const res      = await fetch(`${API}/all-status/${username}`);
      const statuses = res.ok ? await res.json() : [];

      const merged = statuses.map(s => ({
        ...s,
        id:         s.animeId,
        episodes:   s.episodes ?? null,
        type:       s.type     ?? null,
        userRating: s.rating   ?? null
      }));

      setSavedAnime(merged);
    } catch (err) {
      console.error(err);
      setSavedAnime([]);
    }
    setLoading(false);
  };

  // Deletes an anime and all its data from the backend, then removes it from
  // local state so the UI updates immediately without a re-fetch.
  const handleRemoveFull = async (animeId) => {
    const username = localStorage.getItem("username");
    try {
      const res = await fetch(`${API}/remove-anime`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, animeId, mode: "full" })
      });
      if (res.ok) setSavedAnime(prev => prev.filter(a => a.animeId !== animeId));
    } catch (err) { console.error(err); }
  };

  // Pre-compute tab counts so they stay in sync with the current list
  const counts = {
    all:        savedAnime.length,
    watching:   savedAnime.filter(a => a.status === "watching").length,
    rewatching: savedAnime.filter(a => a.status === "rewatching").length,
    completed:  savedAnime.filter(a => a.status === "completed").length,
    none:       savedAnime.filter(a => a.status === "none" || !a.status).length
  };

  const filtered = savedAnime.filter(anime => {
    if (filter === "watching")   return anime.status === "watching";
    if (filter === "rewatching") return anime.status === "rewatching";
    if (filter === "completed")  return anime.status === "completed";
    if (filter === "none")       return anime.status === "none" || !anime.status;
    return true; // "all" tab — no filter applied
  });

  const tabs = [
    { key: "all",        label: `All (${counts.all})` },
    { key: "watching",   label: `Watching (${counts.watching})` },
    { key: "rewatching", label: `Rewatching (${counts.rewatching})` },
    { key: "completed",  label: `Completed (${counts.completed})` },
    { key: "none",       label: `Not Started (${counts.none})` }
  ];

  if (loading) return <div className="am-loading">Loading your watchlist...</div>;

  return (
    <div className="am-page">

      <nav className="am-nav">
        <div className="am-logo"><span className="ani">Ani</span><span className="match">Match</span></div>
        <button className="am-btn am-btn-ghost am-btn-sm"  onClick={() => (window.location.hash = "/dashboard")}>⬅ Profile</button>
        <button className="am-btn am-btn-coral am-btn-sm"  onClick={() => (window.location.hash = "/quiz")}>📝 Quiz</button>
        <button className="am-btn am-btn-purple am-btn-sm" onClick={() => (window.location.hash = "/search")}>🔍 Search</button>
      </nav>

      <div style={{ marginBottom: "20px" }}>
        <h1>My <span style={{ color: "var(--teal)" }}>Watchlist</span></h1>
        <p style={{ marginTop: "4px", fontSize: "13px" }}>
          {counts.all} saved · {counts.watching} watching · {counts.rewatching} rewatching · {counts.completed} completed · {counts.none} not started
        </p>
      </div>

      <div className="am-tabs" style={{ marginBottom: "24px", flexWrap: "wrap", gap: "6px" }}>
        {tabs.map(t => (
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
            {filter === "all"        ? "Nothing saved yet" :
             filter === "watching"   ? "Nothing in progress" :
             filter === "rewatching" ? "Not rewatching anything" :
             filter === "completed"  ? "Nothing completed yet" :
                                       "Nothing waiting to start"}
          </h3>
          <p>
            {filter === "all"
              ? "Save anime from the quiz or search to build your list!"
              : "Update an anime's status using the button on its card."}
          </p>
        </div>
      ) : (
        <div className="am-grid">
          {filtered.map(anime => (
            <div key={anime.animeId} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {/* hideSimilar=true because "Find Similar" doesn't make sense in the context of your own list */}
              <AnimeCard anime={anime} hideSimilar={true} />

              <button
                onClick={() => handleRemoveFull(anime.animeId)}
                className="am-btn am-btn-red am-btn-sm am-btn-full"
              >
                🗑 Remove from list
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Watchlist;