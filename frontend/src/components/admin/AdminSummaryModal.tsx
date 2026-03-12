import React from "react";
import type { UserSummary } from "../../types/adminTypes";

type Props = {
  open: boolean;
  userId: string | null;
  loading: boolean;
  summaries: UserSummary[];
  onClose: () => void;
  onDeleteSummaries: (userId: string) => void | Promise<void>;
};

const fmt = (value?: string | null): string => {
  if (!value) return "Ei tietoa";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ei tietoa";
  }

  return date.toLocaleString("fi-FI");
};

export const AdminSummaryModal: React.FC<Props> = ({
  open,
  userId,
  loading,
  summaries,
  onClose,
  onDeleteSummaries,
}) => {
  if (!open) return null;

  return (
    <>
      <div className="modalOverlay" onClick={onClose} />

      <div className="modalCard">
        <div className="h1" style={{ fontSize: 22 }}>Yhteenvedot</div>

        <p className="p">
          Käyttäjä:{" "}
          <span style={{ color: "rgba(255,255,255,0.92)" }}>
            {userId ?? "-"}
          </span>
        </p>

        {userId ? (
          <div className="row" style={{ gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
            <button
              className="btn danger"
              onClick={() => void onDeleteSummaries(userId)}
            >
              Poista yhteenvedot
            </button>
          </div>
        ) : null}

        {loading ? (
          <div className="badge" style={{ marginBottom: 10 }}>Ladataan...</div>
        ) : null}

        {!loading && summaries.length === 0 ? (
          <div className="small">Ei vielä yhteenvetoja.</div>
        ) : null}

        {!loading && summaries.length > 0
          ? summaries.map((item) => (
              <div key={item.id} className="card tight" style={{ marginTop: 10 }}>
                <div className="small" style={{ opacity: 0.7 }}>
                  Luotu: {fmt(item.createdAt)}
                </div>

                <div className="spacer" style={{ height: 8 }} />

                <div className="admin-summary-text" style={{ whiteSpace: "pre-wrap" }}>
                  {item.summary ?? "Tyhjä yhteenveto"}
                </div>
              </div>
            ))
          : null}

        <div className="spacer" />

        <button className="btn" onClick={onClose}>
          Sulje
        </button>
      </div>
    </>
  );
};

export default AdminSummaryModal;