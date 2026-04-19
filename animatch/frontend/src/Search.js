import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import AnimeCard from "./components/AnimeCard";

const API = "https://animatch-ofks.onrender.com";

function Search() {
  const [query, setQuery]           = useState("");
  const [results, setResults]       = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching]   = useState(false);
  const [searched, setSearched]     = useState(false);

  const navigate    = useNavigate();
  const debounceRef = useRef(null);
  const inputRef    = useRef(null);

  // ---- Autocomplete suggestions ----
  const handleInput = (e) => {
    const value = e.target.value;
    setQuery(value);
    clearTimeout(debounceRef.current);

    if (value.length < 2) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      try {
        const res  = await fetch(`${API}/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (Array.isArray(data)) setSuggestions(data.slice(0, 5));
      } catch (err) { console.error(err); }
    }, 300);
  };

  const pickSuggestion = (title) => {
    setQuery(title);
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // ---- Main search ----
  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setSuggestions([]);
    setSearching(true);
    setSearched(true);

    try {
      const res  = await fetch(`${API}/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  // ---- Find similar — uses Jikan recommendations endpoint (fixed) ----
  const handleSimilarClick = async (animeId) => {
    setSearching(true);
    setSearched(true);
    setSuggestions([]);

    try {
      const res  = await fetch(`https://api.jikan.moe/v4/anime/${animeId}/recommendations`);
      const data = await res.json();

      const similar = (data.data || []).slice(0, 12).map(item => ({
        id:       item.entry.mal_id,
        title:    item.entry.title,
        image:    item.entry.images?.jpg?.image_url || "",
        rating:   "N/A",
        url:      item.entry.url,
        episodes: null
      }));

      setResults(similar);
      setQuery("Similar anime");
    } catch (err) {
      console.error("Similar fetch failed:", err);
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="am-page">

      {/* Nav */}
      <nav className="am-nav">
        <div className="am-logo"><span className="ani">Ani</span><span className="match">Match</span></div>
        <button className="am-btn am-btn-ghost am-btn-sm"  onClick={() => navigate("/dashboard")}>⬅ Profile</button>
        <button className="am-btn am-btn-coral am-btn-sm"  onClick={() => navigate("/quiz")}>📝 Quiz</button>
        <button className="am-btn am-btn-teal am-btn-sm"   onClick={() => navigate("/watchlist")}>📋 Watchlist</button>
      </nav>

      {/* Header */}
      <div style={{ marginBottom: "24px" }}>
        <h1>Search <span style={{ color: "var(--purple)" }}>Anime</span></h1>
        <p style={{ marginTop: "4px", fontSize: "13px" }}>Find any anime by title — or hit "Find Similar" on a card</p>
      </div>

      {/* Search form */}
      <form onSubmit={handleSearch} style={{ position: "relative", marginBottom: "8px" }}>
        <div style={{ display: "flex", gap: "10px" }}>
          <div style={{ position: "relative", flex: 1 }}>
            <input
              ref={inputRef}
              value={query}
              onChange={handleInput}
              placeholder="Search by title..."
              className="am-input"
              style={{ paddingLeft: "16px", fontSize: "14px", height: "44px" }}
              autoComplete="off"
            />

            {/* Autocomplete dropdown */}
            {suggestions.length > 0 && (
              <div style={{
                position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                background: "var(--surface2)",
                border: "1px solid var(--border-hover)",
                borderRadius: "var(--radius-md)",
                overflow: "hidden",
                zIndex: 100
              }}>
                {suggestions.map(a => (
                  <div
                    key={a.id}
                    onClick={() => pickSuggestion(a.title)}
                    style={{
                      padding: "10px 16px",
                      cursor: "pointer",
                      fontSize: "13px",
                      color: "var(--text)",
                      borderBottom: "1px solid var(--border)",
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                      transition: "background 0.1s"
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = "var(--surface3)"}
                    onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                  >
                    {a.image && (
                      <img src={a.image} alt="" style={{ width: "28px", height: "40px", objectFit: "cover", borderRadius: "4px" }} />
                    )}
                    <div>
                      <div style={{ fontWeight: 700, fontSize: "13px" }}>{a.title}</div>
                      {a.rating && a.rating !== "N/A" && (
                        <div style={{ fontSize: "11px", color: "var(--yellow)" }}>★ {a.rating}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            className="am-btn am-btn-coral"
            style={{ height: "44px", padding: "0 24px", fontSize: "14px" }}
          >
            Search
          </button>
        </div>
      </form>

      {/* Status / results count */}
      {searched && !searching && (
        <p style={{ fontSize: "12px", color: "var(--text-dim)", marginBottom: "20px", fontWeight: 700 }}>
          {results.length > 0
            ? `${results.length} results for "${query}"`
            : `No results for "${query}"`}
        </p>
      )}

      {/* Loading skeleton */}
      {searching && (
        <div className="am-grid" style={{ marginTop: "8px" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              animation: "pulse 1.4s ease-in-out infinite"
            }}>
              <div style={{ height: "260px", background: "var(--surface2)" }} />
              <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ height: "13px", background: "var(--surface3)", borderRadius: "4px", width: "80%" }} />
                <div style={{ height: "11px", background: "var(--surface3)", borderRadius: "4px", width: "50%" }} />
              </div>
            </div>
          ))}
          <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.5} }`}</style>
        </div>
      )}

      {/* Empty state before first search */}
      {!searched && !searching && (
        <div className="am-empty" style={{ marginTop: "60px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔍</div>
          <h3>What are you looking for?</h3>
          <p>Type an anime title above to get started</p>
        </div>
      )}

      {/* No results */}
      {searched && !searching && results.length === 0 && (
        <div className="am-empty" style={{ marginTop: "40px" }}>
          <div style={{ fontSize: "48px", marginBottom: "12px" }}>😔</div>
          <h3>Nothing found</h3>
          <p>Try a different spelling or a shorter search term</p>
        </div>
      )}

      {/* Results grid */}
      {!searching && results.length > 0 && (
        <div className="am-grid">
          {results.map(anime => (
            <AnimeCard
              key={anime.id}
              anime={anime}
              onSimilarClick={handleSimilarClick}
            />
          ))}
        </div>
      )}

    </div>
  );
}

export default Search;