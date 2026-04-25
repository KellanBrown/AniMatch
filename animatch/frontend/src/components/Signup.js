import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "./Toast";

// Signup component handles creating a new user account
function Signup() {
  const navigate = useNavigate(); // used for redirecting after signup
  const toast    = useToast();    // custom hook for showing notifications

  // stores all form input values
  const [form, setForm] = useState({
    username: "",
    email: "",
    age: "",
    gender: "",
    password: "",
    confirmPassword: ""
  });

  // controls loading state for submit button
  const [loading, setLoading] = useState(false);

  // updates a specific field in the form state
  const updateField = e =>
    setForm({ ...form, [e.target.name]: e.target.value });

  // handles form submission and communicates with backend
  const handleSignup = async (e) => {
    e.preventDefault(); // prevent default form refresh

    // ensure passwords match
    if (form.password !== form.confirmPassword) {
      toast("Passwords do not match.", "error");
      return;
    }

    // enforce minimum password length
    if (form.password.length < 6) {
      toast("Password must be at least 6 characters.", "error");
      return;
    }

    setLoading(true); // enable loading state

    try {
      // send POST request to backend signup endpoint
      const res = await fetch("https://animatch-ofks.onrender.com/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: form.username,
          email: form.email,
          age: form.age,
          gender: form.gender,
          password: form.password
        })
      });

      const data = await res.json();

      // handle server-side validation errors
      if (!res.ok) {
        toast(data.message || "Signup failed", "error");
        setLoading(false);
        return;
      }

      // success message and redirect to login page
      toast("Account created! Welcome to AniMatch 🎌", "success");
      setTimeout(() => navigate("/"), 1000);

    } catch (err) {
      // handle network or unexpected errors
      console.error(err);
      toast("Server error. Please try again.", "error");
      setLoading(false);
    }
  };

  // shared style adjustment for form fields
  const inputStyle = { marginBottom: 0 };

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px"
      }}
    >
      {/* application logo */}
      <div className="am-logo" style={{ fontSize: "2.8rem", marginBottom: "8px" }}>
        <span className="ani">Ani</span>
        <span className="match">Match</span>
      </div>

      {/* page subtitle */}
      <p style={{ color: "var(--text-muted)", fontSize: "14px", marginBottom: "28px" }}>
        Create your account and start exploring
      </p>

      {/* main signup card */}
      <div className="am-auth-card" style={{ width: "100%", maxWidth: "420px" }}>
        <h2 style={{ marginBottom: "4px" }}>Join AniMatch</h2>
        <p style={{ fontSize: "13px", marginBottom: "22px" }}>
          Fill in your details below
        </p>

        {/* signup form */}
        <form
          onSubmit={handleSignup}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px"
          }}
        >

          {/* username and age fields in a grid layout */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div className="am-field" style={inputStyle}>
              <label>Username</label>
              <input
                className="am-input"
                name="username"
                placeholder="cool_username"
                value={form.username}
                onChange={updateField}
                required
              />
            </div>

            <div className="am-field" style={inputStyle}>
              <label>Age</label>
              <input
                className="am-input"
                name="age"
                type="number"
                placeholder="18"
                value={form.age}
                onChange={updateField}
                required
                min="1"
                max="120"
              />
            </div>
          </div>

          {/* email input field */}
          <div className="am-field" style={inputStyle}>
            <label>Email</label>
            <input
              className="am-input"
              name="email"
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={updateField}
              required
            />
          </div>

          {/* gender dropdown selection */}
          <div className="am-field" style={inputStyle}>
            <label>Gender</label>
            <select
              className="am-input"
              name="gender"
              value={form.gender}
              onChange={updateField}
              required
              style={{ cursor: "pointer" }}
            >
              <option value="">Select gender</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="nonbinary">Non-binary</option>
              <option value="other">Other</option>
              <option value="prefer_not">Prefer not to say</option>
            </select>
          </div>

          {/* password and confirm password fields */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
            <div className="am-field" style={inputStyle}>
              <label>Password</label>
              <input
                className="am-input"
                name="password"
                type="password"
                placeholder="••••••••"
                value={form.password}
                onChange={updateField}
                required
              />
            </div>

            <div className="am-field" style={inputStyle}>
              <label>Confirm</label>
              <input
                className="am-input"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={form.confirmPassword}
                onChange={updateField}
                required
              />
            </div>
          </div>

          {/* real-time password match feedback */}
          {form.confirmPassword && (
            <p
              style={{
                fontSize: "11px",
                fontWeight: 700,
                marginTop: "-4px",
                color:
                  form.password === form.confirmPassword
                    ? "var(--teal)"
                    : "var(--red)"
              }}
            >
              {form.password === form.confirmPassword
                ? "✓ Passwords match"
                : "✗ Passwords don't match"}
            </p>
          )}

          {/* submit button */}
          <button
            type="submit"
            className="am-btn am-btn-coral am-btn-full"
            style={{ marginTop: "6px", height: "44px", fontSize: "15px" }}
            disabled={loading}
          >
            {loading ? "Creating account..." : "Create Account"}
          </button>
        </form>

        {/* navigation link to login page */}
        <div style={{ marginTop: "20px", textAlign: "center" }}>
          <button
            className="am-btn am-btn-ghost"
            style={{ fontSize: "13px", border: "none", color: "var(--purple)" }}
            onClick={() => navigate("/")}
          >
            Already have an account? <strong>Sign in →</strong>
          </button>
        </div>
      </div>
    </div>
  );
}

export default Signup;