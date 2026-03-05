import React, { createContext, useContext, useMemo, useState } from "react";

type ToastState = {
  message: string | null;
  show: (msg: string, ms?: number) => void;
  clear: () => void;
};

const ToastContext = createContext<ToastState | null>(null);

export const useToast = (): ToastState => {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("ToastContext missing");
  return ctx;
};

export const ToastProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [message, setMessage] = useState<string | null>(null);

  const clear = () => setMessage(null);

  const show = (msg: string, ms = 3200) => {
    setMessage(msg);
    window.setTimeout(() => setMessage((m) => (m === msg ? null : m)), ms);
  };

  const value = useMemo(() => ({ message, show, clear }), [message]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {message ? <div className="toast" role="status">{message}</div> : null}
    </ToastContext.Provider>
  );
};
