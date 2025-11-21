import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

function Search() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const navigate = useNavigate();

  const handleSearch = async (e) => {
    e.preventDefault();

    if (!query) return;

    try {
      const res = await fetch(`http://127.0.0.1:5000/api/search?q=${query}`);
      const data = await res.json();

      if (data?.data) {
        setResults(data.data); // Jikan returns { data: [...] }
      }
    } catch (err) {
      console.error("Error fetching search results:", err);
    }
  };

  return (
    <div className="search-page">
      <h1>Search Anime</h1>

      {/* Navigation Buttons */}
      <div className="nav-buttons">
        <button onClick={() => navigate("/dashboard")}>🏠 Profile</button>
      </div>

      <form onSubmit={handleSearch}>
        <input
          type="text"
          placeholder="Search for an anime..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          required
        />
        <button type="submit">Search</button>
      </form>

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
