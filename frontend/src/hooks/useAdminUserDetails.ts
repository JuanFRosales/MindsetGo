import { useCallback, useState } from "react";
import { adminApi } from "../lib/adminApi";
import type { ApiError } from "../lib/api";
import type { AdminMessage, AdminProfileState } from "../types/adminTypes";

type UseAdminUserDetailsOptions = {
  onUnauthorized?: () => void;
};

export type UseAdminUserDetailsState = {
  selectedUserId: string | null;
  messages: AdminMessage[];
  messagesLoading: boolean;
  profileState: AdminProfileState | null;
  profileLoading: boolean;
  openUserDetails: (userId: string) => Promise<void>;
  clearUserDetails: () => void;
};

const isUnauthorizedError = (err: unknown): boolean => {
  const apiErr = err as Partial<ApiError> | undefined;
  if (!apiErr) return false;
  if (apiErr.error === "unauthorized") return true;
  if (typeof apiErr.message === "string" && apiErr.message.includes("401")) {
    return true;
  }
  return false;
};

export const useAdminUserDetails = (
  options: UseAdminUserDetailsOptions = {},
): UseAdminUserDetailsState => {
  const { onUnauthorized } = options;

  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AdminMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [profileState, setProfileState] = useState<AdminProfileState | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);

  const clearUserDetails = useCallback(() => {
    setSelectedUserId(null);
    setMessages([]);
    setMessagesLoading(false);
    setProfileState(null);
    setProfileLoading(false);
  }, []);

  const handleUnauthorized = useCallback(() => {
    clearUserDetails();
    onUnauthorized?.();
  }, [clearUserDetails, onUnauthorized]);

  const openUserDetails = useCallback(
    async (userId: string) => {
      setSelectedUserId(userId);
      setMessagesLoading(true);
      setProfileLoading(true);

      try {
        const [messagesData, profileData] = await Promise.all([
          adminApi.get<AdminMessage[]>(
            `/admin/users/${encodeURIComponent(userId)}/messages`,
          ),
          adminApi.get<AdminProfileState>(
            `/admin/users/${encodeURIComponent(userId)}/profile-state`,
          ),
        ]);

        setMessages(Array.isArray(messagesData) ? messagesData : []);
        setProfileState(profileData ?? null);
      } catch (err) {
        if (isUnauthorizedError(err)) {
          handleUnauthorized();
          return;
        }

        clearUserDetails();
        throw err;
      } finally {
        setMessagesLoading(false);
        setProfileLoading(false);
      }
    },
    [clearUserDetails, handleUnauthorized],
  );

  return {
    selectedUserId,
    messages,
    messagesLoading,
    profileState,
    profileLoading,
    openUserDetails,
    clearUserDetails,
  };
};