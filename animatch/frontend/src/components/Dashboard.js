import React, { useEffect, useState } from "react";

const API = "https://animatch-ofks.onrender.com";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [savedAnime, setSavedAnime] = useState([]);
  const [loadingAnime, setLoadingAnime] = useState(true);

  useEffect(() => {
    const username = localStorage.getItem("username");

    if (!username) {
      window.location.hash = "/";
      return;
    }

    const fetchData = async () => {
      try {
        // ---------------- USER INFO ----------------
        const userRes = await fetch(`${API}/dashboard/${username}`);
        const userData = await userRes.json();

        if (userRes.ok && userData.user) {
          setUser(userData.user);
        }

      } catch (err) {
        console.error("User fetch error:", err);
      }

      try {
        // ---------------- SAVED ANIME ----------------
        const savedRes = await fetch(`${API}/saved-anime/${username}`);

        // IMPORTANT: prevent crash if endpoint doesn't exist yet
        if (!savedRes.ok) {
          console.warn("Saved anime endpoint missing or broken");
          setSavedAnime([]);
          setLoadingAnime(false);
          return;
        }

        const savedData = await savedRes.json();
        setSavedAnime(Array.isArray(savedData) ? savedData : []);

      } catch (err) {
        console.error("Saved anime fetch error:", err);
        setSavedAnime([]);
      }

      setLoadingAnime(false);
    };

    fetchData();
  }, []);

  // ---------------- SAFE RENDER GUARD ----------------
  if (!user) return <p>Loading your profile...</p>;

  return (
    <div className="dashboard" style={{ padding: "20px" }}>
      <h1>Welcome, {user.username}!</h1>

      {/* ---------------- PROFILE INFO ---------------- */}
      <div className="profile-info">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Age:</strong> {user.age}</p>
        <p><strong>Gender:</strong> {user.gender}</p>
      </div>

      {/* ---------------- NAV BUTTONS ---------------- */}
      <div style={{ margin: "15px 0" }}>
        <button
          onClick={() => {
            localStorage.removeItem("username");
            window.location.hash = "/";
          }}
        >
          Logout
        </button>

        <button onClick={() => (window.location.hash = "/search")}>
          🔍 Search Anime
        </button>

        <button onClick={() => (window.location.hash = "/quiz")}>
          📝 Take Quiz
        </button>
      </div>

      {/* ---------------- SAVED ANIME ---------------- */}
      <h2>Your Saved Anime</h2>

      {loadingAnime ? (
        <p>Loading saved anime...</p>
      ) : savedAnime.length === 0 ? (
        <p>No saved anime yet. Click “Save to Profile” on an anime card.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "20px",
            marginTop: "20px"
          }}
        >
          {savedAnime.map((anime) => (
            <div
              key={anime.animeId || anime.id}
              style={{
                border: "1px solid #ddd",
                borderRadius: "10px",
                padding: "10px"
              }}
            >
              <a href={anime.url} target="_blank" rel="noreferrer">
                <img
                  src={anime.image}
                  alt={anime.title}
                  style={{
                    width: "100%",
                    height: "250px",
                    objectFit: "cover",
                    borderRadius: "8px"
                  }}
                />
              </a>

              <h3 style={{ fontSize: "14px" }}>
                {anime.title}
              </h3>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;