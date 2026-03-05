import { useCallback, useEffect, useRef, useState } from "react";
import { api, type ApiError } from "../lib/api";
import { prettyApiError } from "../lib/prettyError";
import { useAuth } from "../state/auth";
import { useToast } from "../state/toast";

export type ChatMsg = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: number;
};

export const useChatMessages = () => {
  const auth = useAuth();
  const toast = useToast();

  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement | null>(null);

  const scrollToBottom = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, []);

  const handleError = useCallback(
    (e: ApiError) => {
      toast.show(prettyApiError(e));
      if (e.error === "unauthorized") {
        auth.clear();
        window.location.assign("/");
      }
    },
    [auth, toast],
  );

  const loadedOnceRef = useRef(false);

  const load = useCallback(async () => {
    try {
      const hist = await api.get<ChatMsg[]>("/chat/history");
      setMessages(hist);
      queueMicrotask(scrollToBottom);
    } catch (e) {
      handleError(e as ApiError);
    }
  }, [handleError, scrollToBottom]);

  useEffect(() => {
    if (loadedOnceRef.current) return;
    if (auth.loading) return;

    loadedOnceRef.current = true;

    if (!auth.user) {
      window.location.assign("/");
      return;
    }

    void load();
  }, [auth.loading, auth.user, load]);

  const pollAssistant = useCallback(
    async (id: string) => {
      const start = Date.now();
      const maxMs = 60000;

      while (Date.now() - start < maxMs) {
        try {
          const m = await api.get<ChatMsg>(`/chat/message/${id}`);
          if (m.content && m.content !== "processing") {
            setMessages((prev) => {
              const exists = prev.some((x) => x.id === m.id);
              if (exists) return prev.map((x) => (x.id === m.id ? m : x));
              return [...prev, m].sort((a, b) => a.createdAt - b.createdAt);
            });
            queueMicrotask(scrollToBottom);
            return;
          }
        } catch {
          // ignore transient
        }

        await new Promise((r) => setTimeout(r, 900));
      }

      toast.show("Vastaus viivästyy. Voit jatkaa ja tarkistaa hetken päästä.");
    },
    [scrollToBottom, toast],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || busy) return;

    setBusy(true);
    setInput("");

    const optimistic: ChatMsg = {
      id: `local-${crypto.randomUUID()}`,
      role: "user",
      content: text,
      createdAt: Date.now(),
    };

    setMessages((prev) => [...prev, optimistic]);
    queueMicrotask(scrollToBottom);

    try {
      const res = await api.post<{ assistantMessageId: string }>("/chat/message", {
        message: text,
        conversationId: "default",
      });

      const placeholder: ChatMsg = {
        id: res.assistantMessageId,
        role: "assistant",
        content: "processing",
        createdAt: Date.now(),
      };

      setMessages((prev) => [...prev, placeholder]);
      queueMicrotask(scrollToBottom);
      void pollAssistant(res.assistantMessageId);
    } catch (e) {
      toast.show(prettyApiError(e as ApiError));
      setMessages((prev) => prev.filter((m) => m.id !== optimistic.id));
      setInput(text);
    } finally {
      setBusy(false);
    }
  }, [busy, input, pollAssistant, scrollToBottom, toast]);

  const clearChat = useCallback(async () => {
    if (!confirm("Tyhjennetäänkö keskustelu ja yhteenveto?") || busy) return;

    setBusy(true);
    try {
      await api.post("/chat/clear", {});
      setMessages([]);
      setInput("");
    } catch (e) {
      handleError(e as ApiError);
    } finally {
      setBusy(false);
    }
  }, [busy, handleError]);

  const deleteMessage = useCallback(
    async (id: string) => {
      if (busy) return;
      try {
        await api.del(`/chat/message/${id}`);
        setMessages((prev) => prev.filter((m) => m.id !== id));
      } catch (e) {
        handleError(e as ApiError);
      }
    },
    [busy, handleError],
  );

  return {
    listRef,
    messages,
    input,
    setInput,
    busy,
    send,
    clearChat,
    deleteMessage,
  };
};
