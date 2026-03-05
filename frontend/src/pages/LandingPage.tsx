import React from "react";
import { useNavigate } from "react-router-dom";
import { qrIdStore } from "../state/qrIdStore";

export const LandingPage: React.FC = () => {
  const nav = useNavigate();

  const onStart = () => {
    qrIdStore.ensure();
    nav("/start");
  };

  return (
    <div className="container">
      <div className="spacer-lg" />
      <div className="card" style={{ padding: 22 }}>
        <div className="h1" style={{ fontFamily: "ui-serif, Georgia, serif", fontStyle: "italic" }}>
          Tervetuloa
        </div>
        <p className="p">
          Tämä on rauhallinen tila, jossa voit kirjoittaa vapaasti. Tarkoitus on muodostaa selkeä potilasprofiili
          keskustelun perusteella.
        </p>
        <button className="btn primary" onClick={onStart}>
          Aloita sessio
        </button>
        <div className="spacer" />
      </div>
    </div>
  );
};
