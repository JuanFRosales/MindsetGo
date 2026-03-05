import React from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Background from "./components/Background";
import { StartPage } from "./pages/StartPage";
import { PasskeyPage } from "./pages/PasskeyPage";
import { ChatPage } from "./pages/ChatPage";
import { ProfilePage } from "./pages/ProfilePage";
import RequireAuth from "./routes/RequireAuth";
import { LandingGate } from "./routes/LandingGate";

export const App: React.FC = () => {
  return (
    <div className="app-shell">
      <Background />
      <div className="app-content">
        <Routes>
          <Route path="/" element={<LandingGate />} />
          <Route path="/start" element={<StartPage />} />
          <Route path="/passkey" element={<PasskeyPage />} />
          <Route
            path="/chat"
            element={
              <RequireAuth>
                <ChatPage />
              </RequireAuth>
            }
          />
          <Route
            path="/profile"
            element={
              <RequireAuth>
                <ProfilePage />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </div>
  );
};