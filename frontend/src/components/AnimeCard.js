import React from "react";

function AnimeCard({ anime, onSimilarClick }) {
  return (
    <div className="card">
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

      <button
        onClick={() => onSimilarClick(anime.id)}
        style={{ marginTop: "8px", width: "100%" }}
      >
        Find Similar
      </button>
    </div>
  );
}

export default AnimeCard;