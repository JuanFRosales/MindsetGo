import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { startAuthentication, startRegistration } from "@simplewebauthn/browser";
import { api, type ApiError } from "../lib/api";
import { prettyApiError } from "../lib/prettyError";
import { useToast } from "../state/toast";
import { useAuth } from "../state/auth";
import { qrIdStore } from "../state/qrIdStore";

type NavState = { userId: string; resolutionId: string };

type RegisterOptionsRes = { challengeId: string; publicKey: any };
type LoginOptionsRes = { challengeId: string; publicKey: any };
type LoginVerifyRes = { ok: true; userId: string; proofId: string };

// Map backend error codes to user-friendly UI messages
const prettyError = (e: ApiError): string => {
  if (e.error === "invalid_resolutionId") return "Istunto on vanhentunut. Palaa alkuun.";
  if (e.error === "invalid_challenge") return "Vahvistus vanhentui. Yritä uudelleen.";
  if (e.error === "no_passkey") return "Passkey puuttuu tältä käyttäjältä.";
  if (e.error === "passkey_already_exists") return "Passkey on jo luotu.";
  if (e.error === "passkey_needs_reregistration") return "Passkey pitää luoda uudelleen.";
  if (e.error === "verification_failed") return "Vahvistus epäonnistui.";
  if (e.error === "registration_failed") return "Passkeyn luonti epäonnistui.";
  if (e.error === "invalid_or_expired_proof") return "Kirjautumisen vahvistus vanhentui.";
  if (e.error === "proof_already_used") return "Kirjautumisen vahvistus on jo käytetty.";
  return prettyApiError(e);
};

export const PasskeyPage: React.FC = () => {
  const loc = useLocation();
  const nav = useNavigate();
  const toast = useToast();
  const auth = useAuth();
  const state = (loc.state ?? null) as NavState | null;

  const [mode, setMode] = useState<"checking" | "create" | "login">("checking");
  const [busy, setBusy] = useState(false);

  // Check if the user already has a passkey to determine whether to show login or registration
  useEffect(() => {
    if (!state?.userId || !state?.resolutionId) {
      nav("/start");
      return;
    }

    const check = async () => {
      try {
        await api.post<LoginOptionsRes>("/webauthn/login/options", { userId: state.userId });
        setMode("login");
      } catch (e) {
        // Default to creation mode if no passkey is found or in case of network issues
        setMode("create");
      }
    };

    void check();
  }, [nav, state]);

  // Handle the WebAuthn registration flow (creating a new passkey)
  const registerPasskey = async () => {
    if (!state) return;
    setBusy(true);
    try {
      const opt = await api.post<RegisterOptionsRes>("/webauthn/register/options", {
        resolutionId: state.resolutionId,
      });
      const attResp = await startRegistration(opt.publicKey);
      await api.post("/webauthn/register/verify", { challengeId: opt.challengeId, response: attResp });
      toast.show("Passkey luotu.");
      setMode("login");
    } catch (e) {
      toast.show(prettyError(e as ApiError));
    } finally {
      setBusy(false);
    }
  };

  // Handle the WebAuthn authentication flow (logging in with existing passkey)
  const loginPasskey = async () => {
    if (!state) return;
    setBusy(true);
    try {
      const opt = await api.post<LoginOptionsRes>("/webauthn/login/options", { userId: state.userId });
      const assResp = await startAuthentication(opt.publicKey);
      const verify = await api.post<LoginVerifyRes>("/webauthn/login/verify", {
        challengeId: opt.challengeId,
        resolutionId: state.resolutionId,
        response: assResp,
      });
      await api.post("/auth/session", { proofId: verify.proofId });
      await auth.refresh();
      toast.show("Kirjautuminen onnistui.");
      nav("/chat", { replace: true });
    } catch (e) {
      const err = e as ApiError;
      if (err.error === "passkey_needs_reregistration") {
        setMode("create");
      }
      toast.show(prettyError(err));
    } finally {
      setBusy(false);
    }
  };

  // Clear session and local device ID, then return to start to scan a new code
  const resetDeviceAndReturnToStart = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await api.post("/auth/logout");
    } catch {
      // Ignore logout errors
    } finally {
      qrIdStore.clear();
      toast.show("Kirjauduit ulos. Skannaa uusi QR koodi.");
      nav("/start", { replace: true });
      setBusy(false);
    }
  };

  if (!state) return null;

  return (
    <div className="container">
      <div className="card" style={{ padding: 22 }}>
        <div className="h1" style={{ fontSize: 26 }}>
          {mode === "create" ? "Luo passkey" : mode === "login" ? "Kirjaudu" : "Hetki"}
        </div>

        {mode === "checking" ? (
          <div className="badge">Valmistelen</div>
        ) : null}

        {mode === "create" ? (
          <>
            <p className="p">
              Passkey sitoo tämän anonyymin käyttäjän laitteeseesi. Voit käyttää Face ID:tä, Touch ID:tä tai PIN koodia.
            </p>
            <button className="btn primary" onClick={registerPasskey} disabled={busy}>
              Luo passkey
            </button>
            <div className="spacer" />
            <button className="btn" onClick={() => setMode("login")} disabled={busy}>
              Minulla on jo passkey
            </button>
            <div className="spacer" />
            <button className="btn danger" onClick={resetDeviceAndReturnToStart} disabled={busy}>
              Skannaa toinen QR koodi
            </button>
          </>
        ) : null}

        {mode === "login" ? (
          <>
            <p className="p">
              Vahvista passkeyllä ja jatka keskusteluun.
            </p>
            <button className="btn primary" onClick={loginPasskey} disabled={busy}>
              Kirjaudu passkeyllä
            </button>
            <div className="spacer" />
            <button className="btn" onClick={() => setMode("create")} disabled={busy}>
              Luo passkey uudelleen
            </button>
            <div className="spacer" />
            <button className="btn danger" onClick={resetDeviceAndReturnToStart} disabled={busy}>
              Kirjaudu toisella käyttäjällä
            </button>
          </>
        ) : null}
      </div>
    </div>
  );
};