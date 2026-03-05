import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { type ApiError, api } from "../lib/api";
import { prettyApiError } from "../lib/prettyError";
import { qrScanThrottled, type QrScanResult } from "../lib/qrScanThrottled";
import { qrIdStore } from "../state/qrIdStore";
import { useToast } from "../state/toast";
import { QrScannerModal } from "../components/QrScannerModal";

const prettyError = (e: ApiError): string => {
  if (e.error === "invalid_inviteCode") return "Kutsukoodi ei kelpaa.";
  if (e.error === "missing_inviteCode") return "Tarvitsen kutsukoodin ensimmäisellä kerralla.";
  if (e.error === "rate_limited" || e.error === "too_many_requests") return "Liikaa pyyntöjä. Yritä hetken päästä uudelleen.";
  return prettyApiError(e);
};

export const StartPage: React.FC = () => {
  const nav = useNavigate();
  const toast = useToast();

  const [inviteCode, setInviteCode] = useState("");
  const [status, setStatus] = useState<"idle" | "checking" | "needsInvite" | "ready">("checking");
  const [qr, setQr] = useState<QrScanResult | null>(null);
  const [busy, setBusy] = useState(false);

  const [scannerOpen, setScannerOpen] = useState(false);

  const qrId = useMemo(() => qrIdStore.ensure(), []);

  const scan = async (code?: string) => {
    if (busy) return;
    setBusy(true);

    try {
      const res = await qrScanThrottled({ qrId, inviteCode: code });
      setQr(res);
      setStatus("ready");
      nav("/passkey", { state: { userId: res.userId, resolutionId: res.resolutionId } });
    } catch (e) {
      const err = e as ApiError;
      if (err.error === "missing_inviteCode") {
        setStatus("needsInvite");
        return;
      }
      toast.show(prettyError(err));
      setStatus("needsInvite");
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    void scan();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onContinue = async () => {
    await scan(inviteCode);
  };

  const onResetDevice = () => {
    qrIdStore.clear();
    const fresh = qrIdStore.ensure();
    toast.show("Laite tunniste nollattu.");

    setInviteCode("");
    setQr(null);
    setStatus("needsInvite");

    void api.post("/auth/logout").catch(() => {});

    void qrScanThrottled({ qrId: fresh }).catch(() => {});
  };

  const onScanned = (value: string) => {
    setInviteCode(value);
    void scan(value);
  };

  return (
    <div className="container">
      <div className="card" style={{ padding: 22 }}>
        <div className="h1" style={{ fontSize: 26 }}>Aloitetaan</div>
        <p className="p">
          Ensimmäisellä kerralla tarvitset kutsukoodin. Sen jälkeen sama koodi toimii jatkossakin kirjautumisvälineenä tällä laitteella.
        </p>

        {status === "checking" ? <div className="badge">Tarkistan tilaa</div> : null}

        {status === "needsInvite" ? (
          <>
            <input
              className="input"
              placeholder="Kutsukoodi"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
            />

            <div className="spacer" />

            <button className="btn primary" onClick={onContinue} disabled={busy || !inviteCode.trim()}>
              Jatka
            </button>

            <div className="spacer" />

            <button className="btn" onClick={() => setScannerOpen(true)} disabled={busy}>
              Skannaa kameralla
            </button>

            <div className="spacer-lg" />

            <div className="small">
              Jos vaihdoit laitetta tai haluat aloittaa alusta, voit nollata laitetunnisteen.
            </div>

            <button className="btn" onClick={onResetDevice} disabled={busy}>
              Nollaa laite
            </button>
          </>
        ) : null}

        {status === "ready" && qr ? <div className="badge">Valmis</div> : null}
      </div>

      <QrScannerModal open={scannerOpen} onClose={() => setScannerOpen(false)} onCode={onScanned} />
    </div>
  );
};