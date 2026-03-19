import { useCallback, useState } from "react";
import { adminApi } from "../lib/adminApi";
import type { ApiError } from "../lib/api";
import { prettyApiError } from "../lib/prettyError";
import { useToast } from "../state/toast";

type InviteResponse = {
  code: string;
  expiresAt: string;
};

const buildInviteUrl = (code: string): string => {
  const origin = window.location.origin;
  return `${origin}/qr?code=${encodeURIComponent(code)}`;
};

export const useAdminInvite = () => {
  const toast = useToast();

  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteUrl, setInviteUrl] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  const createInvite = useCallback(async () => {
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

  const copyInviteCode = useCallback(async () => {
    if (!inviteCode) return;

    try {
      await navigator.clipboard.writeText(inviteCode);
      toast.show("Koodi kopioitu");
    } catch {
      toast.show("Kopiointi epäonnistui.");
    }
  }, [inviteCode, toast]);

  const clearInvite = useCallback(() => {
    setInviteCode(null);
    setInviteUrl(null);
  }, []);

  return {
    inviteCode,
    inviteUrl,
    inviteLoading,
    createInvite,
    copyInviteCode,
    clearInvite,
  };
};