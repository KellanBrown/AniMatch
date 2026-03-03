import React from "react";

function AnimeCard({ anime, onSimilarClick }) {
  return (
    <div
      style={{
        border: "1px solid #ccc",
        borderRadius: "12px",
        padding: "10px",
        backgroundColor: "#f8f8f8"
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
            height: "280px",
            objectFit: "cover",
            borderRadius: "8px"
          }}
        />
        <h3 style={{ marginTop: "10px" }}>{anime.title}</h3>
      </a>

      <p>⭐ {anime.rating || anime.score || "N/A"}</p>
      <p>📺 {anime.episodes || "Unknown"} episodes</p>

      <button
        onClick={() => onSimilarClick(anime.id)}
        style={{
          marginTop: "10px",
          padding: "6px",
          borderRadius: "6px",
          border: "none",
          backgroundColor: "#2196F3",
          color: "white",
          cursor: "pointer",
          width: "100%"
        }}
      >
        If you liked this...
      </button>
    </div>
  );
}

export default AnimeCard;