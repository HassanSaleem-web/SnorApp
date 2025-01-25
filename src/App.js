import React from "react";
import { BrowserRouter as Router } from "react-router-dom";
import AppRoutes from "./routes/AppRoutes"; // Import AppRoutes for centralized routing

const App = () => {
  return (
    <Router>
      {/* All routes are handled in AppRoutes */}
      <AppRoutes />
    </Router>
  );
};

export default App;

