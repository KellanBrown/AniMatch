import React, { useEffect, useState } from "react";
import AnimeCard from "./AnimeCard";

const API = "https://animatch-ofks.onrender.com";

function Dashboard() {
  const [user, setUser]                         = useState(null);
  const [savedAnime, setSavedAnime]             = useState([]);
  const [stats, setStats]                       = useState(null);
  const [personalizedRecs, setPersonalizedRecs] = useState([]);
  const [loadingRecs, setLoadingRecs]           = useState(false);
  const [loadingAnime, setLoadingAnime]         = useState(true);
  const [pendingCount, setPendingCount]         = useState(0);

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
      } catch (err) {}

      // Check for pending friend requests for notification badge
      try {
        const friendRes = await fetch(`${API}/friends/${username}`);
        if (friendRes.ok) {
          const friends = await friendRes.json();
          setPendingCount(friends.filter(f => f.status === "pending" && f.direction === "received").length);
        }
      } catch (err) {}

      setLoadingAnime(false);

      setLoadingRecs(true);
      try {
        const recsRes = await fetch(`${API}/personalized-recs/${username}`);
        if (recsRes.ok) {
          const recsData = await recsRes.json();
          setPersonalizedRecs(Array.isArray(recsData) ? recsData : []);
        }
      } catch (err) {}
      setLoadingRecs(false);
    };

    fetchData();
  }, []);

  if (!user) return <div className="am-loading">Loading your profile...</div>;

  return (
    <div className="am-page">

      <nav className="am-nav">
        <div className="am-logo"><span className="ani">Ani</span><span className="match">Match</span></div>
        <button className="am-btn am-btn-teal am-btn-sm"   onClick={() => (window.location.hash = "/watchlist")}>📋 Watchlist</button>
        <button className="am-btn am-btn-purple am-btn-sm" onClick={() => (window.location.hash = "/search")}>🔍 Search</button>
        <button className="am-btn am-btn-coral am-btn-sm"  onClick={() => (window.location.hash = "/quiz")}>📝 Quiz</button>
        <button
          className="am-btn am-btn-ghost am-btn-sm"
          onClick={() => (window.location.hash = "/friends")}
          style={{ position: "relative" }}
        >
          👥 Friends
          {pendingCount > 0 && (
            <span style={{
              position: "absolute", top: "-4px", right: "-4px",
              background: "var(--coral)", color: "#fff",
              fontSize: "9px", fontWeight: 800,
              width: "16px", height: "16px", borderRadius: "50%",
              display: "flex", alignItems: "center", justifyContent: "center"
            }}>{pendingCount}</span>
          )}
        </button>
        <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => { localStorage.removeItem("username"); window.location.hash = "/"; }}>Logout</button>
      </nav>

      <div style={{ marginBottom: "24px" }}>
        <h1>Welcome back, <span style={{ color: "var(--coral)" }}>{user.username}</span>!</h1>
        <p style={{ marginTop: "4px", fontSize: "13px" }}>{user.email} · Age {user.age} · {user.gender}</p>
      </div>

      {stats && (
        <div className="am-stats">
          <div className="am-stat am-stat--coral">
            <div className="am-stat__val">{stats.totalSaved}</div>
            <div className="am-stat__lbl">Saved</div>
          </div>
          <div className="am-stat am-stat--teal">
            <div className="am-stat__val">{stats.totalWatching}</div>
            <div className="am-stat__lbl">Watching</div>
          </div>
          <div className="am-stat am-stat--purple">
            <div className="am-stat__val">{stats.totalCompleted}</div>
            <div className="am-stat__lbl">Completed</div>
          </div>
          <div className="am-stat am-stat--yellow">
            <div className="am-stat__val">{stats.avgRating ?? "—"}</div>
            <div className="am-stat__lbl">Avg Rating</div>
          </div>
          <div className="am-stat" style={{ borderColor: "rgba(255,107,74,0.2)" }}>
            <div className="am-stat__val" style={{ fontSize: stats.topGenre ? "15px" : "22px", paddingTop: stats.topGenre ? "6px" : 0, color: "var(--coral)" }}>
              {stats.topGenre ?? "—"}
            </div>
            <div className="am-stat__lbl">Top Genre</div>
          </div>
        </div>
      )}

      {/* Because you liked X */}
      {savedAnime.length > 0 && (
        <div style={{ marginTop: "36px" }}>
          <div className="am-section-header">
            <h2>
              Because you liked{" "}
              <span style={{ color: "var(--teal)" }}>
                {personalizedRecs[0]?.seedTitle ? `"${personalizedRecs[0].seedTitle}"` : "your saved anime"}
              </span>
            </h2>
          </div>

          {loadingRecs ? (
            <div className="am-grid">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: "var(--radius-lg)", overflow: "hidden", animation: "pulse 1.4s ease-in-out infinite", animationDelay: `${i * 0.1}s` }}>
                  <div style={{ height: "260px", background: "var(--surface2)" }} />
                  <div style={{ padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
                    <div style={{ height: "13px", background: "var(--surface3)", borderRadius: "4px", width: "80%" }} />
                    <div style={{ height: "11px", background: "var(--surface3)", borderRadius: "4px", width: "50%" }} />
                  </div>
                </div>
              ))}
              <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.5}}`}</style>
            </div>
          ) : personalizedRecs.length === 0 ? (
            <div className="am-empty" style={{ padding: "24px" }}>
              <p>Save and rate some anime to get personalized picks here!</p>
            </div>
          ) : (
            <>
              {(() => {
                const groups = {};
                personalizedRecs.forEach(anime => {
                  const key = anime.seedTitle || "Your taste";
                  if (!groups[key]) groups[key] = [];
                  if (groups[key].length < 4) groups[key].push(anime);
                });
                return Object.entries(groups).map(([seedTitle, animes]) => (
                  <div key={seedTitle} style={{ marginBottom: "28px" }}>
                    <p style={{ fontSize: "12px", fontWeight: 800, letterSpacing: "0.07em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "12px" }}>
                      Because you liked <span style={{ color: "var(--purple)" }}>"{seedTitle}"</span>
                    </p>
                    <div className="am-grid">
                      {animes.map(anime => (
                        <AnimeCard key={anime.id} anime={anime} hideSimilar={false} />
                      ))}
                    </div>
                  </div>
                ));
              })()}
            </>
          )}
        </div>
      )}

      {/* Recently Saved */}
      <div style={{ marginTop: "36px" }}>
        <div className="am-section-header">
          <h2>Recently Saved</h2>
          {savedAnime.length > 6 && (
            <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => (window.location.hash = "/watchlist")}>View all →</button>
          )}
        </div>

        {loadingAnime ? (
          <div className="am-loading">Loading saved anime...</div>
        ) : savedAnime.length === 0 ? (
          <div className="am-empty">
            <h3>Nothing saved yet</h3>
            <p>Take the quiz or search for anime to get started!</p>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "16px" }}>
              <button className="am-btn am-btn-coral"  onClick={() => (window.location.hash = "/quiz")}>📝 Take Quiz</button>
              <button className="am-btn am-btn-purple" onClick={() => (window.location.hash = "/search")}>🔍 Search</button>
            </div>
          </div>
        ) : (
          <div className="am-grid">
            {savedAnime.slice(0, 6).map(anime => (
              <AnimeCard key={anime.animeId || anime.id} anime={{ ...anime, id: anime.animeId }} hideSimilar={true} />
            ))}
          </div>
        )}
      </div>

    </div>
  );
}

export default Dashboard;