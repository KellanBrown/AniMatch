import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

const questions = [
  {
    question: "What's your current mood?",
    options: ["Excited", "Chill", "Adventurous", "Romantic", "Sad", "Comedic"]
  },
  {
    question: "What genre do you prefer?",
    options: ["Action", "Romance", "Fantasy", "Comedy", "Horror", "Drama", "SciFi"]
  },
  {
    question: "Do you like long or short series?",
    options: ["Short (<25 episodes)", "Medium (25-50)", "Long (50+)"]
  },
  {
    question: "Do you prefer popular or hidden gems?",
    options: ["Popular", "Hidden Gems"]
  }
];

function Quiz() {
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const navigate = useNavigate();

  const handleAnswer = (answer) => {
    // FIX: build the complete answers array first, then use it everywhere
    const newAnswers = [...answers, answer];
    setAnswers(newAnswers);

    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      // FIX: pass newAnswers (not the stale `answers` state) to navigate
      navigate("/recommendations", { state: { answers: newAnswers } });
    }
  };

  return (
    <div style={{ padding: "20px" }}>
      <h1>Anime Recommendation Quiz</h1>
      <p>{questions[current].question}</p>
      {questions[current].options.map((opt, idx) => (
        <button key={idx} onClick={() => handleAnswer(opt)} style={{ margin: "5px" }}>
          {opt}
        </button>
      ))}
    </div>
  );
}

export default Quiz;