import React from "react";

type AdminHeaderProps = {
  title: string;
};

export const AdminHeader: React.FC<AdminHeaderProps> = ({ title }) => {
  return (
    <div className="topbar">
      <div className="brand">{title}</div>
    </div>
  );
};