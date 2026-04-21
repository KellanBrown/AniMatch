import React, { useState, useEffect, useRef } from "react";
import { useToast } from "./Toast";

const API = "https://animatch-ofks.onrender.com";

// FIX: cycle ends at 'none' so users can undo accidental clicks
// none → watching → completed → rewatching → none
const STATUS_CONFIG = {
  none:       { label: "Add Status",    next: "watching",   color: "var(--text-dim)",  bg: "transparent",        border: "var(--border)" },
  watching:   { label: "Watching",      next: "completed",  color: "var(--teal)",       bg: "var(--teal-dim)",    border: "var(--teal)" },
  completed:  { label: "Completed ✓",   next: "rewatching", color: "var(--purple)",     bg: "var(--purple-dim)",  border: "var(--purple)" },
  rewatching: { label: "Rewatching 🔄", next: "none",       color: "var(--yellow)",     bg: "var(--yellow-dim)",  border: "var(--yellow)" }
};

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
  const animeId  = anime.id ?? anime.mal_id;
  const toast    = useToast();

  const [status, setStatus]           = useState("none");
  const [updatedAt, setUpdatedAt]     = useState(null);
  const [ratingInput, setRatingInput] = useState("");
  const [rating, setRating]           = useState("");
  const [currentEp, setCurrentEp]     = useState(0);
  const [note, setNote]               = useState("");
  const [noteOpen, setNoteOpen]       = useState(false);
  const [noteSaving, setNoteSaving]   = useState(false);
  const noteTimer = useRef(null);

  const totalEps = anime.episodes ?? null;

  // FIX: Always use MAL community score — never show user's personal rating here
  // The malScore is stored when saving; for unsaved cards we use anime.rating directly
  const malRating = anime.malScore ?? (typeof anime.rating === "number" ? anime.rating : null);

  // ---- Load saved state ----
  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username || !animeId) return;
    const load = async () => {
      try {
        const res  = await fetch(`${API}/anime-status/${username}/${animeId}`);
        if (!res.ok) return;
        const data = await res.json();
        if (data.status)        setStatus(data.status);
        if (data.updatedAt)     setUpdatedAt(data.updatedAt);
        if (data.rating != null) { setRating(data.rating); setRatingInput(String(data.rating)); }
        if (data.currentEp != null) setCurrentEp(data.currentEp);
        if (data.note != null)  setNote(data.note);
      } catch (err) { console.warn("Could not load anime status:", err); }
    };
    load();
  }, [animeId]);

  // ---- Save to profile ----
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
            malScore: malRating      ?? null   // store the MAL score separately
          }
        })
      });
      if (res.ok)              toast("Saved to your profile!", "success");
      else if (res.status === 409) toast("Already in your list!", "info");
      else { const d = await res.json(); toast(d.message || "Save failed", "error"); }
    } catch (err) { toast("Network error saving anime", "error"); }
  };

  // ---- Status cycle ----
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
          // Pass anime data so backend can auto-save to profile
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

  // ---- Rating ----
  const handleRatingInput = (e) => setRatingInput(e.target.value);
  const handleRatingBlur = async () => {
    const val = parseFloat(ratingInput);
    if (isNaN(val) || val < 0.5 || val > 10) { setRatingInput(rating !== "" ? String(rating) : ""); return; }
    const rounded = Math.round(val * 2) / 2;
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
  const handleRatingKeyDown = (e) => { if (e.key === "Enter") e.target.blur(); };

  // ---- Episode progress ----
  const handleEpChange = async (e) => {
    const raw   = parseInt(e.target.value, 10);
    const value = isNaN(raw) ? 0 : Math.max(0, totalEps ? Math.min(raw, totalEps) : raw);
    setCurrentEp(value);
    const username = localStorage.getItem("username");

    // FIX: only auto-complete going forward (reaching last ep)
    // Never downgrade status when user corrects episode count backwards
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
      // Auto-set to watching when they start tracking progress
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
    // NOTE: if value < totalEps and status is already 'completed', we leave it as-is
    // The user completed it — reducing ep count is probably a correction, not un-completing

    if (!username) return;
    try {
      await fetch(`${API}/episode-progress`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, animeId, currentEp: value })
      });
    } catch (err) { console.error(err); }
  };

  // ---- Notes (auto-save with debounce) ----
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

      {/* Image */}
      <a href={anime.url || "#"} target="_blank" rel="noreferrer" style={{ position: "relative", display: "block" }}>
        <img src={anime.image || ""} alt={anime.title || "Anime"} className="am-anime-card__img" />

        {/* FIX: Always show MAL community rating — never N/A unless truly missing */}
        <div style={{
          position: "absolute", top: "8px", right: "8px",
          background: "rgba(15,14,23,0.85)", border: "1px solid rgba(255,209,102,0.4)",
          color: "var(--yellow)", fontSize: "11px", fontWeight: 800,
          padding: "3px 8px", borderRadius: "20px", backdropFilter: "blur(4px)"
        }}>
          ★ {malRating != null ? malRating : "—"}
        </div>

        {/* Status badge */}
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
          {/* FIX: episodeLabel only says "? eps" when truly unknown */}
          <span className="am-anime-card__eps">📺 {episodeLabel}</span>
          {anime.type && <span style={{ color: "var(--text-dim)", fontSize: "11px" }}>{anime.type}</span>}
        </div>

        {(status === "watching" || status === "rewatching") && ago && (
          <p style={{ fontSize: "10px", color: "var(--text-dim)", fontStyle: "italic", marginTop: "-2px" }}>
            Updated {ago}
          </p>
        )}

        {/* Progress bar */}
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

        {/* Status cycle button */}
        <button onClick={handleStatusCycle} style={{
          marginTop: "8px", width: "100%", padding: "6px 10px",
          borderRadius: "var(--radius-sm)", fontSize: "12px", fontWeight: 700,
          cursor: "pointer", border: `1.5px solid ${statusCfg.border}`,
          background: statusCfg.bg, color: statusCfg.color,
          fontFamily: "'Nunito', sans-serif", transition: "all 0.15s"
        }}>
          {statusCfg.label}
        </button>

        {/* Personal rating */}
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

        {/* Notes toggle */}
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
            {noteSaving && <p style={{ fontSize: "10px", color: "var(--text-dim)", marginTop: "2px" }}>Saving...</p>}
            {!noteSaving && note && <p style={{ fontSize: "10px", color: "var(--teal)", marginTop: "2px" }}>✓ Saved</p>}
          </div>
        )}

        {/* Save button */}
        <button onClick={handleSave} className="am-btn am-btn-coral am-btn-full am-btn-sm" style={{ marginTop: "8px" }}>
          ⭐ Save to Profile
        </button>

        {/* Find Similar */}
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