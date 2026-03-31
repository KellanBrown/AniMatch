import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  let debounceTimer;

  const handleInput = (e) => {
    const value = e.target.value;
    setQuery(value);

    clearTimeout(debounceTimer);

    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    debounceTimer = setTimeout(async () => {
      try {
        const res = await fetch(`/search?q=${value}`);
        const data = await res.json();
        if (Array.isArray(data)) setSuggestions(data.slice(0, 5));
      } catch (err) {
        console.error("Error fetching suggestions:", err);
      }
    }, 400);
  };

  const handleSelect = (title) => {
    setQuery(title);
    setSuggestions([]);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setSuggestions([]);
    if (!query) return;

    try {
      const res = await fetch(`/search?q=${query}`);
      const data = await res.json();
      if (Array.isArray(data)) setResults(data);
    } catch (err) {
      console.error("Error fetching search results:", err);
    }
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "auto" }}>
      
      {/* 🔥 Header */}
      <h1
        style={{
          background: "linear-gradient(90deg, #7c3aed, #ec4899)",
          WebkitBackgroundClip: "text",
          color: "transparent",
          fontSize: "36px",
          marginBottom: "10px"
        }}
      >
        AniMatch 🎌
      </h1>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0 }}>Search Anime</h2>
        <button onClick={() => navigate("/dashboard")}>🏠 Profile</button>
      </div>

      {/* 🔥 Search Bar */}
      <form
        onSubmit={handleSearch}
        style={{
          marginTop: "20px",
          display: "flex",
          gap: "10px",
          alignItems: "center"
        }}
      >
        <input
          type="text"
          placeholder="Search for an anime..."
          value={query}
          onChange={handleInput}
          autoComplete="off"
          required
          style={{ padding: "8px", width: "100%" }}
        />

        <button type="submit">Search</button>
      </form>

      {/* 🔥 Suggestions */}
      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((anime) => (
            <div
              key={anime.id}
              onClick={() => handleSelect(anime.title)}
              className="suggestion-item"
              style={{ padding: "8px", cursor: "pointer" }}
            >
              {anime.title}
            </div>
          ))}
        </div>
      )}

      {/* 🔥 Results */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
          gap: "20px",
          marginTop: "30px"
        }}
      >
        {results.length === 0 ? (
          <p>No results yet...</p>
        ) : (
          results.map((anime) => (
            <div key={anime.id} className="card">
              <a href={anime.url} target="_blank" rel="noreferrer">
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
              </a>

              <h3 style={{ fontSize: "14px", marginTop: "8px" }}>
                {anime.title}
              </h3>

              <p style={{ fontSize: "12px", opacity: 0.8 }}>
                ⭐ {anime.rating || "N/A"}
              </p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Search;