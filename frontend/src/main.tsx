import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { App } from "./App";
import { PlayerScreen } from "./PlayerScreen";
import "katex/dist/katex.min.css";
import "./styles.css";

const RootComponent = window.location.pathname === "/screen" ? PlayerScreen : App;

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <RootComponent />
  </StrictMode>
);
