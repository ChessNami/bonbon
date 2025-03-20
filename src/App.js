import React, { useState } from "react";
import Auth from "./components/Auth";
import MainComponent from "./components/MainComponent";

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  return isAuthenticated ? (
    <MainComponent />
  ) : (
    <Auth onLoginSuccess={() => setIsAuthenticated(true)} />
  );
}

export default App;