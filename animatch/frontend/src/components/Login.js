import React, { useState } from "react";
import { useToast } from "./Toast";

function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const toast = useToast();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res  = await fetch("https://animatch-ofks.onrender.com/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();

      if (!res.ok) {
        toast(data.message || "Login failed", "error");
        setLoading(false);
        return;
      }

      localStorage.setItem("username", username);
      toast(`Welcome back, ${username}!`, "success");
      setTimeout(() => { window.location.hash = "/dashboard"; }, 800);

    } catch (err) {
      console.error(err);
      toast("Server error. Please try again.", "error");
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>

      {/* Logo */}
      <div className="am-logo" style={{ fontSize: "2.8rem", marginBottom: "8px" }}>
        <span className="ani">Ani</span><span className="match">Match</span>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "36px", textAlign: "center" }}>
        Your personal anime universe
      </p>

      <div className="am-auth-card" style={{ width: "100%", maxWidth: "400px" }}>
        <h2 style={{ marginBottom: "4px" }}>Welcome back</h2>
        <p style={{ fontSize: "13px", marginBottom: "24px" }}>Sign in to your account</p>

        <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div className="am-field">
            <label>Username</label>
            <input
              className="am-input"
              placeholder="your_username"
              value={username}
              onChange={e => setUsername(e.target.value)}
              required
              autoComplete="username"
            />
          </div>

          <div className="am-field">
            <label>Password</label>
            <input
              className="am-input"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
          </div>

          <button
            type="submit"
            className="am-btn am-btn-coral am-btn-full"
            style={{ marginTop: "6px", height: "44px", fontSize: "15px" }}
            disabled={loading}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button
            className="am-btn am-btn-ghost"
            style={{ fontSize: "13px", border: "none", color: "var(--purple)" }}
            onClick={() => (window.location.hash = "/signup")}
          >
            Don't have an account? <strong>Sign up →</strong>
          </button>
        </div>
      </div>

      {/* Decorative tags */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginTop: "32px" }}>
        {["Action", "Fantasy", "Romance", "Horror", "SciFi", "Comedy", "Drama"].map(g => (
          <span key={g} style={{
            padding: "4px 12px", borderRadius: "20px",
            background: "var(--surface)", border: "1px solid var(--border)",
            fontSize: "12px", color: "var(--text-dim)", fontWeight: 700
          }}>{g}</span>
        ))}
      </div>

    </div>
  );
}

export default Login;