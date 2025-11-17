import React, { useState, useEffect } from "react";
import "./App.css";
import sakuraImg from './assets/single-cherry-blossom-petal-11563245140k25ryyugul.png';
import SearchComponent from "./components/SearchComponent";

function App() {
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [isSignup, setIsSignup] = useState(false);
  const [petals, setPetals] = useState([]);

  useEffect(() => {
    const numPetals = 40;
    const newPetals = [];

    for (let i = 0; i < numPetals; i++) {
      newPetals.push({
        id: i,
        left: Math.random() * 100, // vw
        size: 15 + Math.random() * 15, // smaller petals 15-30px
        opacity: 0.5 + Math.random() * 0.5,
        fallDuration: 6 + Math.random() * 6, // 6-12s
        driftDuration: 4 + Math.random() * 4, // 4-8s
        rotateDuration: 4 + Math.random() * 4, // 4-8s
        delay: Math.random() * 10
      });
    }

    setPetals(newPetals);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const route = isSignup ? "signup" : "login";

    const response = await fetch(`http://127.0.0.1:5000/${route}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: name, password: password }),
    });

    const data = await response.json();
    alert(data.message);
  };

  return (
    <>
      <div className="anime-bg"></div>
      <div className="bg-overlay"></div>
      <div className="App">
        <SearchComponent />
      </div>
      {petals.map((petal) => (
        <div
          key={petal.id}
          className="sakura"
          style={{
            left: `${petal.left}vw`,
            width: `${petal.size}px`,
            height: `${petal.size}px`,
            opacity: petal.opacity,
            backgroundImage: `url(${sakuraImg})`,
            animation: `
              fall ${petal.fallDuration}s linear infinite ${petal.delay}s,
              drift ${petal.driftDuration}s ease-in-out infinite ${petal.delay}s,
              rotate ${petal.rotateDuration}s linear infinite ${petal.delay}s
            `
          }}
        />
      ))}

      <div className="login-container">
        <h1>AniMatch</h1>
        <p>The anime recommendation experience begins here.</p>

        <form onSubmit={handleSubmit}>
          <input
            placeholder="Username"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button type="submit">
            {isSignup ? "Create Account" : "Login"}
          </button>
        </form>

        <button
          className="toggle-btn"
          onClick={() => setIsSignup(!isSignup)}
        >
          {isSignup
            ? "Already have an account? Login"
            : "Don't have an account? Sign up"}
        </button>
      </div>
    </>
  );
}

export default App;
