import React, { useEffect, useState } from "react";

type Props = {
  initialValue?: string;
  // Callback triggered after successful API authentication
  onLoginSuccess: () => Promise<void>;
};

const AdminLoginCard: React.FC<Props> = ({
  initialValue = "",
  onLoginSuccess,
}) => {
  const [value, setValue] = useState(initialValue);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmed = value.trim();
    if (!trimmed || submitting) return;

    setSubmitting(true);
    setError(null);

    try {
      // Internal fetch call to perform the login
      const response = await fetch("/admin/login", {
        method: "POST",
        credentials: "include", // Required to set the session cookie
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: trimmed }),
      });

      if (!response.ok) {
        let message = `Login failed (${response.status})`;

        try {
          const data = await response.json();
          if (data?.message) message = data.message;
        } catch {}

        throw new Error(message);
      }

      // Proceed to parent callback on success
      await onLoginSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="card">
      <div className="card-title">Admin kirjautuminen</div>
      <div className="muted" style={{ marginBottom: 12 }}>
        Syötä admin avain kirjautuaksesi sisään.
      </div>

      <form onSubmit={handleSubmit}>
        <label className="label" htmlFor="admin-key-input">
          Admin avain
        </label>

        <input
          id="admin-key-input"
          className="input"
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Anna admin avain"
          disabled={submitting}
        />

        {/* Display login error to user */}
        {error && (
          <div style={{ color: "red", fontSize: "14px", marginTop: "8px" }}>
            {error}
          </div>
        )}

        <div className="spacer" />

        <button
          type="submit"
          className="btn primary"
          disabled={submitting || !value.trim()}
        >
          {submitting ? "Kirjaudutaan..." : "Kirjaudu"}
        </button>
      </form>
    </div>
  );
};

export default AdminLoginCard;
