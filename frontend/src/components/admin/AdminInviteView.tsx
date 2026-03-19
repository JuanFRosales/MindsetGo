import React from "react";
import { QRCodeCanvas } from "qrcode.react";

type AdminInviteViewProps = {
  inviteCode: string | null;
  inviteUrl: string | null;
  inviteLoading: boolean;
  onCreateInvite: () => void;
  onCopyInviteCode: () => void;
};

export const AdminInviteView: React.FC<AdminInviteViewProps> = ({
  inviteCode,
  inviteUrl,
  inviteLoading,
  onCreateInvite,
  onCopyInviteCode,
}) => {
  return (
    <>
      <div className="card">
        <h2>Luo study card</h2>
        <p className="p">Luo uusi kirjautumiskoodi potilaalle.</p>

        <div className="row" style={{ gap: "10px" }}>
          <button
            className="btn"
            onClick={onCreateInvite}
            disabled={inviteLoading}
          >
            {inviteLoading ? "Luodaan..." : "Luo uusi kirjautumiskoodi"}
          </button>
        </div>

        {inviteCode && (
          <p style={{ marginTop: "12px" }}>
            <strong>Koodi:</strong> {inviteCode}
          </p>
        )}
      </div>

      {inviteUrl && inviteCode && (
        <>
          <div className="spacer-lg" />

          <div className="card" style={{ textAlign: "center" }}>
            <h2>Potilaan kirjautuminen</h2>

            <div
              style={{
                background: "#fff",
                padding: "20px",
                display: "inline-block",
                borderRadius: "8px",
              }}
            >
              <QRCodeCanvas value={inviteUrl} size={220} />
            </div>

            <p style={{ marginTop: "15px" }}>
              <strong>Koodi:</strong> {inviteCode}
            </p>

            <div
              className="row"
              style={{ justifyContent: "center", gap: "10px" }}
            >
              <button className="btn" onClick={onCopyInviteCode}>
                Kopioi koodi
              </button>
            </div>
          </div>
        </>
      )}
    </>
  );
};