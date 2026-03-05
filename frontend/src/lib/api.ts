// Shape of API errors returned by backend or network layer
export type ApiError =
  | { error: string; message?: string }
  | { error: "network_error"; message: string };

// Base URL for API requests, read from Vite env
const base = ((import.meta as any).env?.VITE_API_BASE as string | undefined) ?? "";

// Convert non-OK responses to ApiError, trying to parse JSON body if possible
const toError = async (res: Response): Promise<ApiError> => {
  try {
    // Attempt to read backend error payload
    const j = (await res.json()) as any;
    if (j && typeof j.error === "string") return j as ApiError;
  } catch {
    // Ignore JSON parsing failures
  }

  // Fallback error if response body is not usable
  return { error: "network_error", message: `HTTP ${res.status}` };
};

export const api = {
  // Perform GET request and parse JSON response
  get: async <T>(path: string): Promise<T> => {
    const res = await fetch(base + path, { credentials: "include" });

    // Convert failed responses to ApiError
    if (!res.ok) throw await toError(res);

    // Return parsed JSON payload
    return (await res.json()) as T;
  },

  // Perform POST request with JSON body
  post: async <T>(path: string, body?: unknown): Promise<T> => {
    // Ensure body is always an object
    const payload = body === undefined ? {} : body;

    const res = await fetch(base + path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    // Handle API error responses
    if (!res.ok) throw await toError(res);

    // Some endpoints return no content
    if (res.status === 204) return undefined as T;

    // Parse JSON response
    return (await res.json()) as T;
  },

  // Perform DELETE request
  del: async <T>(path: string): Promise<T> => {
    const res = await fetch(base + path, {
      method: "DELETE",
      credentials: "include",
    });

    // Convert failed responses to ApiError
    if (!res.ok) throw await toError(res);

    // Handle empty response
    if (res.status === 204) return undefined as T;

    // Parse JSON response
    return (await res.json()) as T;
  },
};