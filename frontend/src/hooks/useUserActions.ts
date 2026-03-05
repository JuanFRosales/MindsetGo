import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { api, type ApiError } from "../lib/api";
import { prettyApiError } from "../lib/prettyError";
import { useAuth } from "../state/auth";
import { qrIdStore } from "../state/qrIdStore";
import { useToast } from "../state/toast";

export const useUserActions = () => {
  const nav = useNavigate();
  const auth = useAuth();
  const toast = useToast();

  const logout = useCallback(async () => {
    try {
      // Best effort server logout
      await api.post("/auth/logout", {});
    } catch {
      // Ignore logout API errors
    } finally {
      // Always clear local state
      auth.clear();
      qrIdStore.clear();
      // Navigate home via router
      nav("/", { replace: true });
    }
  }, [auth, nav]);

  const deleteUser = useCallback(async () => {
    if (!confirm("Poistetaanko käyttäjä ja kaikki tiedot tältä laitteelta?")) return;

    try {
      // Delete on server first
      await api.post("/user/delete", {});
      // Clear local state after successful deletion
      auth.clear();
      qrIdStore.clear();
      // Optional success feedback
      toast.show("Poistettu");
      // Navigate home via router
      nav("/", { replace: true });
    } catch (e) {
      // Keep user in place if deletion fails
      toast.show(prettyApiError(e as ApiError));
    }
  }, [auth, nav, toast]);

  const goProfile = useCallback(() => {
    // Simple route navigation
    nav("/profile");
  }, [nav]);

  return { logout, deleteUser, goProfile };
};