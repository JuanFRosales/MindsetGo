import React from "react";

type AdminView = "users" | "invite";

type AdminSidebarProps = {
  activeView: AdminView;
  onOpenView: (view: AdminView) => void;
  onLogout: () => void;
};

export const AdminSidebar: React.FC<AdminSidebarProps> = ({
  activeView,
  onOpenView,
  onLogout,
}) => {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">Admin</div>

      <button
        className={`btn ${activeView === "users" ? "primary" : ""}`}
        onClick={() => onOpenView("users")}
      >
        Käyttäjät
      </button>

      <div className="spacer" />

      <button
        className={`btn ${activeView === "invite" ? "primary" : ""}`}
        onClick={() => onOpenView("invite")}
      >
        Luo study card
      </button>

      <div className="spacer" />

      <button className="btn" onClick={onLogout}>
        Logout
      </button>
    </aside>
  );
};