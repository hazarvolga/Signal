import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router";
import App from "./App.tsx";
import "./index.css";
import { CollaborationProvider } from "./services/collaborationContext";
import { LanguageProvider } from "./contexts/LanguageContext";
import { TourProvider } from "./contexts/TourContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <LanguageProvider>
          <CollaborationProvider>
            <TourProvider>
              <App />
            </TourProvider>
          </CollaborationProvider>
        </LanguageProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </StrictMode>
);
