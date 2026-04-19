import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AnimeCard from "./AnimeCard";

const API = "https://animatch-ofks.onrender.com";
const ALL_GENRES = ["Action", "Comedy", "Fantasy", "Romance", "Drama", "Horror", "SciFi"];

function Recommendations() {
  const location = useLocation();
  const navigate = useNavigate();
  const { answers } = location.state || {};

  const [recommendationStack, setRecommendationStack] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [refetching, setRefetching] = useState(false);
  const [quizGenres, setQuizGenres]     = useState([]);
  const [activeGenres, setActiveGenres] = useState([]);
  const [quizParams, setQuizParams]     = useState({});

  useEffect(() => {
    if (!answers) return;
    let mood = null, genres = [], maxEpisodes = null, hiddenGem = false;

    answers.forEach(answer => {
      if (["Excited","Chill","Adventurous","Romantic","Sad","Comedic"].includes(answer)) mood = answer;
      if (ALL_GENRES.includes(answer)) genres.push(answer);
      if (answer.includes("Short"))  maxEpisodes = 25;
      if (answer.includes("Medium")) maxEpisodes = 50;
      if (answer.includes("Long"))   maxEpisodes = 100;
      if (answer === "Hidden Gems")  hiddenGem = true;
    });

    if (genres.length === 0) genres = ["Action"];
    const params = { mood, genres, maxEpisodes, hiddenGem };
    setQuizParams(params);
    setQuizGenres(genres);
    setActiveGenres(genres);
    fetchRecs(params, "Your Recommendations", true);
  }, [answers]);

  const fetchRecs = async (params, title, isInitial = false) => {
    if (isInitial) setLoading(true);
    else           setRefetching(true);
    try {
      const res  = await fetch(`${API}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });
      const data    = await res.json();
      const results = Array.isArray(data) ? data : [];
      if (isInitial) {
        setRecommendationStack([{ title, data: results }]);
      } else {
        setRecommendationStack(prev => [{ title, data: results }, ...prev.slice(1)]);
      }
    } catch (err) {
      console.error("Fetch recs failed:", err);
    } finally {
      setLoading(false);
      setRefetching(false);
    }
  };

  const handleGenreToggle = (genre) => {
    const newGenres = activeGenres.includes(genre)
      ? activeGenres.filter(g => g !== genre)
      : [...activeGenres, genre];
    setActiveGenres(newGenres);
    if (newGenres.length === 0) return;
    fetchRecs({ ...quizParams, genres: newGenres }, `Results — ${newGenres.join(", ")}`, false);
  };

  const handleReset = () => {
    setActiveGenres(quizGenres);
    fetchRecs(quizParams, "Your Recommendations", false);
  };

  const handleSimilarClick = async (animeId) => {
    try {
      const res  = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/recommendations`);
      const data = await res.json();
      const similar = (data.data || []).slice(0, 12).map(item => ({
        id: item.entry.mal_id, title: item.entry.title,
        image: item.entry.images?.jpg?.image_url || "",
        rating: "N/A", url: item.entry.url, episodes: null
      }));
      setRecommendationStack(prev => [...prev, { title: "Similar Anime", data: similar }]);
    } catch (err) { console.error("Similar fetch failed:", err); }
  };

  const isModified = JSON.stringify([...activeGenres].sort()) !== JSON.stringify([...quizGenres].sort());

  if (!answers) return <div className="am-loading">Please take the quiz first.</div>;
  if (loading)  return <div className="am-loading">Finding your anime...</div>;

  return (
    <div className="am-page">

      {/* Nav */}
      <nav className="am-nav">
        <div className="am-logo"><span className="ani">Ani</span><span className="match">Match</span></div>
        <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => navigate("/dashboard")}>⬅ Dashboard</button>
        <button className="am-btn am-btn-coral am-btn-sm" onClick={() => navigate("/quiz")}>🔄 Retake Quiz</button>
      </nav>

      <h1 style={{ marginBottom: "6px" }}>Your <span style={{ color: "var(--coral)" }}>Picks</span></h1>

      {/* Genre filter */}
      <div style={{ margin: "16px 0 24px" }}>
        <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "10px" }}>
          Filter by genre
        </p>
        <div className="am-pills">
          {ALL_GENRES.map(genre => {
            const isActive    = activeGenres.includes(genre);
            const isQuizGenre = quizGenres.includes(genre);
            return (
              <button
                key={genre}
                onClick={() => handleGenreToggle(genre)}
                className={`am-pill ${isActive ? (isQuizGenre ? "active-coral" : "active-teal") : ""}`}
              >
                {genre}
              </button>
            );
          })}
          {isModified && (
            <button className="am-pill" onClick={handleReset} style={{ borderStyle: "dashed" }}>
              ↩ Reset
            </button>
          )}
        </div>
        {refetching && <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "10px" }}>Updating...</p>}
      </div>

      {/* Results */}
      {recommendationStack.map((section, index) => (
        <div key={index} style={{ marginBottom: "40px" }}>
          <div className="am-section-header">
            <h2>{section.title}</h2>
            <span style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: 700 }}>
              {section.data.length} results
            </span>
          </div>

          {section.data.length === 0 ? (
            <div className="am-empty">
              <h3>No results</h3>
              <p>Try adding more genres above!</p>
            </div>
          ) : (
            <div className="am-grid">
              {section.data.map(anime => (
                <AnimeCard key={anime.id} anime={anime} onSimilarClick={handleSimilarClick} />
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default Recommendations;