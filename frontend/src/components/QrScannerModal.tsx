import React, { useEffect, useMemo, useRef, useState } from "react";

type Props = {
  open: boolean;
  onClose: () => void;
  onCode: (value: string) => void;
};

type ScanState = "idle" | "starting" | "running" | "unsupported" | "denied" | "failed";
// QrScannerModal component for scanning QR codes using the BarcodeDetector API, with error handling and user feedback for different states of the scanning process.
export const QrScannerModal: React.FC<Props> = ({ open, onClose, onCode }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const [state, setState] = useState<ScanState>("idle");
  const [note, setNote] = useState<string>("");

  const canUse = useMemo(() => {
    const w = window as any;
    return typeof w.BarcodeDetector === "function";
  }, []);

  const stopAll = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = null;

    if (videoRef.current) {
      videoRef.current.pause();
      (videoRef.current as any).srcObject = null;
    }

    if (streamRef.current) {
      for (const t of streamRef.current.getTracks()) t.stop();
      streamRef.current = null;
    }
  };
// Effect hook to manage the lifecycle of the QR code scanning process, starting the camera and barcode detection when the modal is opened, and cleaning up resources when closed or when errors occur.
  useEffect(() => {
    if (!open) {
      stopAll();
      setState("idle");
      setNote("");
      return;
    }

    if (!canUse) {
      setState("unsupported");
      setNote("Selain ei tue QR tunnistusta. Kokeile päivittää selain tai syötä koodi käsin.");
      return;
    }

    let cancelled = false;

    // Start the camera and scanning process
    const start = async () => {
      setState("starting");
      setNote("");

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (cancelled) return;

        streamRef.current = stream;

        const v = videoRef.current;
        if (!v) return;

        (v as any).srcObject = stream;
        await v.play();

        const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });

        setState("running");
        setNote("Näytä koodi kameralle.");
// Animation loop to continuously scan for QR codes in the video stream
        const tick = async () => {
          try {
            if (!videoRef.current) return;

            const barcodes = await detector.detect(videoRef.current);
            const first = barcodes?.[0]?.rawValue;

            if (first && typeof first === "string") {
              onCode(first.trim());
              onClose();
              return;
            }
          } catch {
            // ignore per frame errors
          }

          rafRef.current = requestAnimationFrame(tick);
        };

        rafRef.current = requestAnimationFrame(tick);
      } catch (e: any) {
        if (cancelled) return;

        if (e?.name === "NotAllowedError" || e?.name === "SecurityError") {
          setState("denied");
          setNote("Kameralupa puuttuu. Salli kamera selaimen asetuksista ja yritä uudelleen.");
        } else {
          setState("failed");
          setNote("Kameran käynnistys epäonnistui.");
        }
      }
    };

    void start();

    return () => {
      cancelled = true;
      stopAll();
    };
  }, [open, canUse, onClose, onCode]);

  if (!open) return null;

  return (
    <>
      <div className="modalOverlay" onClick={onClose} />
      <div className="modalCard" role="dialog" aria-modal="true" aria-label="Skannaa QR">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ fontSize: 16, opacity: 0.9 }}>Skannaa QR</div>
          <button className="icon-btn" style={{ width: 40, height: 40 }} onClick={onClose} aria-label="Sulje">
            ✕
          </button>
        </div>

        <div style={{ height: 10 }} />

        <div
          style={{
            borderRadius: 18,
            overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.18)",
            background: "rgba(0,0,0,0.20)",
          }}
        >
          <video ref={videoRef} style={{ width: "100%", display: "block" }} playsInline muted />
        </div>

        <div style={{ height: 10 }} />

        <div className="small" style={{ margin: 0 }}>
          {note || (state === "starting" ? "Käynnistän kameraa" : "")}
        </div>
      </div>
    </>
  );
};