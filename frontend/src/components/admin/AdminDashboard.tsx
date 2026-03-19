import React, { useCallback, useEffect, useState } from "react";
import { AdminSummaryModal } from "./AdminSummaryModal";
import { AdminUserDetailsModal } from "./AdminUserDetailsModal";
import { AdminUsersCard } from "./AdminUsersCard";
import { AdminSidebar } from "./AdminSidebar";
import { AdminHeader } from "./AdminHeader";
import { AdminInviteView } from "./AdminInviteView";

import { useAdminUserDetails } from "../../hooks/useAdminUserDetails";
import { useAdminUsers } from "../../hooks/useAdminUsers";
import { useAdminInvite } from "../../hooks/useAdminInvite";

import { adminApi } from "../../lib/adminApi";
import type { ApiError } from "../../lib/api";
import { prettyApiError } from "../../lib/prettyError";
import { useToast } from "../../state/toast";

type AdminDashboardProps = {
  onLogout: () => void | Promise<void>;
};

type AdminView = "users" | "invite";

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onLogout,
}) => {
  const toast = useToast();

  const [activeView, setActiveView] = useState<AdminView>("users");

  const {
    inviteCode,
    inviteUrl,
    inviteLoading,
    createInvite,
    copyInviteCode,
    clearInvite,
  } = useAdminInvite();

  const [usersUnauthorizedTick, setUsersUnauthorizedTick] = useState(0);
  const [detailsUnauthorizedTick, setDetailsUnauthorizedTick] = useState(0);

  const handleUsersUnauthorized = useCallback(() => {
    setUsersUnauthorizedTick((v) => v + 1);
  }, []);

  const handleDetailsUnauthorized = useCallback(() => {
    setDetailsUnauthorizedTick((v) => v + 1);
  }, []);

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
    onUnauthorized: handleUsersUnauthorized,
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
    onUnauthorized: handleDetailsUnauthorized,
  });

  useEffect(() => {
    if (usersUnauthorizedTick === 0) return;
    clearInvite();
    clearSummaries();
    clearUsers();
    toast.show("Istunto vanheni. Kirjaudu uudelleen.");
  }, [usersUnauthorizedTick, clearInvite, clearSummaries, clearUsers, toast]);

  useEffect(() => {
    if (detailsUnauthorizedTick === 0) return;
    clearInvite();
    clearSummaries();
    clearUserDetails();
    clearUsers();
    toast.show("Istunto vanheni. Kirjaudu uudelleen.");
  }, [
    detailsUnauthorizedTick,
    clearInvite,
    clearSummaries,
    clearUserDetails,
    clearUsers,
    toast,
  ]);

  const clearLocalAdminData = useCallback(() => {
    clearInvite();
    clearSummaries();
    clearUserDetails();
    clearUsers();
  }, [clearInvite, clearSummaries, clearUserDetails, clearUsers]);

  const openView = useCallback((view: AdminView) => {
    setActiveView(view);
  }, []);

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
        await adminApi.del(`/admin/users/${encodeURIComponent(userId)}/summaries`);
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
        await adminApi.del(`/admin/users/${encodeURIComponent(userId)}/profile-state`);
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
    <div className="admin-shell">
      <AdminSidebar
        activeView={activeView}
        onOpenView={openView}
        onLogout={() => {
          void handleLogoutClick();
        }}
      />

      <main className="admin-main">
        <div className="container admin-container">
          <AdminHeader
            title={activeView === "users" ? "Käyttäjät" : "Luo study card"}
          />

          {activeView === "users" && (
            <AdminUsersCard
              users={users}
              loading={loading}
              deletingId={deletingId}
              onRefresh={loadUsers}
              onDelete={handleDeleteUser}
              onOpenSummaries={loadSummaries}
              onOpenDetails={openUserDetails}
            />
          )}

          {activeView === "invite" && (
            <AdminInviteView
              inviteCode={inviteCode}
              inviteUrl={inviteUrl}
              inviteLoading={inviteLoading}
              onCreateInvite={() => void createInvite()}
              onCopyInviteCode={() => void copyInviteCode()}
            />
          )}
        </div>

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
      </main>
    </div>
  );
};