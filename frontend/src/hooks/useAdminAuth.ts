import { useCallback, useEffect, useState } from "react";
import { adminApi } from "../lib/adminApi";
import type { ApiError } from "../lib/api";

type AdminMeResponse = {
  admin: boolean;
};
// Custom hook to manage admin authentication state
export const useAdminAuth = () => {
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
// Check admin auth status by calling /admin/me
  const refreshAuth = useCallback(async () => {
    setCheckingAuth(true);

    try {
      const data = await adminApi.get<AdminMeResponse>("/admin/me");
      setIsAuthenticated(data.admin === true);
    } catch (e) {
      const err = e as ApiError;

      if (err?.error === "unauthorized" || err?.message?.includes("401")) {
        setIsAuthenticated(false);
      } else {
        setIsAuthenticated(false);
      }
    } finally {
      setCheckingAuth(false);
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await adminApi.post("/admin/logout", {});
    } catch {
        // Ignore errors on logout
    } finally {
      setIsAuthenticated(false);
    }
  }, []);
// Expose a way to manually set auth state (e.g. after login)
  useEffect(() => {
    void refreshAuth();
  }, [refreshAuth]);

  return {
    checkingAuth,
    isAuthenticated,
    refreshAuth,
    logout,
    setIsAuthenticated,
  };
};