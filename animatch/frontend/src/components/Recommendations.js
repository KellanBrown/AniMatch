import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import AnimeCard from "./AnimeCard";

const API = "https://animatch-ofks.onrender.com";
const ALL_GENRES = ["Action", "Comedy", "Fantasy", "Romance", "Drama", "Horror", "SciFi"];

function Recommendations() {
  const location = useLocation();
  const navigate = useNavigate();
  const { answers } = location.state || {};

  // Stack of result sets. New results (from genre toggles or "Find Similar") get
  // pushed on top so the user can see both the original and the new results.
  const [recommendationStack, setRecommendationStack] = useState([]);
  const [loading, setLoading]           = useState(true);
  const [refetching, setRefetching]     = useState(false); // true only during genre filter refetches
  const [quizGenres, setQuizGenres]     = useState([]);    // genres from the quiz answers, used to restore on reset
  const [activeGenres, setActiveGenres] = useState([]);    // currently selected genres
  const [quizParams, setQuizParams]     = useState({});
  const [seedLabel, setSeedLabel]       = useState(null);  // display name for the seed anime, if any

  // Parse the quiz answers into recommendation params on first render
  useEffect(() => {
    if (!answers) return;

    let mood = null, genres = [], maxEpisodes = null, hiddenGem = false;
    let seedAnimeId = null, seedAnimeTitle = null;

    answers.forEach(answer => {
      if (["Excited","Chill","Adventurous","Romantic","Sad","Comedic"].includes(answer)) mood = answer;
      if (ALL_GENRES.includes(answer)) genres.push(answer);
      if (answer.includes("Short"))  maxEpisodes = 25;
      if (answer.includes("Medium")) maxEpisodes = 50;
      if (answer.includes("Long"))   maxEpisodes = 100;
      if (answer === "Hidden Gems")  hiddenGem = true;

      // Q5 answers are encoded as special strings — parse them back out here
      if (answer.startsWith("__seed__")) {
        // Format: __seed__{mal_id}__{title}
        const parts = answer.replace("__seed__", "").split("__");
        seedAnimeId    = parseInt(parts[0], 10);
        seedAnimeTitle = parts[1] || null;
        setSeedLabel(parts[1] || null);
      } else if (answer.startsWith("__seedtitle__")) {
        seedAnimeTitle = answer.replace("__seedtitle__", "");
        setSeedLabel(seedAnimeTitle);
      }
      // __noseed__ means the user skipped Q5 — nothing to do
    });

    if (genres.length === 0) genres = ["Action"]; // default so we always have something to query
    const params = { mood, genres, maxEpisodes, hiddenGem, seedAnimeId, seedAnimeTitle };
    setQuizParams(params);
    setQuizGenres(genres);
    setActiveGenres(genres);
    fetchRecs(params, "Your Recommendations", true);
  }, [answers]);

  const fetchRecs = async (params, title, isInitial = false) => {
    if (isInitial) setLoading(true);
    else           setRefetching(true);
    try {
      const res     = await fetch(`${API}/recommend`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(params)
      });
      const data    = await res.json();
      const results = Array.isArray(data) ? data : [];
      if (isInitial) {
        setRecommendationStack([{ title, data: results }]);
      } else {
        // Replace only the top of the stack so "Find Similar" results underneath are preserved
        setRecommendationStack(prev => [{ title, data: results }, ...prev.slice(1)]);
      }
    } catch (err) {
      console.error("Fetch recs failed:", err);
    } finally {
      setLoading(false);
      setRefetching(false);
    }
  };

  // Toggles a genre on or off and immediately refetches with the new selection.
  // Selecting zero genres is a no-op so the list never goes blank.
  const handleGenreToggle = (genre) => {
    const newGenres = activeGenres.includes(genre)
      ? activeGenres.filter(g => g !== genre)
      : [...activeGenres, genre];
    setActiveGenres(newGenres);
    if (newGenres.length === 0) return;
    fetchRecs({ ...quizParams, genres: newGenres }, `Results — ${newGenres.join(", ")}`, false);
  };

  // Restores genres to whatever the quiz originally produced
  const handleReset = () => {
    setActiveGenres(quizGenres);
    fetchRecs(quizParams, "Your Recommendations", false);
  };

  // Fetches MAL's recommendations for a specific anime and appends them as a
  // new section below the current results
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

  // True when the active genres differ from the original quiz genres,
  // which controls whether the reset button is shown
  const isModified = JSON.stringify([...activeGenres].sort()) !== JSON.stringify([...quizGenres].sort());

  if (!answers) return <div className="am-loading">Please take the quiz first.</div>;
  if (loading)  return (
    <div className="am-page">
      <nav className="am-nav">
        <div className="am-logo"><span className="ani">Ani</span><span className="match">Match</span></div>
      </nav>
      <div style={{ textAlign: "center", padding: "60px 24px" }}>
        <div style={{ fontSize: "13px", fontWeight: 700, color: "var(--text-muted)", marginBottom: "24px", letterSpacing: "0.05em" }}>
          {seedLabel ? `Finding anime based on your love of "${seedLabel}"...` : "Finding your perfect anime..."}
        </div>
        <div className="am-grid">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              background: "var(--surface)", border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)", overflow: "hidden",
              animation: "pulse 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.1}s`
            }}>
              <div style={{ height: "260px", background: "var(--surface2)" }} />
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ height: "13px", background: "var(--surface3)", borderRadius: "4px", width: "80%" }} />
                <div style={{ height: "11px", background: "var(--surface3)", borderRadius: "4px", width: "50%" }} />
              </div>
            </div>
          ))}
        </div>
        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
      </div>
    </div>
  );

  return (
    <div className="am-page">
      <nav className="am-nav">
        <div className="am-logo"><span className="ani">Ani</span><span className="match">Match</span></div>
        <button className="am-btn am-btn-ghost am-btn-sm"  onClick={() => navigate("/dashboard")}>⬅ Profile</button>
        <button className="am-btn am-btn-coral am-btn-sm"  onClick={() => navigate("/quiz")}>🔄 Retake Quiz</button>
        <button className="am-btn am-btn-teal am-btn-sm"   onClick={() => navigate("/watchlist")}>📋 Watchlist</button>
      </nav>

      <h1 style={{ marginBottom: "4px" }}>Your <span style={{ color: "var(--coral)" }}>Picks</span></h1>
      {seedLabel && (
        <p style={{ fontSize: "13px", color: "var(--purple)", fontWeight: 700, marginBottom: "4px" }}>
          ✨ Tailored around your love of "{seedLabel}"
        </p>
      )}

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
                // Coral = came from the quiz, teal = added manually by the user
                className={`am-pill ${isActive ? (isQuizGenre ? "active-coral" : "active-teal") : ""}`}
              >
                {genre}
              </button>
            );
          })}
          {/* Reset button only appears when genres have been modified from their quiz defaults */}
          {isModified && (
            <button className="am-pill" onClick={handleReset} style={{ borderStyle: "dashed" }}>
              ↩ Reset
            </button>
          )}
        </div>
        {refetching && <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "10px" }}>Updating...</p>}
      </div>

      {recommendationStack.map((section, index) => (
        <div key={index} style={{ marginBottom: "40px" }}>
          <div className="am-section-header">
            <h2>{section.title}</h2>
            <span style={{ fontSize: "12px", color: "var(--text-dim)", fontWeight: 700 }}>
              {section.data.length} results
            </span>
          </div>
          {section.data.length === 0 ? (
            <div className="am-empty"><h3>No results</h3><p>Try adding more genres above!</p></div>
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