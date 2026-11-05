import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { startOutbox } from "./outbox";
import { startVisitBeacon } from "./visitBeacon";
import { App } from "./App";
import "./styles.css";

startOutbox();
startVisitBeacon();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
