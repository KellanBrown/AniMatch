import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AnimeCard from "./AnimeCard";

const API = "https://animatch-ofks.onrender.com";

function Recommendations() {
  const location = useLocation();
  const navigate = useNavigate();
  const { answers } = location.state || {};

  const [recommendationStack, setRecommendationStack] = useState([]);
  const [loading, setLoading] = useState(true);

  const [watchingState, setWatchingState] = useState({});
  const [ratingState, setRatingState] = useState({});

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
        const res = await fetch(`${API}/recommend`, {
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

  // ------------------- WATCHED -------------------
  const toggleWatched = async (anime, value) => {
    const username = localStorage.getItem("username");

    setWatchingState(prev => ({
      ...prev,
      [anime.id]: value
    }));

    try {
      await fetch(`${API}/watch-status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          animeId: anime.id,
          watched: value
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  // ------------------- RATING -------------------
  const setRating = async (anime, value) => {
    const username = localStorage.getItem("username");

    setRatingState(prev => ({
      ...prev,
      [anime.id]: value
    }));

    try {
      await fetch(`${API}/rate-anime`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          animeId: anime.id,
          rating: value
        })
      });
    } catch (err) {
      console.error(err);
    }
  };

  if (!answers) return <p>Please take the quiz first.</p>;
  if (loading) return <p>Loading recommendations...</p>;

  return (
    <div style={{ minHeight: "100vh", padding: "20px" }}>
      <button onClick={() => navigate("/dashboard")}>
        ⬅ Back to Profile
      </button>

      {recommendationStack.map((section, index) => (
        <div key={index}>
          <h2>{section.title}</h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
              gap: "20px",
              marginTop: "20px"
            }}
          >
            {(section.data || []).map(anime => (
              <div key={anime.id} style={{ display: "flex", flexDirection: "column" }}>

                <AnimeCard anime={anime} />

                {/* ---------------- WATCHED ---------------- */}
                <label style={{ fontSize: "12px", marginTop: "6px" }}>
                  <input
                    type="checkbox"
                    checked={watchingState[anime.id] || false}
                    onChange={(e) => toggleWatched(anime, e.target.checked)}
                  />
                  {" "}Watched
                </label>

                {/* ---------------- RATING ---------------- */}
                <input
                  type="number"
                  min="1"
                  max="10"
                  placeholder="Rate 1-10"
                  value={ratingState[anime.id] || ""}
                  onChange={(e) => setRating(anime, Number(e.target.value))}
                  style={{
                    marginTop: "6px",
                    padding: "4px"
                  }}
                />

              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default Recommendations;