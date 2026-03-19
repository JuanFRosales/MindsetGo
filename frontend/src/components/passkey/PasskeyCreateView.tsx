import React from "react";

type Props = {
  busy: boolean;
  onRegister: () => void;
  onSwitchToLogin: () => void;
  onReset: () => void;
};

export const PasskeyCreateView: React.FC<Props> = ({
  busy,
  onRegister,
  onSwitchToLogin,
  onReset,
}) => {
  return (
    <>
      <p className="p">
        Passkey sitoo tämän anonyymin käyttäjän laitteeseesi. Voit käyttää Face ID:tä, Touch ID:tä tai PIN koodia.
      </p>

      <button className="btn primary" onClick={onRegister} disabled={busy}>
        Luo passkey
      </button>

      <div className="spacer" />

      <button className="btn" onClick={onSwitchToLogin} disabled={busy}>
        Minulla on jo passkey
      </button>

      <div className="spacer" />

      <button className="btn danger" onClick={onReset} disabled={busy}>
        Skannaa toinen QR koodi
      </button>
    </>
  );
};