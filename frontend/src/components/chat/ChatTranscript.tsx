import React from "react";
import type { ChatMsg } from "../../hooks/useChatMessages";

type Props = {
  listRef: React.RefObject<HTMLDivElement | null>;
  messages: ChatMsg[];
  onDeleteMessage: (id: string) => void;
};
// ChatTranscript component for displaying the chat history, with messages aligned based on their role and an option to delete messages.
export const ChatTranscript: React.FC<Props> = ({ listRef, messages, onDeleteMessage }) => {
  return (
    <div
      ref={listRef}
      style={{ flex: 1, overflowY: "auto", padding: 8, display: "flex", flexDirection: "column", gap: 10 }}
    >
      {messages.length === 0 ? (
        <div className="small" style={{ padding: 10 }}>
          Kirjoita ensimmäinen viesti. Voit aloittaa vaikka kertomalla, mikä toi sinut tänne.
        </div>
      ) : null}

      {messages.map((m) => {
        const canDelete = !m.id.startsWith("local-") && m.content !== "processing";

        return (
          <div
            key={m.id}
            style={{
              alignSelf: m.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "88%",
            }}
          >
            <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
              <div
                style={{
                  padding: "12px 14px",
                  borderRadius: 22,
                  background: m.role === "user" ? "rgba(255,255,255,0.10)" : "rgba(255,255,255,0.16)",
                  border: "1px solid rgba(255,255,255,0.18)",
                  backdropFilter: "blur(14px)",
                  WebkitBackdropFilter: "blur(14px)",
                  color: "rgba(255,255,255,0.92)",
                  lineHeight: 1.35,
                  whiteSpace: "pre-wrap",
                }}
              >
                {m.content === "processing" ? "Kirjoitan" : m.content}
              </div>

              {canDelete ? (
                <button
                  className="icon-btn"
                  style={{ width: 36, height: 36, borderRadius: 12, opacity: 0.9 }}
                  onClick={() => onDeleteMessage(m.id)}
                  aria-label="Poista viesti"
                  title="Poista"
                >
                  X
                </button>
              ) : null}
            </div>
          </div>
        );
      })}
    </div>
  );
};