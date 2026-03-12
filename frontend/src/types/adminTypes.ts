export type AdminUser = {
  id: string;
  createdAt?: string | null;
  lastActiveAt?: string | null;
  expiresAt?: string | null;
};

export type UserSummary = {
  id: string;
  createdAt?: string | null;
  updatedAt?: string | null;
  summary?: string | null;
};

export type AdminMessage = {
  id: string;
  role: "user" | "assistant" | string;
  content: string;
  createdAt?: string | null;
};

export type AdminProfileState = {
  userId: string;
  stateJson: unknown;
  createdAt?: string | null;
  updatedAt?: string | null;
};