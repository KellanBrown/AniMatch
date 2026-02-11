import React, { useState } from "react";
import Layout from "./Layout";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    console.log("Login button clicked"); // ✅ Debug log

    try {
      console.log("Sending fetch to backend with username:", username);
      const res = await fetch("http://localhost:5000/login", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      console.log("Fetch complete. Status:", res.status);

      if (!res.ok) {
        const errorData = await res.json();
        console.error("Login failed:", errorData);
        alert(errorData.message || "Login failed");
        return;
      }

      const data = await res.json();
      console.log("Login successful. Response:", data);
      alert(data.message);

      // Save username for dashboard
      localStorage.setItem("username", username);
      console.log("Username saved in localStorage:", localStorage.getItem("username"));

      // Redirect to dashboard
      window.location.href = "/dashboard";

    } catch (err) {
      console.error("Network error:", err);
      alert("Unable to connect to server. Is the backend running?");
    }
  };

  return (
    <Layout>
      <div className="login-container">
        <h1>AniMatch</h1>
        <p>The anime recommendation experience begins here.</p>

        <form onSubmit={handleLogin}>
          <input
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            required
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit">Login</button>
        </form>

        <button
          className="toggle-btn"
          onClick={() => (window.location.href = "/signup")}
        >
          Don't have an account? Sign up
        </button>
      </div>
    </Layout>
  );
}

export default Login;
