import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, type ApiError } from "../lib/api";
import { prettyApiError } from "../lib/prettyError";
import { useToast } from "../state/toast";

const prettyError = (e: ApiError): string => {
  return prettyApiError(e);
};

export const ProfilePage: React.FC = () => {
  const nav = useNavigate();
  const toast = useToast();
  const [profile, setProfile] = useState<any>({});
  const [summary, setSummary] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      try {
        const s = await api.get<{ summary: string }>("/chat/summary?conversationId=default");
        const p = await api.get<any>("/profile");
        setSummary(s.summary ?? "");
        setProfile(p ?? {});
      } catch (e) {
        const err = e as ApiError;
        toast.show(prettyError(err));
        if (err.error === "unauthorized") nav("/");
      }
    };
    void load();
  }, [nav, toast]);

  return (
    <div className="container">
      <div className="card" style={{ padding: 22 }}>
        <div className="h1" style={{ fontSize: 26 }}>Profiili</div>
        <p className="p">Tässä näkyy tiivistelmä ja alustava potilasprofiili, joka päivittyy keskustelun perusteella.</p>

        <div className="badge" style={{ marginBottom: 10 }}>Yhteenveto</div>
        <div
          style={{
            padding: "12px 14px",
            borderRadius: 22,
            background: "rgba(255,255,255,0.10)",
            border: "1px solid rgba(255,255,255,0.18)",
            backdropFilter: "blur(14px)",
            WebkitBackdropFilter: "blur(14px)",
            color: "rgba(255,255,255,0.90)",
            lineHeight: 1.35,
            whiteSpace: "pre-wrap",
            minHeight: 64,
          }}
        >
          {summary ? summary : "Ei vielä yhteenvetoa."}
        </div>

        <div className="spacer-lg" />

        <div className="badge" style={{ marginBottom: 10 }}>Potilasprofiili</div>
        <pre
          style={{
            margin: 0,
            padding: "12px 14px",
            borderRadius: 22,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.18)",
            overflowX: "auto",
            color: "rgba(255,255,255,0.88)",
          }}
        >
{JSON.stringify(profile, null, 2)}
        </pre>

        <div className="spacer" />
        <button className="btn primary" onClick={() => nav("/chat")}>
          Takaisin keskusteluun
        </button>
      </div>
    </div>
  );
};
