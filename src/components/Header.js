// src/components/Header.js
import React, { useState, useEffect } from "react";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";
const AUTO_DEFAULT = Number(process.env.REACT_APP_AUTO_SYNC_SECONDS || 3600);

export default function Header() {
  const [autoEnabled, setAutoEnabled] = useState(true);
  const [countdown, setCountdown] = useState(AUTO_DEFAULT);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    const t = setInterval(() => {
      setCountdown((c) => (autoEnabled ? (c > 0 ? c - 1 : AUTO_DEFAULT) : c));
    }, 1000);
    return () => clearInterval(t);
  }, [autoEnabled]);

  useEffect(() => {
    if (countdown <= 0 && autoEnabled) {
      triggerSync();
    }
    // eslint-disable-next-line
  }, [countdown, autoEnabled]);

  const human = (s) => {
    if (s >= 3600) return Math.round(s / 3600) + "h";
    if (s >= 60) return Math.round(s / 60) + "m";
    return s + "s";
  };

  async function triggerSync() {
    setSyncing(true);
    try {
      await fetch(`${API_BASE}/sync`, { method: "POST" });
      setCountdown(AUTO_DEFAULT);
    } catch (e) {
      console.error("sync error", e);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <header className="topbar">
      <div className="brand">
        <div className="brand-mark">M</div>
        <div>
          <h1>Marslab — Bigin Sync</h1>
          <p className="muted">Realtime sync dashboard • unique UI</p>
        </div>
      </div>

      <div className="controls">
        <div className="auto-sync">
          <label className="switch">
            <input type="checkbox" checked={autoEnabled} onChange={(e) => setAutoEnabled(e.target.checked)} />
            <span className="slider" />
          </label>
          <div style={{ marginLeft: 8 }}>
            <div className="small">Auto-sync</div>
            <div className="tiny muted">{autoEnabled ? `Next: ${human(countdown)}` : "Paused"}</div>
          </div>
        </div>

        <button className={`btn primary ${syncing ? "busy" : ""}`} onClick={triggerSync} disabled={syncing}>
          {syncing ? "Syncing..." : "Run Sync"}
        </button>
      </div>
    </header>
  );
}
