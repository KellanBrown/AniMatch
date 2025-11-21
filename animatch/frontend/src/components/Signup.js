import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Layout from "./Layout";

function Signup() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    username: "",
    email: "",
    age: "",
    gender: "",
    password: "",
    confirmPassword: ""
  });

  function updateField(e) {
    setForm({
      ...form,
      [e.target.name]: e.target.value
    });
  }

  const handleSignup = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      alert("Passwords do not match.");
      return;
    }

    const res = await fetch("http://127.0.0.1:5000/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form)
    });

    const data = await res.json();
    alert(data.message);

    if (res.ok) {
      navigate("/"); // back to login
    }
  };

  return (
    <Layout>
      <div className="login-container">
        <h1>Create Your Account</h1>

        <form onSubmit={handleSignup}>
          <input
            name="username"
            placeholder="Username"
            value={form.username}
            onChange={updateField}
            required
          />

          <input
            name="email"
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={updateField}
            required
          />

          <input
            name="age"
            type="number"
            placeholder="Age"
            value={form.age}
            onChange={updateField}
            required
          />

          <select
            name="gender"
            value={form.gender}
            onChange={updateField}
            required
          >
            <option value="">Gender</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="nonbinary">Non-binary</option>
            <option value="other">Other</option>
            <option value="prefer_not">Prefer not to say</option>
          </select>

          <input
            name="password"
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={updateField}
            required
          />

          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            value={form.confirmPassword}
            onChange={updateField}
            required
          />

          <button type="submit">Create Account</button>
        </form>

        <button className="toggle-btn" onClick={() => navigate("/")}>
          Already have an account? Login
        </button>
      </div>
    </Layout>
  );
}

export default Signup;
