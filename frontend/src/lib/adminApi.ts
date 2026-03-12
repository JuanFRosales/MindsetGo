import type { ApiError } from "./api";

const toError = async (res: Response): Promise<ApiError> => {
  try {
    const j = (await res.json()) as any;
    if (j && typeof j.error === "string") {
      return j as ApiError;
    }
  } catch {
    // ignore
  }

  return {
    error: "network_error",
    message: `HTTP ${res.status}`,
  };
};

const buildUrl = (path: string): string => {
  if (!path.startsWith("/")) {
    throw new Error(`adminApi path must start with "/": ${path}`);
  }

  return path;
};

export const adminApi = {
  get: async <T>(path: string): Promise<T> => {
    const res = await fetch(buildUrl(path), {
      method: "GET",
      credentials: "include",
    });

    if (!res.ok) {
      throw await toError(res);
    }

    return (await res.json()) as T;
  },

  post: async <T>(path: string, body?: unknown): Promise<T> => {
    const res = await fetch(buildUrl(path), {
      method: "POST",
      credentials: "include",
      headers: {
        "content-type": "application/json",
      },
      body: JSON.stringify(body ?? {}),
    });

    if (!res.ok) {
      throw await toError(res);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return (await res.json()) as T;
  },

  del: async <T>(path: string): Promise<T> => {
    const res = await fetch(buildUrl(path), {
      method: "DELETE",
      credentials: "include",
    });

    if (!res.ok) {
      throw await toError(res);
    }

    if (res.status === 204) {
      return undefined as T;
    }

    return (await res.json()) as T;
  },
};