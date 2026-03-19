import React from "react";

type Props = {
  busy: boolean;
  onLogin: () => void;
  onSwitchToCreate: () => void;
  onReset: () => void;
};

export const PasskeyLoginView: React.FC<Props> = ({
  busy,
  onLogin,
  onSwitchToCreate,
  onReset,
}) => {
  return (
    <>
      <p className="p">
        Vahvista passkeyllä ja jatka keskusteluun.
      </p>

      <button className="btn primary" onClick={onLogin} disabled={busy}>
        Kirjaudu passkeyllä
      </button>

      <div className="spacer" />

      <button className="btn" onClick={onSwitchToCreate} disabled={busy}>
        Luo passkey uudelleen
      </button>

      <div className="spacer" />

      <button className="btn danger" onClick={onReset} disabled={busy}>
        Kirjaudu toisella käyttäjällä
      </button>
    </>
  );
};