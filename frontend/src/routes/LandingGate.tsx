import React from "react";
import { Navigate } from "react-router-dom";
import { LandingPage } from "../pages/LandingPage";
import { useAuth } from "../state/auth";
import { Splash } from "../components/Splash";

export const LandingGate: React.FC = () => {
  const auth = useAuth();
  if (auth.loading) return <Splash />;
  if (auth.user) return <Navigate to="/chat" replace />;
  return <LandingPage />;
};
