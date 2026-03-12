import { useCallback, useState } from "react";
import { adminApi } from "../lib/adminApi";
import type { ApiError } from "../lib/api";
import type { AdminUser, UserSummary } from "../types/adminTypes";

type UseAdminUsersOptions = {
  onUnauthorized?: () => void;
};

// Interface defining the state and actions returned by the hook
export type UseAdminUsersState = {
  users: AdminUser[];
  loading: boolean;
  deletingId: string | null;
  summaries: UserSummary[];
  summariesUserId: string | null;
  summariesLoading: boolean;
  loadUsers: () => Promise<void>;
  deleteUser: (userId: string) => Promise<void>;
  loadSummaries: (userId: string) => Promise<void>;
  clearSummaries: () => void;
  clearUsers: () => void;
};

// Helper to identify if an error is due to an expired or missing admin session
const isUnauthorizedError = (err: unknown): boolean => {
  const apiErr = err as Partial<ApiError> | undefined;
  if (!apiErr) return false;
  if (apiErr.error === "unauthorized") return true;
  if (typeof apiErr.message === "string" && apiErr.message.includes("401")) {
    return true;
  }
  return false;
};

export const useAdminUsers = (
  options: UseAdminUsersOptions = {},
): UseAdminUsersState => {
  const { onUnauthorized } = options;

  // --- Local State Management ---
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [summaries, setSummaries] = useState<UserSummary[]>([]);
  const [summariesUserId, setSummariesUserId] = useState<string | null>(null);
  const [summariesLoading, setSummariesLoading] = useState(false);

  // --- Cleanup Functions ---
  
  // Resets conversation summary state (e.g. when closing modal)
  const clearSummaries = useCallback(() => {
    setSummaries([]);
    setSummariesUserId(null);
    setSummariesLoading(false);
  }, []);

  // Resets the entire user list state
  const clearUsers = useCallback(() => {
    setUsers([]);
    setDeletingId(null);
  }, []);

  // Centralized logout/cleanup logic for unauthorized access
  const handleUnauthorized = useCallback(() => {
    clearUsers();
    clearSummaries();
    onUnauthorized?.();
  }, [clearUsers, clearSummaries, onUnauthorized]);

  // --- API Actions ---

  // Fetches all users for the admin dashboard
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await adminApi.get<AdminUser[]>("/admin/users");
      setUsers(Array.isArray(data) ? data : []);
    } catch (err) {
      if (isUnauthorizedError(err)) {
        handleUnauthorized();
        return;
      }
      throw err;
    } finally {
      setLoading(false);
    }
  }, [handleUnauthorized]);

  // Deletes a specific user by ID and syncs the local list
  const deleteUser = useCallback(
    async (userId: string) => {
      setDeletingId(userId);
      try {
        await adminApi.del(`/admin/users/${encodeURIComponent(userId)}`);
        // Optimistically remove user from the local state
        setUsers((prev) => prev.filter((user) => user.id !== userId));

        // If the summaries of the deleted user were open, clear them
        if (summariesUserId === userId) {
          clearSummaries();
        }
      } catch (err) {
        if (isUnauthorizedError(err)) {
          handleUnauthorized();
          return;
        }
        throw err;
      } finally {
        setDeletingId(null);
      }
    },
    [clearSummaries, handleUnauthorized, summariesUserId],
  );

  // Fetches conversation summaries for a specific user
  const loadSummaries = useCallback(
    async (userId: string) => {
      setSummariesLoading(true);
      setSummariesUserId(userId);
      try {
        const data = await adminApi.get<UserSummary[]>(
          `/admin/users/${encodeURIComponent(userId)}/summaries`,
        );
        setSummaries(Array.isArray(data) ? data : []);
      } catch (err) {
        if (isUnauthorizedError(err)) {
          handleUnauthorized();
          return;
        }
        setSummaries([]);
        setSummariesUserId(null);
        throw err;
      } finally {
        setSummariesLoading(false);
      }
    },
    [handleUnauthorized],
  );

  return {
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
  };
};