import React from "react";
import ReactDOM from "react-dom/client";
import { App } from "./game-ui/App";
import "./game-ui/App.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
