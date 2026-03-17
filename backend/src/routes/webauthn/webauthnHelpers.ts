import { createHash } from "node:crypto";

const DASH = String.fromCharCode(45);

// User ID is hashed to 32 bytes to create a stable identifier for the authenticator
export const userIdToBytes = (userId: string): Uint8Array =>
  createHash("sha256").update(userId, "utf8").digest();

export const padB64 = (s: string): string => {
  const pad = (4 - (s.length % 4)) % 4;
  return s + "=".repeat(pad);
};

// Convert base64url string to ArrayBuffer
export const b64uToArrayBuffer = (s: string): ArrayBuffer => {
  const b64 = padB64(
    s.replace(new RegExp(DASH, "g"), "+").replace(/_/g, "/"),
  );
  const buf = Buffer.from(b64, "base64");
  return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
};

// Convert ArrayBuffer or Buffer to base64url string
export const bufLikeToB64u = (b: ArrayBuffer | Uint8Array | Buffer): string => {
  const u8 =
    b instanceof ArrayBuffer
      ? new Uint8Array(b)
      : Buffer.isBuffer(b)
        ? b
        : new Uint8Array(b.buffer, b.byteOffset, b.byteLength);

  return Buffer.from(u8)
    .toString("base64")
    .replace(/\+/g, DASH)
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
};

// Simple check to see if the public key is in PEM format
export const isPem = (s: string): boolean => s.includes("BEGIN PUBLIC KEY");