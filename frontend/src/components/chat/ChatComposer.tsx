import React from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onSend: () => void;
  busy: boolean;
};
// ChatComposer component for composing and sending chat messages, with an input field and a send button.
export const ChatComposer: React.FC<Props> = ({ value, onChange, onSend, busy }) => {
  return (
    <div style={{ display: "flex", gap: 10, padding: 8 }}>
      <input
        className="input"
        placeholder="Kirjoita"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            onSend();
          }
        }}
      />
      <button
        className="btn primary"
        onClick={onSend}
        disabled={busy || !value.trim()}
        style={{ width: 120 }}
      >
        Lähetä
      </button>
    </div>
  );
};
