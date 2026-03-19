import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";

import { api, type ApiError } from "../lib/api";
import { prettyPasskeyError } from "../lib/passkeyErrors";
import { useToast } from "../state/toast";
import { useAuth } from "../state/auth";
import { qrIdStore } from "../state/qrIdStore";

type NavState = { userId: string; resolutionId: string };

type RegisterOptionsRes = { challengeId: string; publicKey: any };
type LoginOptionsRes = { challengeId: string; publicKey: any };
type LoginVerifyRes = { ok: true; userId: string; proofId: string };

export const usePasskeyFlow = (state: NavState | null) => {
  const nav = useNavigate();
  const toast = useToast();
  const auth = useAuth();

  const [mode, setMode] = useState<"checking" | "create" | "login">("checking");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!state?.userId || !state?.resolutionId) {
      nav("/start");
      return;
    }

    const check = async () => {
      try {
        await api.post<LoginOptionsRes>("/webauthn/login/options", {
          userId: state.userId,
        });
        setMode("login");
      } catch {
        setMode("create");
      }
    };

    void check();
  }, [nav, state]);

  const registerPasskey = async () => {
    if (!state) return;
    setBusy(true);

    try {
      const opt = await api.post<RegisterOptionsRes>(
        "/webauthn/register/options",
        { resolutionId: state.resolutionId },
      );

      const attResp = await startRegistration(opt.publicKey);

      await api.post("/webauthn/register/verify", {
        challengeId: opt.challengeId,
        response: attResp,
      });

      toast.show("Passkey luotu.");
      setMode("login");
    } catch (e) {
      toast.show(prettyPasskeyError(e as ApiError));
    } finally {
      setBusy(false);
    }
  };

  const loginPasskey = async () => {
    if (!state) return;
    setBusy(true);

    try {
      const opt = await api.post<LoginOptionsRes>(
        "/webauthn/login/options",
        { userId: state.userId },
      );

      const assResp = await startAuthentication(opt.publicKey);

      const verify = await api.post<LoginVerifyRes>(
        "/webauthn/login/verify",
        {
          challengeId: opt.challengeId,
          resolutionId: state.resolutionId,
          response: assResp,
        },
      );

      await api.post("/auth/session", { proofId: verify.proofId });
      await auth.refresh();

      toast.show("Kirjautuminen onnistui.");
      nav("/chat", { replace: true });
    } catch (e) {
      const err = e as ApiError;

      if (err.error === "passkey_needs_reregistration") {
        setMode("create");
      }

      toast.show(prettyPasskeyError(err));
    } finally {
      setBusy(false);
    }
  };

  const resetDeviceAndReturnToStart = async () => {
    if (busy) return;
    setBusy(true);

    try {
      await api.post("/auth/logout");
    } catch {
      // ignore
    } finally {
      qrIdStore.clear();
      toast.show("Kirjauduit ulos. Skannaa uusi QR koodi.");
      nav("/start", { replace: true });
      setBusy(false);
    }
  };

  return {
    mode,
    busy,
    setMode,
    registerPasskey,
    loginPasskey,
    resetDeviceAndReturnToStart,
  };
};