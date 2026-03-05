import { api, type ApiError } from "./api";

// Result returned from QR scan endpoint
export type QrScanResult = {
  userId: string;
  resolutionId: string;
  linked: boolean;
};

// Arguments for scan request
type ScanArgs = {
  qrId: string;
  inviteCode?: string;
};

// Small async delay helper
const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// Minimum time between identical scans
const COOLDOWN_MS = 1200;

// Track active requests per key
const inFlight = new Map<string, Promise<QrScanResult>>();
let lastStartAt = 0;

// Build a unique key for throttling identical requests
const keyOf = (args: ScanArgs) => {
  const code = (args.inviteCode ?? "").trim();
  return `${args.qrId}::${code}`;
};

// Throttled QR scan request to avoid rapid duplicates
export const qrScanThrottled = async (args: ScanArgs): Promise<QrScanResult> => {
  const key = keyOf(args);
  const now = Date.now();

  // Reuse existing request for the same key
  const existing = inFlight.get(key);
  if (existing) return existing;

  // Enforce global cooldown
  const waitMs = Math.max(0, lastStartAt + COOLDOWN_MS - now);
  if (waitMs > 0) {
    await sleep(waitMs);
  }

  lastStartAt = Date.now();

  const body: any = { qrId: args.qrId };
  if (args.inviteCode && args.inviteCode.trim()) {
    body.inviteCode = args.inviteCode.trim();
  }

  const p = api
    .post<QrScanResult>("/qr/scan", body)
    .finally(() => {
      // Remove finished request
      inFlight.delete(key);
    });

  inFlight.set(key, p);

  return p;
};

// Detect API rate limit errors
export const isRateLimitedError = (e: unknown): boolean => {
  const err = e as ApiError | undefined;
  if (!err) return false;

  return err.error === "rate_limited" || err.error === "too_many_requests";
};