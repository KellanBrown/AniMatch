import React from "react";

const API = "https://animatch-ofks.onrender.com";

function AnimeCard({ anime = {}, onSimilarClick = () => {} }) {
  const animeId = anime.id ?? anime.mal_id;

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
        alert("✅ Saved to your profile!");
      } else {
        alert(`❌ Save failed: ${data.message || "unknown error"}`);
      }
    } catch (err) {
      console.error("SAVE ERROR:", err);
      alert("Network/server error saving anime");
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

      {/* RATING */}
      <p style={{ fontSize: "12px", opacity: 0.8 }}>
        ⭐ {anime.rating ?? anime.score ?? "N/A"}
      </p>

      {/* EPISODES */}
      <p style={{ fontSize: "12px", opacity: 0.8 }}>
        📺 {anime.episodes ?? "Unknown"} eps
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