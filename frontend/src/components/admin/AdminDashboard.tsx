import React, { useCallback, useEffect, useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { AdminSummaryModal } from "./AdminSummaryModal";
import { AdminUserDetailsModal } from "./AdminUserDetailsModal";
import { AdminUsersCard } from "./AdminUsersCard";
import { useAdminUserDetails } from "../../hooks/useAdminUserDetails";
import { useAdminUsers } from "../../hooks/useAdminUsers";
import { adminApi } from "../../lib/adminApi";
import type { ApiError } from "../../lib/api";
import { prettyApiError } from "../../lib/prettyError";
import { useToast } from "../../state/toast";

type InviteResponse = {
  code: string;
  expiresAt: string;
};

type AdminDashboardProps = {
  onLogout: () => void | Promise<void>;
};

const buildInviteUrl = (code: string): string => {
  const origin = window.location.origin;
  return `${origin}/qr?code=${encodeURIComponent(code)}`;
};

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
}) => {
  const toast = useToast();

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const {
    users,
    loading,
    deletingId,
    summaries,
    summariesUserId,
    summariesLoading,
    loadUsers,
    deleteUser,
    loadSummaries,
    clearSummaries,
    clearUsers,
  } = useAdminUsers({
    onUnauthorized: () => {
      setInviteCode(null);
      setInviteUrl(null);
      clearSummaries();
      clearUsers();
      toast.show("Istunto vanheni. Kirjaudu uudelleen.");
    },
  });

  const {
    selectedUserId,
    messages,
    messagesLoading,
    profileState,
    profileLoading,
    openUserDetails,
    clearUserDetails,
  } = useAdminUserDetails({
    onUnauthorized: () => {
      setInviteCode(null);
      setInviteUrl(null);
      clearSummaries();
      clearUserDetails();
      clearUsers();
      toast.show("Istunto vanheni. Kirjaudu uudelleen.");
    },
  });

  const clearLocalAdminData = useCallback(() => {
    setInviteCode(null);
    setInviteUrl(null);
    clearSummaries();
    clearUserDetails();
    clearUsers();
  }, [clearSummaries, clearUserDetails, clearUsers]);

  const copyText = useCallback(
    async (value: string, successMessage: string) => {
      try {
        await navigator.clipboard.writeText(value);
        toast.show(successMessage);
      } catch {
        toast.show("Kopiointi epäonnistui.");
      }
    },
    [toast],
  );

  const handleCreateInvite = useCallback(async () => {
    setInviteLoading(true);

    try {
      const res = await adminApi.post<InviteResponse>("/admin/invites", {});
      setInviteCode(res.code);
      setInviteUrl(buildInviteUrl(res.code));
      toast.show("Kirjautumiskoodi luotu.");
    } catch (e) {
      toast.show(prettyApiError(e as ApiError));
    } finally {
      setInviteLoading(false);
    }
  }, [toast]);

  const handleLogoutClick = useCallback(async () => {
    try {
      await onLogout();
    } finally {
      clearLocalAdminData();
    }
  }, [onLogout, clearLocalAdminData]);

  const handleDeleteUser = useCallback(
    async (userId: string) => {
      if (!confirm(`Poistetaanko käyttäjä ${userId}?`)) return;

      try {
        await deleteUser(userId);
        toast.show("Käyttäjä poistettu.");
      } catch (e) {
        toast.show(prettyApiError(e as ApiError));
      }
    },
    [deleteUser, toast],
  );

  const handleResetPasskeys = useCallback(
    async (userId: string) => {
      if (!confirm(`Nollataanko käyttäjän ${userId} passkeyt?`)) return;

      try {
        await adminApi.post(
          `/admin/users/${encodeURIComponent(userId)}/reset-passkeys`,
          {},
        );

        toast.show("Passkeyt nollattu.");
      } catch (e) {
        toast.show(prettyApiError(e as ApiError));
      }
    },
    [toast],
  );

  const handleDeleteSummaries = useCallback(
    async (userId: string) => {
      if (!confirm(`Poistetaanko käyttäjän ${userId} yhteenvedot?`)) return;

      try {
        await adminApi.del(
          `/admin/users/${encodeURIComponent(userId)}/summaries`,
        );

        clearSummaries();
        toast.show("Yhteenvedot poistettu.");
      } catch (e) {
        toast.show(prettyApiError(e as ApiError));
      }
    },
    [clearSummaries, toast],
  );

  const handleResetProfileState = useCallback(
    async (userId: string) => {
      if (!confirm(`Nollataanko käyttäjän ${userId} profiilitila?`)) return;

      try {
        await adminApi.del(
          `/admin/users/${encodeURIComponent(userId)}/profile-state`,
        );

        if (selectedUserId === userId) {
          await openUserDetails(userId);
        }

        toast.show("Profiilitila nollattu.");
      } catch (e) {
        toast.show(prettyApiError(e as ApiError));
      }
    },
    [openUserDetails, selectedUserId, toast],
  );

  useEffect(() => {
    void loadUsers().catch((e) => {
      const err = e as ApiError;
      if (err?.error !== "unauthorized") {
        toast.show(prettyApiError(err));
      }
    });
  }, [loadUsers, toast]);

  return (
    <div className="container admin-container">
      <div className="topbar">
        <div className="brand">Admin Dashboard</div>
        <button className="btn secondary" onClick={() => void handleLogoutClick()}>
          Logout
        </button>
      </div>

      <div className="card">
        <h2>Luo study card</h2>
        <p>Luo uusi kirjautumiskoodi potilaalle.</p>

        <div className="row" style={{ gap: "10px" }}>
          <button
            className="btn"
            onClick={() => void handleCreateInvite()}
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
        <div className="card" style={{ marginTop: "20px", textAlign: "center" }}>
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

          <p style={{ wordBreak: "break-all" }}>
            <strong>Linkki:</strong> {inviteUrl}
          </p>

          <div className="row" style={{ justifyContent: "center", gap: "10px" }}>
            <button
              className="btn"
              onClick={() => inviteCode && void copyText(inviteCode, "Koodi kopioitu")}
            >
              Kopioi koodi
            </button>
            <button
              className="btn"
              onClick={() => inviteUrl && void copyText(inviteUrl, "Linkki kopioitu")}
            >
              Kopioi linkki
            </button>
          </div>
        </div>
      )}

      <div className="spacer-lg" />

      <AdminUsersCard
        users={users}
        loading={loading}
        deletingId={deletingId}
        onRefresh={loadUsers}
        onDelete={handleDeleteUser}
        onOpenSummaries={loadSummaries}
        onOpenDetails={openUserDetails}
      />

      <AdminSummaryModal
        open={Boolean(summariesUserId)}
        userId={summariesUserId}
        loading={summariesLoading}
        summaries={summaries}
        onClose={clearSummaries}
        onDeleteSummaries={handleDeleteSummaries}
      />

      <AdminUserDetailsModal
        open={Boolean(selectedUserId)}
        userId={selectedUserId}
        messages={messages}
        messagesLoading={messagesLoading}
        profileState={profileState}
        profileLoading={profileLoading}
        onClose={clearUserDetails}
        onResetPasskeys={handleResetPasskeys}
        onResetProfileState={handleResetProfileState}
      />
    </div>
  );
};

export default AdminDashboard;