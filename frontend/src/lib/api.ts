export type ApiError =
  | { error: string; message?: string }
  | { error: "network_error"; message: string };

const base = ((import.meta as any).env?.VITE_API_BASE as string | undefined) ?? "";

const toError = async (res: Response): Promise<ApiError> => {
  try {
    const j = (await res.json()) as any;
    if (j && typeof j.error === "string") return j as ApiError;
  } catch {
    // ignore
  }
  return { error: "network_error", message: `HTTP ${res.status}` };
};

export const api = {
  async get<T>(path: string): Promise<T> {
    const res = await fetch(base + path, { credentials: "include" });
    if (!res.ok) throw await toError(res);
    return (await res.json()) as T;
  },

  async post<T>(path: string, body?: unknown): Promise<T> {
    const payload = body === undefined ? {} : body;

    const res = await fetch(base + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw await toError(res);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  },

  async del<T>(path: string): Promise<T> {
    const res = await fetch(base + path, {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) throw await toError(res);
    if (res.status === 204) return undefined as T;
    return (await res.json()) as T;
  },
};