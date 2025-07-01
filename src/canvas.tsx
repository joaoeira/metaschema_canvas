import React from "react";
import ReactDOM from "react-dom/client";
import Canvas from "./pages/Canvas";
import "./styles.css";
import "./canvas.css";

const root = document.getElementById("root");

if (!root) {
  throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <Canvas />
  </React.StrictMode>
);
