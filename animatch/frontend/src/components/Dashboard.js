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

    fetch(`http://127.0.0.1:5000/dashboard/${username}`)
      .then((res) => res.json())
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

      {/* Logout button */}
      <button
        onClick={() => {
          localStorage.removeItem("username");
          window.location.href = "/";
        }}
      >
        Logout
      </button>

      {/* Search button */}
      <button 
        className="search-btn" 
        onClick={() => window.location.href = "/search"}
      >
        🔍 Search for Anime
      </button>

      <h2>Your Personalized Recommendations</h2>
      <ul>
        {recommendations.map((rec, idx) => (
          <li key={idx}>
            {rec.title} — Score: {rec.score}
          </li>
        ))}
      </ul>
    </div>
  );
}

export default Dashboard;
