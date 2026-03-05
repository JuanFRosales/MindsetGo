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
      await api.post("/auth/logout", {});
    } catch {
      // ignore
    } finally {
      auth.clear();
      qrIdStore.clear();
      window.location.assign("/");
    }
  }, [auth]);

  const deleteUser = useCallback(async () => {
    if (!confirm("Poistetaanko käyttäjä ja kaikki tiedot tältä laitteelta?")) return;

    try {
      await api.post("/user/delete", {});
    } catch (e) {
      toast.show(prettyApiError(e as ApiError));
    } finally {
      auth.clear();
      qrIdStore.clear();
      window.location.assign("/");
    }
  }, [auth, toast]);

  const goProfile = useCallback(() => {
    nav("/profile");
  }, [nav]);

  return { logout, deleteUser, goProfile };
};