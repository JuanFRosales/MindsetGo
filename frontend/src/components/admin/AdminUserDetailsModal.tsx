import React from "react";
import type { AdminMessage, AdminProfileState } from "../../types/adminTypes";

type Props = {
  open: boolean;
  userId: string | null;
  messages: AdminMessage[];
  messagesLoading: boolean;
  profileState: AdminProfileState | null;
  profileLoading: boolean;
  onClose: () => void;
  onResetPasskeys: (userId: string) => void | Promise<void>;
  onResetProfileState: (userId: string) => void | Promise<void>;
};

const fmt = (value?: string | null): string => {
  if (!value) return "Ei tietoa";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ei tietoa";
  }

  return date.toLocaleString("fi-FI");
};

export const AdminUserDetailsModal: React.FC<Props> = ({
  open,
  userId,
  messages,
  messagesLoading,
  profileState,
  profileLoading,
  onClose,
  onResetPasskeys,
  onResetProfileState,
}) => {
  if (!open) return null;

  return (
    <>
      <div className="modalOverlay" onClick={onClose} />

      <div className="modalCard" style={{ maxWidth: 960 }}>
        <div className="h1" style={{ fontSize: 22 }}>
          Käyttäjän tiedot
        </div>

        <p className="p">
          Käyttäjä:{" "}
          <span style={{ color: "rgba(255,255,255,0.92)" }}>
            {userId ?? "-"}
          </span>
        </p>

        {userId ? (
          <div
            className="row"
            style={{
              gap: 10,
              flexWrap: "wrap",
              marginBottom: 16,
            }}
          >
            <button
              className="btn secondary"
              onClick={() => void onResetPasskeys(userId)}
            >
              Nollaa passkeyt
            </button>

            <button
              className="btn danger"
              onClick={() => void onResetProfileState(userId)}
            >
              Nollaa profiilitila
            </button>
          </div>
        ) : null}

        <div className="spacer" />

        <h3>Profiilitila</h3>

        {profileLoading ? (
          <div className="badge" style={{ marginBottom: 10 }}>
            Ladataan profiilitilaa...
          </div>
        ) : profileState ? (
          <pre
            className="card tight"
            style={{
              whiteSpace: "pre-wrap",
              overflowX: "auto",
              marginTop: 10,
            }}
          >
            {JSON.stringify(profileState.stateJson, null, 2)}
          </pre>
        ) : (
          <div className="small">Profiilitilaa ei löytynyt.</div>
        )}

        <div className="spacer" />

        <h3>Viestit</h3>

        {messagesLoading ? (
          <div className="badge" style={{ marginBottom: 10 }}>
            Ladataan viestejä...
          </div>
        ) : messages.length === 0 ? (
          <div className="small">Viestejä ei löytynyt.</div>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} className="card tight" style={{ marginTop: 10 }}>
              <div className="small" style={{ opacity: 0.7 }}>
                {msg.role} · {fmt(msg.createdAt)}
              </div>

              <div className="spacer" style={{ height: 8 }} />

              <div style={{ whiteSpace: "pre-wrap" }}>{msg.content}</div>
            </div>
          ))
        )}

        <div className="spacer" />

        <button className="btn" onClick={onClose}>
          Sulje
        </button>
      </div>
    </>
  );
};

export default AdminUserDetailsModal;