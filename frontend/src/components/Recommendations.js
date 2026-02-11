import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";

function Recommendations() {
  const location = useLocation();
  const { answers } = location.state || {};

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!answers) return;

    let mood = null;
    let genres = [];
    let maxEpisodes = null;
    let hiddenGem = false;

    answers.forEach(answer => {
      // Mood
      if (["Excited", "Chill", "Adventurous", "Romantic", "Sad", "Comedic"].includes(answer)) {
        mood = answer;
      }

      // Genres
      if (["Action", "Comedy", "Fantasy", "Romance", "Drama", "Horror", "SciFi"].includes(answer)) {
        genres.push(answer);
      }

      // Episode length
      if (answer.includes("Short")) maxEpisodes = 25;
      if (answer.includes("Medium")) maxEpisodes = 50;
      if (answer.includes("Long")) maxEpisodes = 100;

      // Hidden gem / Popular
      if (answer === "Hidden Gems") hiddenGem = true;
    });

    if (genres.length === 0) genres = ["Action"]; // default

    const fetchRecommendations = async () => {
      try {
        const res = await fetch("http://localhost:5000/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mood,
            genres,
            maxEpisodes,
            hiddenGem
          })
        });

        if (!res.ok) throw new Error("Failed to fetch recommendations");

        const data = await res.json();
        setResults(data);
      } catch (err) {
        console.error(err);
        alert("Failed to load recommendations");
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [answers]);

  if (!answers) return <p>Please take the quiz first.</p>;
  if (loading) return <p>Loading recommendations...</p>;

  return (
    <div style={{ height: "100vh", overflowY: "auto", padding: "20px" }}>
      <h1>Your Anime Recommendations</h1>

      {results.length === 0 ? (
        <p>No recommendations found.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "20px",
            paddingBottom: "40px"
          }}
        >
          {results.map(anime => (
            <a
              key={anime.id}
              href={anime.url}
              target="_blank"
              rel="noreferrer"
              style={{ textDecoration: "none", color: "inherit" }}
            >
              <div
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "12px",
                  padding: "10px",
                  backgroundColor: "#f8f8f8",
                  transition: "transform 0.2s"
                }}
              >
                <img
                  src={anime.image}
                  alt={anime.title}
                  style={{ width: "100%", height: "280px", objectFit: "cover", borderRadius: "8px" }}
                />
                <h3 style={{ marginTop: "10px" }}>{anime.title}</h3>
                <p>⭐ {anime.rating}</p>
                <p>{anime.episodes || "?"} episodes</p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}

export default Recommendations;
