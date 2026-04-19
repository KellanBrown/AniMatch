import React, { useState, useEffect } from "react";

const API = "https://animatch-ofks.onrender.com";

function AnimeCard({ anime = {}, onSimilarClick = () => {} }) {
  const animeId = anime.id ?? anime.mal_id;

  const [watched, setWatched] = useState(false);
  const [rating, setRatingValue] = useState("");
  const [savedMsg, setSavedMsg] = useState("");
  const [ratingMsg, setRatingMsg] = useState("");

  // ---------------- LOAD SAVED STATE ON MOUNT ----------------
  // Persistence fix: when the card renders, fetch this user's existing
  // watched/rating for this anime so the inputs are pre-filled correctly
  // after a page refresh instead of resetting to blank every time.
  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username || !animeId) return;

    const loadStatus = async () => {
      try {
        const res = await fetch(`${API}/anime-status/${username}/${animeId}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.watched !== undefined) setWatched(!!data.watched);
        if (data.rating)                setRatingValue(data.rating);
      } catch (err) {
        // silently ignore — card still works, just starts blank
        console.warn("Could not load anime status:", err);
      }
    };

    loadStatus();
  }, [animeId]);

  // ---------------- SAVE ----------------
  const handleSave = async () => {
    const username = localStorage.getItem("username");

    if (!username) {
      alert("You must be logged in.");
      return;
    }

    try {
      const res = await fetch(`${API}/save-anime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          anime: {
            id: animeId,
            title: anime.title,
            image: anime.image,
            url: anime.url
          }
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSavedMsg("✅ Saved!");
        setTimeout(() => setSavedMsg(""), 2500);
      } else if (res.status === 409) {
        // 409 = duplicate — show friendly message instead of an alert
        setSavedMsg("Already in your list!");
        setTimeout(() => setSavedMsg(""), 2500);
      } else {
        alert(`❌ Save failed: ${data.message || "unknown error"}`);
      }
    } catch (err) {
      console.error("SAVE ERROR:", err);
      alert("Network/server error saving anime");
    }
  };

  // ---------------- WATCHED ----------------
  const handleWatched = async (e) => {
    const value = e.target.checked;
    setWatched(value);

    const username = localStorage.getItem("username");
    if (!username) return;

    try {
      await fetch(`${API}/watch-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, animeId, watched: value })
      });
    } catch (err) {
      console.error("Watch status error:", err);
    }
  };

  // ---------------- RATING ----------------
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

      if (res.ok) {
        setRatingMsg("✅ Rated!");
        setTimeout(() => setRatingMsg(""), 2500);
      }
    } catch (err) {
      console.error("Rating error:", err);
    }
  };

  // ---------------- SIMILAR ----------------
  const handleSimilar = () => {
    if (!animeId) {
      console.warn("No animeId found for similarity request");
      return;
    }
    onSimilarClick(animeId);
  };

  const episodeDisplay = anime.episodes != null ? `${anime.episodes} eps` : "? eps";

  return (
    <div className="card" style={{ maxWidth: "220px", margin: "0 auto" }}>

      {/* IMAGE + TITLE */}
      <a href={anime.url || "#"} target="_blank" rel="noreferrer">
        <img
          src={anime.image || ""}
          alt={anime.title || "Anime"}
          style={{
            width: "100%",
            height: "260px",
            objectFit: "cover",
            borderRadius: "8px"
          }}
        />
        <h3 style={{ fontSize: "14px", marginTop: "8px" }}>
          {anime.title || "Unknown Title"}
        </h3>
      </a>

      {/* COMMUNITY RATING */}
      <p style={{ fontSize: "12px", opacity: 0.8 }}>
        ⭐ {anime.rating ?? anime.score ?? "N/A"}
      </p>

      {/* EPISODES */}
      <p style={{ fontSize: "12px", opacity: 0.8 }}>
        📺 {episodeDisplay}
      </p>

      {/* SAVE BUTTON */}
      <button
        onClick={handleSave}
        style={{
          marginTop: "6px",
          width: "100%",
          cursor: "pointer",
          backgroundColor: "#4CAF50",
          color: "white",
          border: "none",
          padding: "6px",
          borderRadius: "6px"
        }}
      >
        ⭐ Save to Profile
      </button>

      {savedMsg && (
        <p style={{ fontSize: "11px", color: "#4CAF50", margin: "4px 0 0" }}>
          {savedMsg}
        </p>
      )}

      {/* WATCHED CHECKBOX */}
      <label style={{ fontSize: "12px", marginTop: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
        <input
          type="checkbox"
          checked={watched}
          onChange={handleWatched}
        />
        Watched
      </label>

      {/* RATING INPUT */}
      <input
        type="number"
        min="1"
        max="10"
        placeholder="Your rating (1-10)"
        value={rating}
        onChange={handleRating}
        style={{
          marginTop: "6px",
          padding: "4px",
          width: "100%",
          boxSizing: "border-box"
        }}
      />

      {ratingMsg && (
        <p style={{ fontSize: "11px", color: "#4CAF50", margin: "4px 0 0" }}>
          {ratingMsg}
        </p>
      )}

      {/* FIND SIMILAR BUTTON */}
      <button
        onClick={handleSimilar}
        style={{
          marginTop: "6px",
          width: "100%",
          cursor: "pointer"
        }}
      >
        Find Similar
      </button>

    </div>
  );
}

export default AnimeCard;