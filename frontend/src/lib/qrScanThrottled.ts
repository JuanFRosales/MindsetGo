import { api, type ApiError } from "./api";

export type QrScanResult = {
  userId: string;
  resolutionId: string;
  linked: boolean;
};

type ScanArgs = {
  qrId: string;
  inviteCode?: string;
};

const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

const COOLDOWN_MS = 1200;

let inFlight: Promise<QrScanResult> | null = null;
let lastKey = "";
let lastStartAt = 0;

const keyOf = (args: ScanArgs) => {
  const code = (args.inviteCode ?? "").trim();
  return `${args.qrId}::${code}`;
};

export const qrScanThrottled = async (args: ScanArgs): Promise<QrScanResult> => {
  const key = keyOf(args);
  const now = Date.now();

  if (inFlight && key === lastKey) return inFlight;

  const waitMs = Math.max(0, lastStartAt + COOLDOWN_MS - now);
  if (waitMs > 0 && key === lastKey) {
    await sleep(waitMs);
  }

  lastKey = key;
  lastStartAt = Date.now();

  const body: any = { qrId: args.qrId };
  if (args.inviteCode && args.inviteCode.trim()) body.inviteCode = args.inviteCode.trim();

  inFlight = api
    .post<QrScanResult>("/qr/scan", body)
    .finally(() => {
      inFlight = null;
    });

  return inFlight;
};

export const isRateLimitedError = (e: unknown): boolean => {
  const err = e as ApiError | undefined;
  if (!err) return false;
  return err.error === "rate_limited" || err.error === "too_many_requests";
};