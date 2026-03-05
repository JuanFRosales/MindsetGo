import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../state/auth";

type Props = {
  children: React.ReactNode;
};

const RequireAuth: React.FC<Props> = ({ children }) => {
  const auth = useAuth();

  if (auth.loading) return null;

  if (!auth.user) return <Navigate to="/" replace />;

  return <>{children}</>;
};

export default RequireAuth;