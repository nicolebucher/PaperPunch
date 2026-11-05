import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startOutbox } from "./outbox";
import { App } from "./App";
import "./styles.css";

startOutbox();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
