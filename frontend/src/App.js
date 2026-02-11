import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Import your components
import Login from "./components/Login";
import Signup from "./components/Signup";
import Dashboard from "./components/Dashboard";
import Search from "./Search";
import Quiz from "./components/Quiz";
import Recommendations from "./components/Recommendations"; // Make sure this file exists

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} /> 
        <Route path="/signup" element={<Signup />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/quiz" element={<Quiz />} />
        <Route path="/recommendations" element={<Recommendations />} />
      </Routes>
    </Router>
  );
}

export default App;
