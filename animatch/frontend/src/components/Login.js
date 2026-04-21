import React, { useState } from "react";
import { useToast } from "./Toast";

const API = "https://animatch-ofks.onrender.com";

function Login() {
  const [view, setView]         = useState("login"); // "login" | "forgot" | "reset"
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [email, setEmail]       = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [tokenDisplay, setTokenDisplay] = useState(null);
  const [loading, setLoading]   = useState(false);
  const toast = useToast();

  // ---- Login ----
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch(`${API}/login`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (!res.ok) { toast(data.message || "Login failed", "error"); setLoading(false); return; }
      localStorage.setItem("username", username);
      toast(`Welcome back, ${username}!`, "success");
      setTimeout(() => { window.location.hash = "/dashboard"; }, 800);
    } catch (err) {
      toast("Server error. Please try again.", "error");
      setLoading(false);
    }
  };

  // ---- Forgot password ----
  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res  = await fetch(`${API}/forgot-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (res.ok && data.resetToken) {
        // Show the token on screen (in production this would be emailed)
        setTokenDisplay(data);
        toast("Reset token generated!", "success");
      } else {
        toast(data.message || "Check your email.", "info");
      }
    } catch (err) {
      toast("Server error.", "error");
    }
    setLoading(false);
  };

  // ---- Reset password ----
  const handleReset = async (e) => {
    e.preventDefault();
    if (newPassword.length < 6) { toast("Password must be at least 6 characters.", "error"); return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/reset-password`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: resetToken, newPassword })
      });
      const data = await res.json();
      if (res.ok) {
        toast("Password reset! You can now log in.", "success");
        setView("login");
        setResetToken("");
        setNewPassword("");
        setTokenDisplay(null);
      } else {
        toast(data.message || "Reset failed.", "error");
      }
    } catch (err) {
      toast("Server error.", "error");
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "24px" }}>

      <div className="am-logo" style={{ fontSize: "2.8rem", marginBottom: "8px" }}>
        <span className="ani">Ani</span><span className="match">Match</span>
      </div>
      <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "36px", textAlign: "center" }}>
        Your personal anime universe
      </p>

      <div className="am-auth-card" style={{ width: "100%", maxWidth: "400px" }}>

        {/* ---- LOGIN ---- */}
        {view === "login" && (
          <>
            <h2 style={{ marginBottom: "4px" }}>Welcome back</h2>
            <p style={{ fontSize: "13px", marginBottom: "24px" }}>Sign in to your account</p>
            <form onSubmit={handleLogin} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="am-field">
                <label>Username</label>
                <input className="am-input" placeholder="your_username" value={username} onChange={e => setUsername(e.target.value)} required autoComplete="username" />
              </div>
              <div className="am-field">
                <label>Password</label>
                <input className="am-input" type="password" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required autoComplete="current-password" />
              </div>
              <button type="submit" className="am-btn am-btn-coral am-btn-full" style={{ marginTop: "6px", height: "44px", fontSize: "15px" }} disabled={loading}>
                {loading ? "Signing in..." : "Sign In"}
              </button>
            </form>
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px", alignItems: "center" }}>
              <button className="am-btn am-btn-ghost" style={{ fontSize: "12px", border: "none", color: "var(--text-dim)" }} onClick={() => setView("forgot")}>
                Forgot your password?
              </button>
              <button className="am-btn am-btn-ghost" style={{ fontSize: "13px", border: "none", color: "var(--purple)" }} onClick={() => (window.location.hash = "/signup")}>
                Don't have an account? <strong>Sign up →</strong>
              </button>
            </div>
          </>
        )}

        {/* ---- FORGOT PASSWORD ---- */}
        {view === "forgot" && !tokenDisplay && (
          <>
            <h2 style={{ marginBottom: "4px" }}>Reset Password</h2>
            <p style={{ fontSize: "13px", marginBottom: "24px" }}>Enter the email you signed up with</p>
            <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="am-field">
                <label>Email</label>
                <input className="am-input" type="email" placeholder="you@example.com" value={email} onChange={e => setEmail(e.target.value)} required />
              </div>
              <button type="submit" className="am-btn am-btn-coral am-btn-full" style={{ height: "44px" }} disabled={loading}>
                {loading ? "Generating..." : "Generate Reset Token"}
              </button>
            </form>
            <div style={{ marginTop: "12px", textAlign: "center" }}>
              <button className="am-btn am-btn-ghost" style={{ fontSize: "13px", border: "none", color: "var(--purple)" }} onClick={() => setView("login")}>
                ← Back to login
              </button>
            </div>
          </>
        )}

        {/* ---- TOKEN DISPLAY (would be emailed in production) ---- */}
        {view === "forgot" && tokenDisplay && (
          <>
            <h2 style={{ marginBottom: "8px", color: "var(--teal)" }}>Token Generated!</h2>
            <p style={{ fontSize: "12px", marginBottom: "12px" }}>
              Copy this token and use it below to set your new password. In a future update this will be sent to your email automatically.
            </p>
            <div style={{
              background: "var(--surface3)", border: "1px solid var(--border-hover)",
              borderRadius: "var(--radius-sm)", padding: "10px 14px",
              fontFamily: "monospace", fontSize: "11px", wordBreak: "break-all",
              color: "var(--teal)", marginBottom: "14px", userSelect: "all"
            }}>
              {tokenDisplay.resetToken}
            </div>
            <p style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "16px" }}>
              For: <strong style={{ color: "var(--text)" }}>{tokenDisplay.username}</strong> · Valid for 1 hour
            </p>
            <button className="am-btn am-btn-coral am-btn-full" onClick={() => { setResetToken(tokenDisplay.resetToken); setView("reset"); }}>
              Continue to Reset →
            </button>
          </>
        )}

        {/* ---- RESET PASSWORD ---- */}
        {view === "reset" && (
          <>
            <h2 style={{ marginBottom: "4px" }}>New Password</h2>
            <p style={{ fontSize: "13px", marginBottom: "24px" }}>Enter your reset token and a new password</p>
            <form onSubmit={handleReset} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
              <div className="am-field">
                <label>Reset Token</label>
                <input className="am-input" placeholder="Paste token here" value={resetToken} onChange={e => setResetToken(e.target.value)} required style={{ fontFamily: "monospace", fontSize: "11px" }} />
              </div>
              <div className="am-field">
                <label>New Password</label>
                <input className="am-input" type="password" placeholder="At least 6 characters" value={newPassword} onChange={e => setNewPassword(e.target.value)} required />
              </div>
              <button type="submit" className="am-btn am-btn-coral am-btn-full" style={{ height: "44px" }} disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </button>
            </form>
            <div style={{ marginTop: "12px", textAlign: "center" }}>
              <button className="am-btn am-btn-ghost" style={{ fontSize: "13px", border: "none", color: "var(--purple)" }} onClick={() => setView("login")}>
                ← Back to login
              </button>
            </div>
          </>
        )}
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", justifyContent: "center", marginTop: "32px" }}>
        {["Action", "Fantasy", "Romance", "Horror", "SciFi", "Comedy", "Drama"].map(g => (
          <span key={g} style={{ padding: "4px 12px", borderRadius: "20px", background: "var(--surface)", border: "1px solid var(--border)", fontSize: "12px", color: "var(--text-dim)", fontWeight: 700 }}>{g}</span>
        ))}
      </div>
    </div>
  );
}

export default Login;