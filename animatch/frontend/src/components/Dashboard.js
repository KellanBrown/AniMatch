import React, { useEffect, useState } from "react";

const API = "https://animatch-ofks.onrender.com";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [animeList, setAnimeList] = useState([]);

useEffect(() => {
  const username = localStorage.getItem("username");

  if (!username) {
    window.location.hash = "/";
    return;
  }

  const fetchData = () => {
    fetch(`${API}/dashboard/${username}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch dashboard");
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setAnimeList(data.recommendations || []);
        }
      })
      .catch((err) => console.error(err));
  };

  fetchData();

  // 🔥 auto-refresh every 2 seconds (simple + effective)
  const interval = setInterval(fetchData, 2000);

  return () => clearInterval(interval);
}, []);

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
      <h2>Your Anime Library</h2>

      {animeList.length === 0 ? (
        <p>No saved anime yet. Click “Save to Profile” on a card.</p>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
            gap: "20px",
            marginTop: "20px"
          }}
        >
          {animeList.map((anime) => (
            <div
              key={anime.id}
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

              <h3 style={{ fontSize: "14px" }}>{anime.title}</h3>

              <p style={{ fontSize: "12px" }}>
                ⭐ Rating: {anime.rating || "N/A"}
              </p>

              <p style={{ fontSize: "12px" }}>
                {anime.watched ? "✔ Watched" : "👀 Not Watched"}
              </p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Dashboard;