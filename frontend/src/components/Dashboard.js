import React, { useEffect, useState } from "react";

function Dashboard() {
  const [user, setUser] = useState(null);
  const [recommendations, setRecommendations] = useState([]);

  useEffect(() => {
    const username = localStorage.getItem("username");

    if (!username) {
      // Redirect to login if not logged in
      window.location.href = "/";
      return;
    }

    fetch(`http://localhost:5000/dashboard/${username}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch dashboard");
        return res.json();
      })
      .then((data) => {
        if (data.user) {
          setUser(data.user);
          setRecommendations(data.recommendations || []);
        } else {
          console.error("No user returned");
        }
      })
      .catch((err) => console.error("Error fetching dashboard:", err));
  }, []);

  if (!user) return <p>Loading your profile...</p>;

  return (
    <div className="dashboard">
      <h1>Welcome, {user.username}!</h1>

      <div className="profile-info">
        <p><strong>Email:</strong> {user.email}</p>
        <p><strong>Age:</strong> {user.age}</p>
        <p><strong>Gender:</strong> {user.gender}</p>
      </div>

      {/* Buttons */}
      <div style={{ margin: "10px 0" }}>
        <button
          onClick={() => {
            localStorage.removeItem("username");
            window.location.href = "/";
          }}
          style={{ marginRight: "10px" }}
        >
          Logout
        </button>

        <button 
          onClick={() => window.location.href = "/search"}
          style={{ marginRight: "10px" }}
        >
          🔍 Search Anime
        </button>

        <button
          onClick={() => window.location.href = "/quiz"}
        >
          📝 Take Recommendation Quiz
        </button>
      </div>

      <h2>Your Personalized Recommendations</h2>
      <ul>
        {recommendations.length === 0 ? (
          <p>No recommendations yet. Take the quiz!</p>
        ) : (
          recommendations.map((rec) => (
            <li key={rec.id}>
              {rec.title} — Score: {rec.rating || rec.score}
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default Dashboard;
