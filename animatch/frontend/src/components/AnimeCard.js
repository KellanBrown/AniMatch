import React from "react";

const API = "https://animatch-ofks.onrender.com";

function AnimeCard({ anime, onSimilarClick }) {
  // ✅ Normalize ID once (fixes 90% of your bugs)
  const animeId = anime.id || anime.mal_id;

  const handleSave = async () => {
    const username = localStorage.getItem("username");

    if (!username) {
      alert("You must be logged in.");
      return;
    }

    try {
      const res = await fetch(`${API}/save-anime`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
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

      console.log("SAVE RESPONSE:", res.status, data);

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

  return (
    <div
      className="card"
      style={{
        width: "100%",
        maxWidth: "220px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between"
      }}
    >
      <a
        href={anime.url}
        target="_blank"
        rel="noreferrer"
        style={{ textDecoration: "none", color: "inherit" }}
      >
        <img
          src={anime.image}
          alt={anime.title}
          style={{
            width: "100%",
            height: "260px",
            objectFit: "cover",
            borderRadius: "8px"
          }}
        />

        <h3 style={{ fontSize: "14px", marginTop: "8px" }}>
          {anime.title}
        </h3>
      </a>

      <p style={{ fontSize: "12px", opacity: 0.8 }}>
        ⭐ {anime.rating || anime.score || "N/A"}
      </p>

      <p style={{ fontSize: "12px", opacity: 0.8 }}>
        📺 {anime.episodes || "Unknown"} eps
      </p>

      {/* SAVE */}
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

      {/* FIND SIMILAR */}
      <button
        onClick={() => onSimilarClick(animeId)}
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