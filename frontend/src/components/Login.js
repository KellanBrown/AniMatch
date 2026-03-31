import React, { useState } from "react";
import Layout from "./Layout";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("/login", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.message || "Login failed");
        return;
      }

      localStorage.setItem("username", username);
      alert(data.message);

      window.location.href = "/dashboard";

    } catch (err) {
      console.error(err);
      alert("Server error. Please try again.");
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