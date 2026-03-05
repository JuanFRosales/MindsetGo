import React, { useState } from "react";
import { Drawer } from "../components/Drawer";
import { MenuIcon } from "../components/icons";
import { ChatComposer } from "../components/chat/ChatComposer";
import { ChatTranscript } from "../components/chat/ChatTranscript";
import { useChatMessages } from "../hooks/useChatMessages";
import { useUserActions } from "../hooks/useUserActions";

export const ChatPage: React.FC = () => {
  const [open, setOpen] = useState(false);

  const {
    listRef,
    messages,
    input,
    setInput,
    busy,
    send,
    clearChat,
    deleteMessage,
  } = useChatMessages();

  const { logout, deleteUser, goProfile } = useUserActions();

  return (
    <div className="container">
      <div className="topbar">
        <div className="brand">Keskustelu</div>
        <button className="icon-btn" onClick={() => setOpen(true)} aria-label="Avaa valikko">
          <MenuIcon />
        </button>
      </div>

      <div className="card tight" style={{ height: "68dvh", padding: 12, display: "flex", flexDirection: "column" }}>
        <ChatTranscript listRef={listRef} messages={messages} onDeleteMessage={deleteMessage} />
        <ChatComposer value={input} onChange={setInput} onSend={send} busy={busy} />
      </div>

      <Drawer open={open} title="Valikko" onClose={() => setOpen(false)}>
        <p className="small">
          Kirjautuminen on sidottu passkeyhyn. Voit tyhjentää keskustelun, kirjautua ulos tai poistaa käyttäjän tältä laitteelta.
        </p>

        <button
          className="btn"
          onClick={() => {
            setOpen(false);
            goProfile();
          }}
        >
          Näytä profiili
        </button>

        <div className="spacer" />

        <button
          className="btn"
          onClick={() => {
            setOpen(false);
            void clearChat();
          }}
        >
          Tyhjennä keskustelu
        </button>

        <div className="spacer" />

        <button className="btn" onClick={logout}>
          Kirjaudu ulos
        </button>

        <div className="spacer" />

        <button className="btn danger" onClick={deleteUser}>
          Poista käyttäjäni
        </button>
      </Drawer>
    </div>
  );
};