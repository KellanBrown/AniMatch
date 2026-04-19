import React, { useEffect, useState } from "react";
import AnimeCard from "./AnimeCard";

const API = "https://animatch-ofks.onrender.com";

function Dashboard() {
  const [user, setUser]             = useState(null);
  const [savedAnime, setSavedAnime] = useState([]);
  const [stats, setStats]           = useState(null);
  const [loadingAnime, setLoadingAnime] = useState(true);

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) { window.location.hash = "/"; return; }

    const fetchData = async () => {
      try {
        const userRes  = await fetch(`${API}/dashboard/${username}`);
        const userData = await userRes.json();
        if (userRes.ok && userData.user) setUser(userData.user);
      } catch (err) { console.error(err); }

      try {
        const savedRes  = await fetch(`${API}/saved-anime/${username}`);
        const savedData = savedRes.ok ? await savedRes.json() : [];
        setSavedAnime(Array.isArray(savedData) ? savedData : []);
      } catch (err) { setSavedAnime([]); }

      try {
        const statsRes = await fetch(`${API}/user-stats/${username}`);
        if (statsRes.ok) setStats(await statsRes.json());
      } catch (err) { console.error(err); }

      setLoadingAnime(false);
    };

    fetchData();
  }, []);

  if (!user) return <div className="am-loading">Loading your profile...</div>;

  return (
    <div className="am-page">

      {/* Nav */}
      <nav className="am-nav">
        <div className="am-logo"><span className="ani">Ani</span><span className="match">Match</span></div>
        <button className="am-btn am-btn-teal am-btn-sm"   onClick={() => (window.location.hash = "/watchlist")}>📋 Watchlist</button>
        <button className="am-btn am-btn-purple am-btn-sm" onClick={() => (window.location.hash = "/search")}>🔍 Search</button>
        <button className="am-btn am-btn-coral am-btn-sm"  onClick={() => (window.location.hash = "/quiz")}>📝 Quiz</button>
        <button className="am-btn am-btn-ghost am-btn-sm"  onClick={() => { localStorage.removeItem("username"); window.location.hash = "/"; }}>Logout</button>
      </nav>

      {/* Welcome */}
      <div style={{ marginBottom: "24px" }}>
        <h1>Welcome back, <span style={{ color: "var(--coral)" }}>{user.username}</span>!</h1>
        <p style={{ marginTop: "4px", fontSize: "13px" }}>{user.email} · Age {user.age} · {user.gender}</p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="am-stats">
          <div className="am-stat am-stat--coral">
            <div className="am-stat__val">{stats.totalSaved}</div>
            <div className="am-stat__lbl">Saved</div>
          </div>
          <div className="am-stat am-stat--teal">
            <div className="am-stat__val">{stats.totalWatched}</div>
            <div className="am-stat__lbl">Watched</div>
          </div>
          <div className="am-stat am-stat--yellow">
            <div className="am-stat__val">{stats.avgRating ?? "—"}</div>
            <div className="am-stat__lbl">Avg Rating</div>
          </div>
          <div className="am-stat am-stat--purple">
            <div className="am-stat__val" style={{ fontSize: "16px", paddingTop: "4px" }}>{stats.topGenre ?? "—"}</div>
            <div className="am-stat__lbl">Top Genre</div>
          </div>
        </div>
      )}

      {/* Recently Saved */}
      <div className="am-section-header" style={{ marginTop: "32px" }}>
        <h2>Recently Saved</h2>
        {savedAnime.length > 6 && (
          <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => (window.location.hash = "/watchlist")}>
            View all →
          </button>
        )}
      </div>

      {loadingAnime ? (
        <div className="am-loading">Loading saved anime...</div>
      ) : savedAnime.length === 0 ? (
        <div className="am-empty">
          <h3>Nothing saved yet</h3>
          <p>Take the quiz or search for anime to get started!</p>
          <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "16px" }}>
            <button className="am-btn am-btn-coral" onClick={() => (window.location.hash = "/quiz")}>📝 Take Quiz</button>
            <button className="am-btn am-btn-purple" onClick={() => (window.location.hash = "/search")}>🔍 Search</button>
          </div>
        </div>
      ) : (
        <div className="am-grid">
          {savedAnime.slice(0, 6).map((anime) => (
            <AnimeCard
              key={anime.animeId || anime.id}
              anime={{ ...anime, id: anime.animeId }}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;