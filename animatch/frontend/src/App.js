import { HashRouter as Router, Routes, Route } from "react-router-dom";
import Login          from "./components/Login";
import Signup         from "./components/Signup";
import Dashboard      from "./components/Dashboard";
import Search         from "./Search";
import Quiz           from "./components/Quiz";
import Recommendations from "./components/Recommendations";
import Watchlist      from "./Watchlist";
import Friends        from "./Friends";
import { ToastProvider } from "./components/Toast";

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/"               element={<Login />} />
          <Route path="/signup"         element={<Signup />} />
          <Route path="/dashboard"      element={<Dashboard />} />
          <Route path="/search"         element={<Search />} />
          <Route path="/quiz"           element={<Quiz />} />
          <Route path="/recommendations" element={<Recommendations />} />
          <Route path="/watchlist"      element={<Watchlist />} />
          <Route path="/friends"        element={<Friends />} />
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;