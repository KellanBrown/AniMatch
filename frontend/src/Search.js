import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  // Autocomplete
  const handleInput = async (e) => {
    const value = e.target.value;
    setQuery(value);
    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`http://localhost:5000/api/search?q=${value}`);
      const data = await res.json();

      // Backend returns array directly
      if (Array.isArray(data)) setSuggestions(data.slice(0, 5));
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    }
  };

  const handleSelect = (title) => {
    setQuery(title);
    setSuggestions([]);
  };

  // Full search
  const handleSearch = async (e) => {
    e.preventDefault();
    setSuggestions([]);
    if (!query) return;

    try {
      const res = await fetch(`http://localhost:5000/api/search?q=${query}`);
      const data = await res.json();

      // Backend returns array directly
      if (Array.isArray(data)) setResults(data);
    } catch (err) {
      console.error("Error fetching search results:", err);
    }
  };

  return (
    <div style={{ paddingBottom: "50px" }}>
      <h1>Search Anime</h1>
      <button onClick={() => navigate("/dashboard")}>🏠 Profile</button>

      <form onSubmit={handleSearch} style={{ marginTop: "10px" }}>
        <input
          type="text"
          placeholder="Search for an anime..."
          value={query}
          onChange={handleInput}
          autoComplete="off"
          required
          style={{ padding: "5px", width: "300px" }}
        />
        <button type="submit" style={{ marginLeft: "5px", padding: "5px 10px" }}>
          Search
        </button>
      </form>

      {/* Autocomplete Suggestions */}
      {suggestions.length > 0 && (
        <div style={{ marginTop: "10px" }}>
          {suggestions.map((anime) => (
            <div
              key={anime.mal_id}
              onClick={() => handleSelect(anime.title)}
              style={{ cursor: "pointer", padding: "3px 0" }}
            >
              {anime.title}
            </div>
          ))}
        </div>
      )}

      {/* Search Results */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: "10px",
          maxHeight: "70vh",
          overflowY: "auto",
          marginTop: "20px",
          paddingBottom: "20px",
        }}
      >
        {results.length === 0 ? (
          <p>No results yet...</p>
        ) : (
          results.map((anime) => (
            <div
              key={anime.id}
              style={{
                border: "1px solid #ccc",
                borderRadius: "10px",
                width: "220px",
                textAlign: "center",
                boxShadow: "2px 2px 10px rgba(0,0,0,0.1)",
                backgroundColor: "#f8f8f8",
                flexShrink: 0,
                padding: "10px",
              }}
            >
              <a href={anime.url} target="_blank" rel="noreferrer">
                {anime.image ? (
                  <img
                    src={anime.image}
                    alt={anime.title}
                    style={{
                      width: "200px",
                      height: "280px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "200px",
                      height: "280px",
                      backgroundColor: "#ddd",
                      borderRadius: "8px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      cursor: "pointer",
                    }}
                  >
                    No Image
                  </div>
                )}
              </a>

              <h3 style={{ fontSize: "16px", margin: "5px 0" }}>{anime.title}</h3>
              <p style={{ margin: "3px 0" }}>MAL Score: {anime.rating || "N/A"}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Search;
