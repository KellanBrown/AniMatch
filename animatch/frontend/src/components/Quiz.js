import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const questions = [
  { question: "What's your current mood?",            options: ["Excited", "Chill", "Adventurous", "Romantic", "Sad", "Comedic"] },
  { question: "What genre are you feeling?",          options: ["Action", "Romance", "Fantasy", "Comedy", "Horror", "Drama", "SciFi"] },
  { question: "How long of a series do you want?",    options: ["Short (<25 episodes)", "Medium (25-50)", "Long (50+)"] },
  { question: "Popular hits or hidden gems?",         options: ["Popular", "Hidden Gems"] }
];

function Quiz() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const navigate = useNavigate();

  const handleAnswer = (answer) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      navigate("/recommendations", { state: { answers: newAnswers } });
    }
  };

  return (
    <div className="am-page">

      {/* Nav */}
      <nav className="am-nav">
        <div className="am-logo"><span className="ani">Ani</span><span className="match">Match</span></div>
        <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => navigate("/dashboard")}>⬅ Dashboard</button>
      </nav>

      <div className="am-quiz-wrap">

        {/* Progress dots */}
        <div className="am-quiz-progress">
          {questions.map((_, i) => (
            <div
              key={i}
              className={`am-quiz-dot ${i < current ? "done" : i === current ? "current" : ""}`}
            />
          ))}
        </div>

        <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "12px" }}>
          Question {current + 1} of {questions.length}
        </p>

        <div className="am-quiz-q">{questions[current].question}</div>

        <div className="am-quiz-options">
          {questions[current].options.map((opt, idx) => (
            <button
              key={idx}
              className="am-quiz-opt"
              onClick={() => handleAnswer(opt)}
            >
              {opt}
            </button>
          ))}
        </div>

      </div>
    </div>
  );
}

export default Quiz;