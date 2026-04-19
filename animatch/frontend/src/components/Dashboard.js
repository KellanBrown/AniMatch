import React, { useEffect, useState } from "react";
import AnimeCard from "./AnimeCard";

const API = "https://animatch-ofks.onrender.com";

function Dashboard() {
  const [user, setUser]                   = useState(null);
  const [savedAnime, setSavedAnime]       = useState([]);
  const [stats, setStats]                 = useState(null);
  const [personalizedRecs, setPersonalizedRecs] = useState([]);
  const [loadingRecs, setLoadingRecs]     = useState(false);
  const [loadingAnime, setLoadingAnime]   = useState(true);

  useEffect(() => {
    const username = localStorage.getItem("username");
    if (!username) { window.location.hash = "/"; return; }

    const fetchData = async () => {
      // User info
      try {
        const userRes  = await fetch(`${API}/dashboard/${username}`);
        const userData = await userRes.json();
        if (userRes.ok && userData.user) setUser(userData.user);
      } catch (err) { console.error(err); }

      // Saved anime
      try {
        const savedRes  = await fetch(`${API}/saved-anime/${username}`);
        const savedData = savedRes.ok ? await savedRes.json() : [];
        setSavedAnime(Array.isArray(savedData) ? savedData : []);
      } catch (err) { setSavedAnime([]); }

      // Stats
      try {
        const statsRes = await fetch(`${API}/user-stats/${username}`);
        if (statsRes.ok) setStats(await statsRes.json());
      } catch (err) { console.error(err); }

      setLoadingAnime(false);

      // Personalized recs — fetch after main data so it doesn't block the page
      setLoadingRecs(true);
      try {
        const recsRes = await fetch(`${API}/personalized-recs/${username}`);
        if (recsRes.ok) {
          const recsData = await recsRes.json();
          setPersonalizedRecs(Array.isArray(recsData) ? recsData : []);
        }
      } catch (err) { console.error(err); }
      setLoadingRecs(false);
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

      {/* ---- BECAUSE YOU LIKED X ---- */}
      {savedAnime.length > 0 && (
        <div style={{ marginTop: "36px" }}>
          <div className="am-section-header">
            <h2>
              Because you liked{" "}
              <span style={{ color: "var(--teal)" }}>
                {personalizedRecs[0]?.seedTitle
                  ? `"${personalizedRecs[0].seedTitle}"`
                  : "your saved anime"}
              </span>
            </h2>
          </div>

          {loadingRecs ? (
            // Loading skeletons
            <div className="am-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{
                  background: "var(--surface)", border: "1px solid var(--border)",
                  borderRadius: "var(--radius-lg)", overflow: "hidden",
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
          ) : personalizedRecs.length === 0 ? (
            <div className="am-empty" style={{ padding: "24px" }}>
              <p>Rate some of your saved anime to get personalized picks!</p>
            </div>
          ) : (
            <>
              {/* Group recs by seed title so user sees "because you liked X" per group */}
              {(() => {
                // Build groups: { seedTitle -> [anime] }
                const groups = {};
                personalizedRecs.forEach(anime => {
                  const key = anime.seedTitle || "Your taste";
                  if (!groups[key]) groups[key] = [];
                  if (groups[key].length < 4) groups[key].push(anime);
                });

                return Object.entries(groups).map(([seedTitle, animes]) => (
                  <div key={seedTitle} style={{ marginBottom: "28px" }}>
                    <p style={{
                      fontSize: "12px", fontWeight: 800, letterSpacing: "0.07em",
                      textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "12px"
                    }}>
                      Because you liked <span style={{ color: "var(--purple)" }}>"{seedTitle}"</span>
                    </p>
                    <div className="am-grid">
                      {animes.map(anime => (
                        <AnimeCard key={anime.id} anime={anime} />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </>
          )}
        </div>
      )}

      {/* ---- RECENTLY SAVED PREVIEW ---- */}
      <div style={{ marginTop: "36px" }}>
        <div className="am-section-header">
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
            {savedAnime.slice(0, 6).map(anime => (
              <AnimeCard
                key={anime.animeId || anime.id}
                anime={{ ...anime, id: anime.animeId }}
              />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default Dashboard;