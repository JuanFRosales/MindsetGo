import { randomBytes } from "node:crypto";

// Convert bytes to hexadecimal string
const hex = (bytes: Uint8Array): string => {
  return Buffer.from(bytes).toString("hex");
};

// Generate a UUIDv7 string based on the current time in milliseconds and random bytes
export const uuidv7 = (nowMs: number = Date.now()): string => {
  const time = BigInt(nowMs);

  // 48-bit timestamp in milliseconds from Unix epoch, converted to hex
  const tHex = time.toString(16).padStart(12, "0");

  // Generate 10 random bytes (80 bits), and convert to hex
  const r = randomBytes(10);
  const rHex = hex(r);

  // Slice the timestamp and random hex strings into parts for UUIDv7 format
  const p1 = tHex.slice(0, 8);
  const p2 = tHex.slice(8, 12);

  // Version 7 in the next 12 bits based on random bytes
  const randA = parseInt(rHex.slice(0, 4), 16);
  const p3 = (0x7000 | (randA & 0x0fff)).toString(16).padStart(4, "0");

  // Variant + random bits
  const randB = parseInt(rHex.slice(4, 8), 16);
  const p4 = (0x8000 | (randB & 0x3fff)).toString(16).padStart(4, "0");

  // Last 12 characters from random bytes
  const p5 = rHex.slice(8, 20);

  // Combine all parts into UUIDv7 format
  return `${p1}-${p2}-${p3}-${p4}-${p5}`;
};