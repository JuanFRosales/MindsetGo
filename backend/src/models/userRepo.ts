import type { Database } from "sqlite";
import type { User } from "./user.ts";
import { uuidv7 } from "../utils/uuidv7.ts";

const nowMs = (): number => Date.now();

const daysFromNow = (days: number): number => nowMs() + days * 24 * 60 * 60 * 1000;

export const createUser = async (db: Database, ttlDays: number = 14): Promise<User> => {
  const createdAt = nowMs();
  const user: User = {
    id: uuidv7(createdAt),
    createdAt,
    lastActiveAt: createdAt,
    expiresAt: daysFromNow(ttlDays)
  };

  await db.run(
    "INSERT INTO users (id, createdAt, lastActiveAt, expiresAt) VALUES (?, ?, ?, ?)",
    user.id,
    user.createdAt,
    user.lastActiveAt,
    user.expiresAt
  );

  return user;
};

export const getUserById = async (db: Database, id: string): Promise<User | null> => {
  const row = await db.get<User>(
    "SELECT id, createdAt, lastActiveAt, expiresAt FROM users WHERE id = ?",
    id
  );
  return row ?? null;
};

export const listUsers = async (db: Database, limit: number = 50): Promise<User[]> => {
  const safeLimit = Math.max(1, Math.min(200, limit));
  const rows = await db.all<User[]>(
    "SELECT id, createdAt, lastActiveAt, expiresAt FROM users ORDER BY createdAt DESC LIMIT ?",
    safeLimit
  );
  return (rows as unknown as User[]) ?? [];
};

export const touchUser = async (db: Database, id: string): Promise<void> => {
  const ts = nowMs();
  await db.run("UPDATE users SET lastActiveAt = ? WHERE id = ?", ts, id);
};

export const deleteUser = async (db: Database, id: string): Promise<boolean> => {
  const res = await db.run("DELETE FROM users WHERE id = ?", id);
  return (res.changes ?? 0) > 0;
};
