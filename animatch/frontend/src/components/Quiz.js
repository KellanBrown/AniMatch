import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";

const API = "https://animatch-ofks.onrender.com";

// The five quiz questions in order. "choice" questions render as buttons;
// "text" questions render a search input with autocomplete.
const questions = [
  {
    question: "What's your current mood?",
    options: ["Excited", "Chill", "Adventurous", "Romantic", "Sad", "Comedic"],
    type: "choice"
  },
  {
    question: "What genre are you feeling?",
    options: ["Action", "Romance", "Fantasy", "Comedy", "Horror", "Drama", "SciFi"],
    type: "choice"
  },
  {
    question: "How long of a series do you want?",
    options: ["Short (<25 episodes)", "Medium (25-50)", "Long (50+)", "No preference"],
    type: "choice"
  },
  {
    question: "Popular hits or hidden gems?",
    options: ["Popular", "Hidden Gems", "Either"],
    type: "choice"
  },
  {
    question: "Name an anime you already love (optional)",
    type: "text",
    placeholder: "e.g. Attack on Titan, Naruto, Your Lie in April...",
    skipLabel: "Skip this one"
  }
];

function Quiz() {
  const [current, setCurrent]         = useState(0);
  const [answers, setAnswers]         = useState([]);
  const [textInput, setTextInput]     = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching]     = useState(false);
  const debounceRef = useRef(null); // debounce timer for the anime search input
  const navigate    = useNavigate();

  const q = questions[current];

  // Records the answer and immediately advances to the next question
  const handleChoice = (answer) => {
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);
    setCurrent(current + 1);
  };

  // Fires on every keystroke in the seed anime input. Waits 300ms before
  // searching so we're not hitting the API on every character.
  const handleTextInput = (e) => {
    const value = e.target.value;
    setTextInput(value);
    clearTimeout(debounceRef.current);

    if (value.length < 2) { setSuggestions([]); return; }

    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res  = await fetch(`${API}/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (Array.isArray(data)) setSuggestions(data.slice(0, 5));
      } catch (err) { console.error(err); }
      setSearching(false);
    }, 300);
  };

  // When the user picks from the dropdown, encode the anime's ID and title into
  // a special answer string the recommendations page knows how to parse
  const pickSuggestion = (anime) => {
    setSuggestions([]);
    finishQuiz([...answers, `__seed__${anime.id}__${anime.title}`]);
  };

  // Q5 is optional — skipping it sends a sentinel value so the recs page knows
  // not to expect a seed anime
  const handleSkip = () => {
    finishQuiz([...answers, "__noseed__"]);
  };

  const handleTextSubmit = (e) => {
    e.preventDefault();
    if (!textInput.trim()) { handleSkip(); return; }
    // If the user typed something but didn't pick a suggestion, use the top result.
    // If there are no suggestions yet, send the raw title and let the backend search for it.
    if (suggestions.length > 0) {
      pickSuggestion(suggestions[0]);
    } else {
      finishQuiz([...answers, `__seedtitle__${textInput.trim()}`]);
    }
  };

  const finishQuiz = (finalAnswers) => {
    navigate("/recommendations", { state: { answers: finalAnswers } });
  };

  return (
    <div className="am-page">
      <nav className="am-nav">
        <div className="am-logo"><span className="ani">Ani</span><span className="match">Match</span></div>
        <button className="am-btn am-btn-ghost am-btn-sm" onClick={() => navigate("/dashboard")}>⬅ Profile</button>
      </nav>

      <div className="am-quiz-wrap">

        {/* Progress dots — filled teal for completed, coral for current, grey for upcoming */}
        <div className="am-quiz-progress">
          {questions.map((_, i) => (
            <div key={i} className={`am-quiz-dot ${i < current ? "done" : i === current ? "current" : ""}`} />
          ))}
        </div>

        <p style={{ fontSize: "12px", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-dim)", marginBottom: "12px" }}>
          Question {current + 1} of {questions.length}
        </p>

        <div className="am-quiz-q">{q.question}</div>

        {q.type === "choice" && (
          <div className="am-quiz-options">
            {q.options.map((opt, idx) => (
              <button key={idx} className="am-quiz-opt" onClick={() => handleChoice(opt)}>
                {opt}
              </button>
            ))}
          </div>
        )}

        {q.type === "text" && (
          <form onSubmit={handleTextSubmit} style={{ width: "100%", marginTop: "8px" }}>
            <div style={{ position: "relative" }}>
              <input
                className="am-input"
                placeholder={q.placeholder}
                value={textInput}
                onChange={handleTextInput}
                autoComplete="off"
                style={{ fontSize: "14px", height: "48px", paddingLeft: "16px" }}
              />

              {suggestions.length > 0 && (
                <div style={{
                  position: "absolute", top: "calc(100% + 4px)", left: 0, right: 0,
                  background: "var(--surface2)", border: "1px solid var(--border-hover)",
                  borderRadius: "var(--radius-md)", overflow: "hidden", zIndex: 100,
                  textAlign: "left"
                }}>
                  {suggestions.map(a => (
                    <div
                      key={a.id}
                      onClick={() => pickSuggestion(a)}
                      style={{
                        padding: "10px 14px", cursor: "pointer", fontSize: "13px",
                        color: "var(--text)", borderBottom: "1px solid var(--border)",
                        display: "flex", alignItems: "center", gap: "10px", transition: "background 0.1s"
                      }}
                      onMouseEnter={e => e.currentTarget.style.background = "var(--surface3)"}
                      onMouseLeave={e => e.currentTarget.style.background = "transparent"}
                    >
                      {a.image && (
                        <img src={a.image} alt="" style={{ width: "28px", height: "40px", objectFit: "cover", borderRadius: "4px" }} />
                      )}
                      <div>
                        <div style={{ fontWeight: 700 }}>{a.title}</div>
                        {a.rating && a.rating !== "N/A" && (
                          <div style={{ fontSize: "11px", color: "var(--yellow)" }}>★ {a.rating}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {searching && (
              <p style={{ fontSize: "12px", color: "var(--text-dim)", marginTop: "8px" }}>Searching...</p>
            )}

            <div style={{ display: "flex", gap: "10px", marginTop: "14px", justifyContent: "center" }}>
              <button type="submit" className="am-btn am-btn-coral" style={{ minWidth: "140px" }}>
                Use This Anime
              </button>
              <button type="button" className="am-btn am-btn-ghost" onClick={handleSkip}>
                {q.skipLabel}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default Quiz;