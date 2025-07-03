// main.jsx
import React from "react";
import ReactDOM from "react-dom"; // not "react-dom/client" for React 17
import App from "./App.jsx";
import { BrowserRouter } from "react-router-dom";

ReactDOM.render(
  <BrowserRouter>
    <App />
  </BrowserRouter>,
  document.getElementById("root")
);
