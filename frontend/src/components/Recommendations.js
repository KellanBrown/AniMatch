import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AnimeCard from "./AnimeCard";

function Recommendations() {
  const location = useLocation();
  const navigate = useNavigate();
  const { answers } = location.state || {};

  const [recommendationStack, setRecommendationStack] = useState([]);
  const [loading, setLoading] = useState(true);
  const [similarLoading, setSimilarLoading] = useState(false);

  useEffect(() => {
    if (!answers) return;

    let mood = null;
    let genres = [];
    let maxEpisodes = null;
    let hiddenGem = false;

    answers.forEach(answer => {
      if (["Excited", "Chill", "Adventurous", "Romantic", "Sad", "Comedic"].includes(answer)) {
        mood = answer;
      }
      if (["Action", "Comedy", "Fantasy", "Romance", "Drama", "Horror", "SciFi"].includes(answer)) {
        genres.push(answer);
      }
      if (answer.includes("Short")) maxEpisodes = 25;
      if (answer.includes("Medium")) maxEpisodes = 50;
      if (answer.includes("Long")) maxEpisodes = 100;
      if (answer === "Hidden Gems") hiddenGem = true;
    });

    if (genres.length === 0) genres = ["Action"];

    const fetchRecommendations = async () => {
      try {
        const res = await fetch("/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ mood, genres, maxEpisodes, hiddenGem })
        });

        const data = await res.json();

        setRecommendationStack([
          {
            title: "Your Anime Recommendations",
            data: Array.isArray(data) ? data : []
          }
        ]);

      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [answers]);

  const fetchSimilar = async (animeId, animeTitle) => {
    try {
      setSimilarLoading(true);

      // ✅ FIXED HERE (no localhost)
      const res = await fetch(`/similar/${animeId}`);
      const data = await res.json();

      const normalizedData = (Array.isArray(data) ? data : []).map(anime => ({
        id: anime.id || anime.mal_id,
        title: anime.title,
        image: anime.image || anime.images?.jpg?.image_url,
        rating: anime.rating || anime.score,
        episodes: anime.episodes,
        url: anime.url
      }));

      setRecommendationStack(prev => [
        ...prev,
        { title: `Because you liked ${animeTitle}...`, data: normalizedData }
      ]);

      setTimeout(() => {
        window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
      }, 200);

    } catch (err) {
      console.error(err);
    } finally {
      setSimilarLoading(false);
    }
  };

  if (!answers) return <p>Please take the quiz first.</p>;
  if (loading) return <p>Loading recommendations...</p>;

  return (
    <div style={{ minHeight: "100vh", padding: "20px" }}>
      <button
        onClick={() => navigate("/dashboard")}
        style={{
          marginBottom: "20px",
          padding: "10px 15px",
          borderRadius: "8px",
          border: "none",
          backgroundColor: "#4CAF50",
          color: "white",
          cursor: "pointer"
        }}
      >
        ⬅ Back to Profile
      </button>

      {recommendationStack.map((section, index) => (
        <div key={index} style={{ marginBottom: "50px" }}>
          <h2>{section.title}</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "20px",
              marginTop: "20px"
            }}
          >
            {(Array.isArray(section.data) ? section.data : []).map(anime => (
              <AnimeCard
                key={`${anime.id}-${index}`}
                anime={anime}
                onSimilarClick={(id) => fetchSimilar(id, anime.title)}
              />
            ))}
          </div>
        </div>
      ))}

      {similarLoading && <p>Loading similar anime...</p>}
    </div>
  );
}

export default Recommendations;