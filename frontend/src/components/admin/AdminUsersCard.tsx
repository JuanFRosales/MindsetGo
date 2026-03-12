import React from "react";
import type { AdminUser } from "../../types/adminTypes";

type Props = {
  users: AdminUser[];
  loading: boolean;
  deletingId: string | null;
  onRefresh: () => void | Promise<void>;
  onDelete: (userId: string) => void | Promise<void>;
  onOpenSummaries: (userId: string) => void | Promise<void>;
  onOpenDetails: (userId: string) => void | Promise<void>;
};

const fmt = (value?: string | null): string => {
  if (!value) return "Ei tietoa";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Ei tietoa";
  }

  return date.toLocaleString("fi-FI");
};

export const AdminUsersCard: React.FC<Props> = ({
  users,
  loading,
  deletingId,
  onRefresh,
  onDelete,
  onOpenSummaries,
  onOpenDetails,
}) => {
  return (
    <div className="card">
      <div
        className="row"
        style={{ justifyContent: "space-between", alignItems: "center" }}
      >
        <div>
          <h2 style={{ margin: 0 }}>Käyttäjät</h2>
          <p className="small" style={{ marginTop: 6 }}>
            Anonyymit käyttäjätunnukset ja tallennetut tiedot.
          </p>
        </div>

        <button className="btn secondary" onClick={() => void onRefresh()}>
          Päivitä lista
        </button>
      </div>

      <div className="spacer" />

      {loading ? (
        <div className="badge">Ladataan käyttäjiä...</div>
      ) : users.length === 0 ? (
        <div className="small">Käyttäjiä ei löytynyt.</div>
      ) : (
        <div className="admin-users-list">
          {users.map((user) => {
            const isDeleting = deletingId === user.id;

            return (
              <div
                key={user.id}
                className="card tight"
                style={{ marginTop: 10 }}
              >
                <div
                  className="row"
                  style={{
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    gap: 12,
                    flexWrap: "wrap",
                  }}
                >
                  <div style={{ flex: "1 1 420px", minWidth: 260 }}>
                    <div className="small" style={{ opacity: 0.75 }}>
                      Käyttäjä-ID
                    </div>

                    <div
                      style={{
                        fontFamily:
                          'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
                        wordBreak: "break-all",
                        marginTop: 4,
                      }}
                    >
                      {user.id}
                    </div>

                    <div className="spacer" style={{ height: 10 }} />

                    <div className="small">
                      <strong>Luotu:</strong> {fmt(user.createdAt)}
                    </div>
                    <div className="small">
                      <strong>Viimeksi aktiivinen:</strong> {fmt(user.lastActiveAt)}
                    </div>
                    <div className="small">
                      <strong>Vanhenee:</strong> {fmt(user.expiresAt)}
                    </div>
                  </div>

                  <div
                    className="row"
                    style={{
                      gap: 8,
                      flexWrap: "wrap",
                      justifyContent: "flex-end",
                    }}
                  >
                    <button
                      className="btn secondary"
                      onClick={() => void onOpenDetails(user.id)}
                    >
                      Avaa tiedot
                    </button>

                    <button
                      className="btn secondary"
                      onClick={() => void onOpenSummaries(user.id)}
                    >
                      Yhteenvedot
                    </button>

                    <button
                      className="btn danger"
                      onClick={() => void onDelete(user.id)}
                      disabled={isDeleting}
                    >
                      {isDeleting ? "Poistetaan..." : "Poista"}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default AdminUsersCard;