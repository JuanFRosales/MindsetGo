import React from "react";
import { useLocation } from "react-router-dom";

import { usePasskeyFlow } from "../hooks/usePasskeyFlow";
import { PasskeyCreateView } from "../components/passkey/PasskeyCreateView";
import { PasskeyLoginView } from "../components/passkey/PasskeyLoginView";

type NavState = { userId: string; resolutionId: string };

export const PasskeyPage: React.FC = () => {
  const loc = useLocation();
  const state = (loc.state ?? null) as NavState | null;

  const {
    mode,
    busy,
    setMode,
    registerPasskey,
    loginPasskey,
    resetDeviceAndReturnToStart,
  } = usePasskeyFlow(state);

  if (!state) return null;

  const title =
    mode === "create" ? "Luo passkey" :
    mode === "login" ? "Kirjaudu" :
    "Hetki";

  return (
    <div className="container">
      <div className="card" style={{ padding: 22 }}>
        <div className="h1" style={{ fontSize: 26 }}>
          {title}
        </div>

        {mode === "checking" && (
          <div className="badge">Valmistelen</div>
        )}

        {mode === "create" && (
          <PasskeyCreateView
            busy={busy}
            onRegister={() => void registerPasskey()}
            onSwitchToLogin={() => setMode("login")}
            onReset={() => void resetDeviceAndReturnToStart()}
          />
        )}

        {mode === "login" && (
          <PasskeyLoginView
            busy={busy}
            onLogin={() => void loginPasskey()}
            onSwitchToCreate={() => setMode("create")}
            onReset={() => void resetDeviceAndReturnToStart()}
          />
        )}
      </div>
    </div>
  );
};