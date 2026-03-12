import React, { useCallback } from "react";
import AdminLoginCard from "../components/admin/AdminLoginCard";
import { AdminDashboard } from "../components/admin/AdminDashboard";
import { useAdminAuth } from "../hooks/useAdminAuth";
import type { ApiError } from "../lib/api";
import { prettyApiError } from "../lib/prettyError";
import { useToast } from "../state/toast";

export const AdminPage: React.FC = () => {
  const toast = useToast();
  const { checkingAuth, isAuthenticated, logout, refreshAuth } = useAdminAuth();

  const handleLoginSuccess = useCallback(async () => {
    try {
      await refreshAuth();
      toast.show("Admin kirjautuminen onnistui.");
    } catch (e) {
      toast.show(prettyApiError(e as ApiError));
    }
  }, [refreshAuth, toast]);

  const handleLogout = useCallback(async () => {
    try {
      await logout();
    } finally {
      toast.show("Kirjauduttu ulos.");
    }
  }, [logout, toast]);

  if (checkingAuth) {
    return (
      <div className="container">
        <div className="card admin-loading-card">
          <h1>Admin</h1>
          <p>Tarkistetaan kirjautumista...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="container">
        <AdminLoginCard onLoginSuccess={handleLoginSuccess} />
      </div>
    );
  }

  return <AdminDashboard onLogout={handleLogout} />;
};
