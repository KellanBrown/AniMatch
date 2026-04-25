import React, { useState, useEffect, useRef } from "react";
import { useToast } from "./Toast";

const API = "https://animatch-ofks.onrender.com";

// Status cycle order: none → watching → completed → rewatching → none
// Each entry defines what the button looks like and what status comes next
const STATUS_CONFIG = {
  none:       { label: "Add Status",    next: "watching",   color: "var(--text-dim)",  bg: "transparent",        border: "var(--border)" },
  watching:   { label: "Watching",      next: "completed",  color: "var(--teal)",       bg: "var(--teal-dim)",    border: "var(--teal)" },
  completed:  { label: "Completed ✓",   next: "rewatching", color: "var(--purple)",     bg: "var(--purple-dim)",  border: "var(--purple)" },
  rewatching: { label: "Rewatching 🔄", next: "none",       color: "var(--yellow)",     bg: "var(--yellow-dim)",  border: "var(--yellow)" }
};

// Converts a UTC timestamp into a human-readable relative string like "3h ago"
function timeAgo(dateStr) {
  if (!dateStr) return null;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60)     return "just now";
  if (diff < 3600)   return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400)  return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return `${Math.floor(diff / 604800)}w ago`;
}

function AnimeCard({ anime = {}, onSimilarClick, hideSimilar = false }) {
  const animeId = anime.id ?? anime.mal_id;
  const toast   = useToast();

  const [status, setStatus]           = useState("none");
  const [updatedAt, setUpdatedAt]     = useState(null);
  const [ratingInput, setRatingInput] = useState("");
  const [rating, setRating]           = useState("");
  const [currentEp, setCurrentEp]     = useState(0);
  const [note, setNote]               = useState("");
  const [noteOpen, setNoteOpen]       = useState(false);
  const [noteSaving, setNoteSaving]   = useState(false);
  const noteTimer = useRef(null); // holds the debounce timeout for auto-saving notes

  const totalEps = anime.episodes ?? null;

  // Always display the MAL community score, never the user's personal rating.
  // malScore takes priority; falls back to anime.rating only if it's a number.
  const malRating = anime.malScore ?? (typeof anime.rating === "number" ? anime.rating : null);

  // On mount, fetch whatever status/rating/progress/note this user already has for this anime
  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username || !animeId) return;
    const load = async () => {
      try {
        const res  = await fetch(`${API}/anime-status/${username}/${animeId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status)          setStatus(data.status);
        if (data.updatedAt)       setUpdatedAt(data.updatedAt);
        if (data.rating != null)  { setRating(data.rating); setRatingInput(String(data.rating)); }
        if (data.currentEp != null) setCurrentEp(data.currentEp);
        if (data.note != null)    setNote(data.note);
      } catch (err) { console.warn("Could not load anime status:", err); }
    };
    load();
  }, [animeId]);

  // Manually saves the anime to the user's profile list
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
            id:       animeId,
            title:    anime.title,
            image:    anime.image,
            url:      anime.url,
            genres:   anime.genres   || [],
            episodes: anime.episodes ?? null,
            type:     anime.type     ?? null,
            malScore: malRating      ?? null
          }
        })
      });
      if (res.ok)                  toast("Saved to your profile!", "success");
      else if (res.status === 409) toast("Already in your list!", "info");
      else { const d = await res.json(); toast(d.message || "Save failed", "error"); }
    } catch (err) { toast("Network error saving anime", "error"); }
  };

  // Advances the status to the next value in the cycle and persists it.
  // Also passes the anime data along so the backend can auto-save it if needed.
  const handleStatusCycle = async () => {
    const newStatus = STATUS_CONFIG[status]?.next || "watching";
    setStatus(newStatus);
    setUpdatedAt(new Date().toISOString());
    if (newStatus === "completed" && totalEps) setCurrentEp(totalEps);

    const username = localStorage.getItem("username");
    if (!username) return;
    try {
      await fetch(`${API}/watch-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username, animeId, status: newStatus,
          anime: {
            id: animeId, title: anime.title, image: anime.image,
            url: anime.url, genres: anime.genres || [],
            episodes: anime.episodes ?? null, type: anime.type ?? null,
            malScore: malRating ?? null
          }
        })
      });
      const msgs = { watching:"Added to Watching!", completed:`${anime.title || "Anime"} completed! 🎉`, rewatching:"Rewatching! 🔄", none:"Status cleared." };
      if (newStatus !== "none") toast(msgs[newStatus], newStatus === "completed" ? "success" : "info");
    } catch (err) { console.error(err); }
  };

  const handleRatingInput = (e) => setRatingInput(e.target.value);

  // Validates and rounds the rating when the user leaves the field.
  // Reverts to the last saved value if the input is out of range.
  const handleRatingBlur = async () => {
    const val = parseFloat(ratingInput);
    if (isNaN(val) || val < 0.5 || val > 10) { setRatingInput(rating !== "" ? String(rating) : ""); return; }
    const rounded = Math.round(val * 2) / 2; // snap to nearest 0.5
    setRating(rounded);
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

  // Let the user submit the rating with Enter instead of clicking away
  const handleRatingKeyDown = (e) => { if (e.key === "Enter") e.target.blur(); };

  // Updates episode count, clamps it within valid bounds, and handles two
  // automatic status transitions:
  // - reaching the last episode sets status to "completed"
  // - entering any episode from "none" sets status to "watching"
  // Deliberately does NOT downgrade status when the count goes back down,
  // since that's usually a correction rather than un-completing the show.
  const handleEpChange = async (e) => {
    const raw   = parseInt(e.target.value, 10);
    const value = isNaN(raw) ? 0 : Math.max(0, totalEps ? Math.min(raw, totalEps) : raw);
    setCurrentEp(value);
    const username = localStorage.getItem("username");

    if (totalEps && value >= totalEps && status !== "completed" && status !== "rewatching") {
      setStatus("completed");
      setUpdatedAt(new Date().toISOString());
      toast(`${anime.title || "Anime"} completed! 🎉`, "success");
      if (username) {
        await fetch(`${API}/watch-status`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, animeId, status: "completed" })
        });
      }
    } else if (value > 0 && status === "none") {
      setStatus("watching");
      setUpdatedAt(new Date().toISOString());
      if (username) {
        await fetch(`${API}/watch-status`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username, animeId, status: "watching",
            anime: { id: animeId, title: anime.title, image: anime.image, url: anime.url, genres: anime.genres || [], episodes: anime.episodes ?? null, type: anime.type ?? null, malScore: malRating ?? null }
          })
        });
      }
    }

    if (!username) return;
    try {
      await fetch(`${API}/episode-progress`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, animeId, currentEp: value })
      });
    } catch (err) { console.error(err); }
  };

  // Saves the note 800ms after the user stops typing so we're not firing a
  // request on every single keystroke
  const handleNoteChange = (e) => {
    const val = e.target.value;
    setNote(val);
    clearTimeout(noteTimer.current);
    setNoteSaving(true);
    noteTimer.current = setTimeout(async () => {
      const username = localStorage.getItem("username");
      if (!username) return;
      try {
        await fetch(`${API}/anime-note`, {
          method: "POST", headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username, animeId, note: val })
        });
      } catch (err) { console.error(err); }
      setNoteSaving(false);
    }, 800);
  };

  const progressPct = totalEps && currentEp ? Math.min(100, Math.round((currentEp / totalEps) * 100)) : 0;
  const episodeLabel = totalEps != null ? `${totalEps} eps` : "? eps";
  const statusCfg    = STATUS_CONFIG[status] || STATUS_CONFIG.none;
  const ago          = timeAgo(updatedAt);

  return (
    <div className="am-anime-card">

      <a href={anime.url || "#"} target="_blank" rel="noreferrer" style={{ position: "relative", display: "block" }}>
        <img src={anime.image || ""} alt={anime.title || "Anime"} className="am-anime-card__img" />

        {/* MAL community score badge — shows a dash if the score is genuinely missing */}
        <div style={{
          position: "absolute", top: "8px", right: "8px",
          background: "rgba(15,14,23,0.85)", border: "1px solid rgba(255,209,102,0.4)",
          color: "var(--yellow)", fontSize: "11px", fontWeight: 800,
          padding: "3px 8px", borderRadius: "20px", backdropFilter: "blur(4px)"
        }}>
          ★ {malRating != null ? malRating : "—"}
        </div>

        {/* Watch status badge — only visible once the user has set a status */}
        {status !== "none" && (
          <div style={{
            position: "absolute", top: "8px", left: "8px",
            background: "rgba(15,14,23,0.85)", border: `1px solid ${statusCfg.border}`,
            color: statusCfg.color, fontSize: "10px", fontWeight: 800,
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

        {/* Only show the timestamp for actively in-progress shows */}
        {(status === "watching" || status === "rewatching") && ago && (
          <p style={{ fontSize: "10px", color: "var(--text-dim)", fontStyle: "italic", marginTop: "-2px" }}>
            Updated {ago}
          </p>
        )}

        {/* Progress bar — shown whenever we have episode data to display */}
        {(totalEps != null || currentEp > 0) && (
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
              <input type="number" min="0" max={totalEps || 9999} value={currentEp || ""} placeholder="0" onChange={handleEpChange} />
              {totalEps != null && <span className="am-ep-sep">/ {totalEps}</span>}
            </div>
          </div>
        )}

        {/* Status cycle button — clicking it advances to the next status in the cycle */}
        <button onClick={handleStatusCycle} style={{
          marginTop: "8px", width: "100%", padding: "6px 10px",
          borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 700,
          cursor: "pointer", border: `1.5px solid ${statusCfg.border}`,
          background: statusCfg.bg, color: statusCfg.color,
          fontFamily: "'Nunito', sans-serif", transition: "all 0.15s"
        }}>
          {statusCfg.label}
        </button>

        {/* Personal rating input — accepts any value 0.5–10, rounded to nearest 0.5 on blur */}
        <div style={{ marginTop: "6px", position: "relative" }}>
          <input
            type="text" inputMode="decimal"
            placeholder="Your rating 0.5–10 (e.g. 7.5)"
            value={ratingInput}
            onChange={handleRatingInput}
            onBlur={handleRatingBlur}
            onKeyDown={handleRatingKeyDown}
            className="am-input"
            style={{ paddingRight: ratingInput ? "32px" : "12px" }}
          />
          {ratingInput && (
            <button onClick={() => { setRatingInput(""); setRating(""); }}
              style={{ position: "absolute", right: "8px", top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)", fontSize: "14px", lineHeight: 1, padding: "2px" }}
              title="Clear rating">✕</button>
          )}
        </div>
        {rating !== "" && (
          <p style={{ fontSize: "11px", color: "var(--yellow)", fontWeight: 700, marginTop: "3px" }}>
            Your rating: {rating}/10
          </p>
        )}

        {/* Notes section — collapsed by default, auto-saves while the user types */}
        <button
          onClick={() => setNoteOpen(o => !o)}
          className="am-btn am-btn-ghost am-btn-full am-btn-sm"
          style={{ marginTop: "8px", justifyContent: "space-between" }}
        >
          <span>📝 {note ? "My notes" : "Add a note"}</span>
          <span style={{ fontSize: "10px", opacity: 0.6 }}>{noteOpen ? "▲" : "▼"}</span>
        </button>

        {noteOpen && (
          <div style={{ marginTop: "6px" }}>
            <textarea
              value={note}
              onChange={handleNoteChange}
              placeholder="Write your thoughts about this anime... What did you love? What surprised you?"
              rows={3}
              className="am-input"
              style={{ resize: "vertical", lineHeight: 1.5, fontSize: "12px" }}
            />
            {noteSaving  && <p style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>Saving...</p>}
            {!noteSaving && note && <p style={{ fontSize: "10px", color: "var(--teal)", marginTop: "2px" }}>✓ Saved</p>}
          </div>
        )}

        <button onClick={handleSave} className="am-btn am-btn-coral am-btn-full am-btn-sm" style={{ marginTop: "8px" }}>
          ⭐ Save to Profile
        </button>

        {/* Only rendered on search/recommendations pages, not on the watchlist */}
        {!hideSimilar && onSimilarClick && (
          <button onClick={() => animeId && onSimilarClick(animeId)} className="am-btn am-btn-ghost am-btn-full am-btn-sm" style={{ marginTop: "5px" }}>
            Find Similar
          </button>
        )}

      </div>
    </div>
  );
}

export default AnimeCard;