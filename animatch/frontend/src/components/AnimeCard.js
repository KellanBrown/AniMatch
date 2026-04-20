import React, { useState, useEffect } from "react";
import { useToast } from "./Toast";

const API = "https://animatch-ofks.onrender.com";

// status cycles: none -> watching -> completed -> none
const STATUS_CONFIG = {
  none:      { label: "Add Status",  next: "watching",  color: "var(--text-dim)",   bg: "transparent",       border: "var(--border)" },
  watching:  { label: "Watching",    next: "completed", color: "var(--teal)",        bg: "var(--teal-dim)",   border: "var(--teal)" },
  completed: { label: "Completed ✓", next: "none",      color: "var(--purple)",      bg: "var(--purple-dim)", border: "var(--purple)" }
};

function AnimeCard({ anime = {}, onSimilarClick, hideSimilar = false }) {
  const animeId = anime.id ?? anime.mal_id;
  const toast   = useToast();

  const [status, setStatus]       = useState("none");
  const [rating, setRatingValue]  = useState("");
  const [ratingInput, setRatingInput] = useState(""); // separate input state so backspace works
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
        if (data.status)            setStatus(data.status);
        if (data.rating != null) {
          setRatingValue(data.rating);
          setRatingInput(String(data.rating));
        }
        if (data.currentEp != null) setCurrentEp(data.currentEp);
      } catch (err) { console.warn("Could not load anime status:", err); }
    };
    load();
  }, [animeId]);

  // ---- Save ----
  const handleSave = async () => {
    const username = localStorage.getItem("username");
    if (!username) { toast("You must be logged in.", "error"); return; }
    try {
      const res = await fetch(`${API}/save-anime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          anime: {
            id:     animeId,
            title:  anime.title,
            image:  anime.image,
            url:    anime.url,
            genres: anime.genres || []   // pass genres so top-genre stat works
          }
        })
      });
      if (res.ok)             toast("Saved to your profile!", "success");
      else if (res.status === 409) toast("Already in your list!", "info");
      else {
        const data = await res.json();
        toast(data.message || "Save failed", "error");
      }
    } catch (err) {
      toast("Network error saving anime", "error");
    }
  };

  // ---- Watch status (cycles through none -> watching -> completed) ----
  const handleStatusCycle = async () => {
    const cfg      = STATUS_CONFIG[status];
    const newStatus = cfg.next;
    setStatus(newStatus);

    // If completed and we know total eps, jump progress to 100%
    if (newStatus === "completed" && totalEps) setCurrentEp(totalEps);

    const username = localStorage.getItem("username");
    if (!username) return;
    try {
      await fetch(`${API}/watch-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, animeId, status: newStatus })
      });
      if (newStatus === "completed") toast(`${anime.title || "Anime"} marked completed!`, "success");
      if (newStatus === "watching")  toast(`Added to watching!`, "info");
    } catch (err) { console.error(err); }
  };

  // ---- Rating (text input, 0.5 steps, backspace works) ----
  const handleRatingInput = (e) => {
    const raw = e.target.value;
    setRatingInput(raw); // always update the display immediately so backspace works
  };

  const handleRatingBlur = async () => {
    const val = parseFloat(ratingInput);
    if (isNaN(val) || val < 0.5 || val > 10) {
      // Reset to last valid value if input is bad
      setRatingInput(rating !== "" ? String(rating) : "");
      return;
    }
    const rounded = Math.round(val * 2) / 2; // snap to nearest 0.5
    setRatingValue(rounded);
    setRatingInput(String(rounded));

    const username = localStorage.getItem("username");
    if (!username) return;
    try {
      const res = await fetch(`${API}/rate-anime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, animeId, rating: rounded })
      });
      if (res.ok) toast(`Rated ${rounded}/10!`, "success");
    } catch (err) { console.error(err); }
  };

  // Allow pressing Enter to confirm rating
  const handleRatingKeyDown = (e) => {
    if (e.key === "Enter") e.target.blur();
  };

  // ---- Episode progress ----
  const handleEpChange = async (e) => {
    const raw   = parseInt(e.target.value, 10);
    const value = isNaN(raw) ? 0 : Math.max(0, totalEps ? Math.min(raw, totalEps) : raw);
    setCurrentEp(value);

    // Auto-complete when reaching last episode
    if (totalEps && value >= totalEps && status !== "completed") {
      setStatus("completed");
      toast(`${anime.title || "Anime"} marked completed!`, "success");
      const username = localStorage.getItem("username");
      if (username) {
        await fetch(`${API}/watch-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, animeId, status: "completed" })
        });
      }
    }

    // Auto-set watching if they start tracking episodes
    if (value > 0 && status === "none") {
      setStatus("watching");
      const username = localStorage.getItem("username");
      if (username) {
        await fetch(`${API}/watch-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, animeId, status: "watching" })
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

  const progressPct  = totalEps && currentEp ? Math.min(100, Math.round((currentEp / totalEps) * 100)) : 0;
  const episodeLabel = totalEps ? `${totalEps} eps` : "? eps";
  const statusCfg    = STATUS_CONFIG[status] || STATUS_CONFIG.none;

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
        {/* Status badge on image */}
        {status !== "none" && (
          <div style={{
            position: "absolute", top: "8px", left: "8px",
            background: "rgba(15,14,23,0.85)",
            border: `1px solid ${statusCfg.border}`,
            color: statusCfg.color,
            fontSize: "10px", fontWeight: 800,
            padding: "3px 8px", borderRadius: "20px", backdropFilter: "blur(4px)"
          }}>
            {statusCfg.label}
          </div>
        )}
      </a>

      <div className="am-anime-card__body">

        <div className="am-anime-card__title">{anime.title || "Unknown Title"}</div>
        <div className="am-anime-card__meta">
          <span className="am-anime-card__eps">📺 {episodeLabel}</span>
          {anime.type && <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>{anime.type}</span>}
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

        {/* Watch status cycle button */}
        <button
          onClick={handleStatusCycle}
          style={{
            marginTop: "8px", width: "100%",
            padding: "6px 10px", borderRadius: "var(--radius-sm)",
            fontSize: "12px", fontWeight: 700,
            cursor: "pointer", border: `1.5px solid ${statusCfg.border}`,
            background: statusCfg.bg, color: statusCfg.color,
            fontFamily: "'Nunito', sans-serif",
            transition: "all 0.15s"
          }}
        >
          {statusCfg.label}
        </button>

        {/* Rating — text input with 0.5 steps, backspace works */}
        <div style={{ marginTop: "6px", position: "relative" }}>
          <input
            type="text"
            inputMode="decimal"
            placeholder="Rate 0.5–10 (e.g. 7.5)"
            value={ratingInput}
            onChange={handleRatingInput}
            onBlur={handleRatingBlur}
            onKeyDown={handleRatingKeyDown}
            className="am-input"
            style={{ paddingRight: ratingInput ? "32px" : "12px" }}
          />
          {/* Clear rating button */}
          {ratingInput && (
            <button
              onClick={() => { setRatingInput(""); setRatingValue(""); }}
              style={{
                position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)",
                background: "none", border: "none", cursor: "pointer",
                color: "var(--text-dim)", fontSize: "14px", lineHeight: 1, padding: "2px"
              }}
              title="Clear rating"
            >✕</button>
          )}
        </div>
        {rating !== "" && (
          <p style={{ fontSize: "11px", color: "var(--yellow)", fontWeight: 700, marginTop: "3px" }}>
            Your rating: {rating}/10
          </p>
        )}

        {/* Save button */}
        <button onClick={handleSave} className="am-btn am-btn-coral am-btn-full am-btn-sm" style={{ marginTop: "8px" }}>
          ⭐ Save to Profile
        </button>

        {/* Find Similar — hidden on profile/watchlist via hideSimilar prop */}
        {!hideSimilar && onSimilarClick && (
          <button
            onClick={() => animeId && onSimilarClick(animeId)}
            className="am-btn am-btn-ghost am-btn-full am-btn-sm"
            style={{ marginTop: "5px" }}
          >
            Find Similar
          </button>
        )}

      </div>
    </div>
  );
}

export default AnimeCard;