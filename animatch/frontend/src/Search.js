import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const navigate = useNavigate();

  // Called on typing to show autocomplete suggestions
  const handleInput = async (e) => {
    const value = e.target.value;
    setQuery(value);

    if (value.length < 2) {
      setSuggestions([]);
      return;
    }

    try {
      const res = await fetch(`http://127.0.0.1:5000/api/search?q=${value}`);
      const data = await res.json();

      if (data?.data) {
        setSuggestions(data.data.slice(0, 5)); // top 5 suggestions
      }
    } catch (err) {
      console.error("Error fetching suggestions:", err);
    }
  };

  // Select a suggestion
  const handleSelect = (title) => {
    setQuery(title);
    setSuggestions([]);
  };

  // Run full search
  const handleSearch = async (e) => {
    e.preventDefault();
    setSuggestions([]);

    if (!query) return;

    try {
      const res = await fetch(`http://127.0.0.1:5000/api/search?q=${query}`);
      const data = await res.json();

      if (data?.data) {
        setResults(data.data);
      }
    } catch (err) {
      console.error("Error fetching search results:", err);
    }
  };

  return (
    <div className="search-page" style={{ position: "relative", paddingBottom: "50px" }}>
      <h1>Search Anime</h1>

      {/* Navigation Button */}
      <div className="nav-buttons">
        <button onClick={() => navigate("/dashboard")}>🏠 Profile</button>
      </div>

      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search for an anime..."
          value={query}
          onChange={handleInput}
          autoComplete="off"
          required
        />
        <button type="submit">Search</button>
      </form>

      {/* Autocomplete Suggestions */}
      {suggestions.length > 0 && (
        <div className="suggestions">
          {suggestions.map((anime) => (
            <div key={anime.mal_id} onClick={() => handleSelect(anime.title)}>
              {anime.title}
            </div>
          ))}
        </div>
      )}

      {/* Search Results */}
      <div className="results search-results">
        {results.length === 0 ? (
          <p>No results yet...</p>
        ) : (
          results.map((anime) => (
            <div key={anime.mal_id} className="anime-card">
              <img src={anime.images.jpg.image_url} alt={anime.title} />
              <h3>{anime.title}</h3>
              <p>Score: {anime.score || "N/A"}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Search;
