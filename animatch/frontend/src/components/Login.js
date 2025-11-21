import React, { useState } from "react";
import Layout from "./Layout";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();

    const res = await fetch("http://127.0.0.1:5000/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
      // ✅ Save username so Dashboard knows who is logged in
      localStorage.setItem("username", username);

      // Redirect to dashboard
      window.location.href = "/dashboard";
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
