import React, { useState, useEffect } from "react";
import { useToast } from "./Toast";

const API = "https://animatch-ofks.onrender.com";

function AnimeCard({ anime = {}, onSimilarClick = () => {} }) {
  const animeId = anime.id ?? anime.mal_id;
  const toast   = useToast();

  const [watched, setWatched]     = useState(false);
  const [rating, setRatingValue]  = useState("");
  const [currentEp, setCurrentEp] = useState(0);

  const totalEps = anime.episodes ?? null;

  // ---- Load saved state on mount ----
  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username || !animeId) return;

    const load = async () => {
      try {
        const res  = await fetch(`${API}/anime-status/${username}/${animeId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.watched !== undefined) setWatched(!!data.watched);
        if (data.rating)                setRatingValue(data.rating);
        if (data.currentEp != null)     setCurrentEp(data.currentEp);
      } catch (err) {
        console.warn("Could not load anime status:", err);
      }
    };
    load();
  }, [animeId]);

  // ---- Save ----
  const handleSave = async () => {
    const username = localStorage.getItem("username");
    if (!username) { toast("You must be logged in.", "error"); return; }

    try {
      const res  = await fetch(`${API}/save-anime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          anime: { id: animeId, title: anime.title, image: anime.image, url: anime.url }
        })
      });
      if (res.ok) {
        toast("Saved to your profile!", "success");
      } else if (res.status === 409) {
        toast("Already in your list!", "info");
      } else {
        const data = await res.json();
        toast(data.message || "Save failed", "error");
      }
    } catch (err) {
      console.error(err);
      toast("Network error saving anime", "error");
    }
  };

  // ---- Watched toggle ----
  const handleWatched = async (e) => {
    const value = e.target.checked;
    setWatched(value);
    if (value && totalEps) setCurrentEp(totalEps);

    const username = localStorage.getItem("username");
    if (!username) return;
    try {
      await fetch(`${API}/watch-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, animeId, watched: value })
      });
    } catch (err) { console.error(err); }
  };

  // ---- Rating ----
  const handleRating = async (e) => {
    const value = Number(e.target.value);
    if (value < 1 || value > 10) return;
    setRatingValue(value);

    const username = localStorage.getItem("username");
    if (!username) return;
    try {
      const res = await fetch(`${API}/rate-anime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, animeId, rating: value })
      });
      if (res.ok) toast("Rating saved!", "success");
    } catch (err) { console.error(err); }
  };

  // ---- Episode progress ----
  const handleEpChange = async (e) => {
    const raw   = parseInt(e.target.value, 10);
    const value = isNaN(raw) ? 0 : Math.max(0, totalEps ? Math.min(raw, totalEps) : raw);
    setCurrentEp(value);

    if (totalEps && value >= totalEps && !watched) {
      setWatched(true);
      toast(`${anime.title || "Anime"} marked as watched!`, "success");
      const username = localStorage.getItem("username");
      if (username) {
        await fetch(`${API}/watch-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, animeId, watched: true })
        });
      }
    }

    const username = localStorage.getItem("username");
    if (!username) return;
    try {
      await fetch(`${API}/episode-progress`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, animeId, currentEp: value })
      });
    } catch (err) { console.error(err); }
  };

  const progressPct   = totalEps && currentEp ? Math.min(100, Math.round((currentEp / totalEps) * 100)) : 0;
  const episodeLabel  = totalEps ? `${totalEps} eps` : "? eps";

  return (
    <div className="am-anime-card">

      {/* Image */}
      <a href={anime.url || "#"} target="_blank" rel="noreferrer" style={{ position: "relative", display: "block" }}>
        <img src={anime.image || ""} alt={anime.title || "Anime"} className="am-anime-card__img" />
        <div style={{
          position: "absolute", top: "8px", right: "8px",
          background: "rgba(15,14,23,0.85)", border: "1px solid rgba(255,209,102,0.4)",
          color: "var(--yellow)", fontSize: "11px", fontWeight: 800,
          padding: "3px 8px", borderRadius: "20px", backdropFilter: "blur(4px)"
        }}>
          ★ {anime.rating ?? anime.score ?? "N/A"}
        </div>
      </a>

      <div className="am-anime-card__body">

        <div className="am-anime-card__title">{anime.title || "Unknown Title"}</div>
        <div className="am-anime-card__meta">
          <span className="am-anime-card__eps">📺 {episodeLabel}</span>
        </div>

        {/* Episode progress */}
        {(totalEps || currentEp > 0) && (
          <div className="am-progress-wrap">
            <div className="am-progress-label">
              <span>Progress</span>
              <span>{progressPct}%</span>
            </div>
            <div className="am-progress-bar">
              <div className="am-progress-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <div className="am-progress-input">
              <span className="am-ep-sep">Ep</span>
              <input
                type="number" min="0" max={totalEps || 9999}
                value={currentEp || ""} placeholder="0"
                onChange={handleEpChange}
              />
              {totalEps && <span className="am-ep-sep">/ {totalEps}</span>}
            </div>
          </div>
        )}

        {/* Watched toggle */}
        <label className="am-toggle-row" style={{ marginTop: "8px" }}>
          <input type="checkbox" className="am-toggle" checked={watched} onChange={handleWatched} />
          <span className="am-toggle-label">{watched ? "Watched ✓" : "Not watched"}</span>
        </label>

        {/* Rating */}
        <input
          type="number" min="1" max="10"
          placeholder="Rate it 1–10"
          value={rating}
          onChange={handleRating}
          className="am-input"
          style={{ marginTop: "6px" }}
        />

        {/* Buttons */}
        <button onClick={handleSave} className="am-btn am-btn-coral am-btn-full am-btn-sm" style={{ marginTop: "8px" }}>
          ⭐ Save to Profile
        </button>
        <button
          onClick={() => animeId && onSimilarClick(animeId)}
          className="am-btn am-btn-ghost am-btn-full am-btn-sm"
          style={{ marginTop: "5px" }}
        >
          Find Similar
        </button>

      </div>
    </div>
  );
}

export default AnimeCard;