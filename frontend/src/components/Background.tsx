import React from "react";
import "./background.css";

export const Background: React.FC = () => {
  return (
    <div className="bg-root" aria-hidden="true">
      <div className="bg-blob bg-blob-a" />
      <div className="bg-blob bg-blob-b" />
      <div className="bg-blob bg-blob-c" />
      <div className="bg-vignette" />
    </div>
  );
};
