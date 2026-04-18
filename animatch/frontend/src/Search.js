import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import AnimeCard from "./components/AnimeCard";

const API = "https://animatch-ofks.onrender.com";

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
        const res = await fetch(`${API}/search?q=${value}`);
        const data = await res.json();
        if (Array.isArray(data)) setSuggestions(data.slice(0, 5));
      } catch (err) {
        console.error(err);
      }
    }, 300);
  };

  const handleSearch = async (e) => {
    e.preventDefault();
    setSuggestions([]);

    const res = await fetch(`${API}/search?q=${query}`);
    const data = await res.json();

    setResults(Array.isArray(data) ? data : []);
  };

  return (
    <div style={{ padding: "40px", maxWidth: "1000px", margin: "auto" }}>
      <h1>AniMatch 🎌</h1>

      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <h2>Search Anime</h2>
        <button onClick={() => navigate("/dashboard")}>Profile</button>
      </div>

      <form onSubmit={handleSearch} style={{ display: "flex", gap: "10px" }}>
        <input
          value={query}
          onChange={handleInput}
          placeholder="Search anime..."
          style={{ width: "100%", padding: "8px" }}
        />
        <button type="submit">Search</button>
      </form>

      {suggestions.map((a) => (
        <div
          key={a.id}
          onClick={() => setQuery(a.title)}
          style={{ cursor: "pointer", padding: "5px" }}
        >
          {a.title}
        </div>
      ))}

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
            <AnimeCard key={anime.id} anime={anime} />
          ))
        )}
      </div>
    </div>
  );
}

export default Search;