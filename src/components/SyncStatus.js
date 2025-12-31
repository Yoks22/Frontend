// src/components/SyncStatus.js
import React, { useEffect, useState } from "react";
import Icon3D from "./Icon3D";
const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";

export default function SyncStatus() {
  const [stats, setStats] = useState({});
  const [last, setLast] = useState(null);
  const [status, setStatus] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/stats`);
        const j = await r.json();
        const logs = await (await fetch(`${API_BASE}/sync_logs`)).json();
        if (mounted) {
          setStats(j || {});
          setLast(logs && logs[0] ? logs[0] : null);
          setStatus(logs && logs[0] ? logs[0].status : null);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => (mounted = false);
  }, []);

  const total = Object.values(stats || {}).reduce((a, b) => a + Number(b || 0), 0);

  return (
    <div className="sync-status-card">
      <div className="status-left">
        <div className="totals">
          <h3>Total Records</h3>
          <div className="totals-row">
            <div className="big-count">{Number(total).toLocaleString()}</div>
            <div className="totals-icons">
              <Icon3D size={44}><div className="icon-inner">C</div></Icon3D>
              <Icon3D size={44}><div className="icon-inner">A</div></Icon3D>
              <Icon3D size={44}><div className="icon-inner">P</div></Icon3D>
            </div>
          </div>
          <div className="small muted">Last: {last ? new Date(last.started_at).toLocaleString() : "—"}</div>
        </div>
      </div>

      <div className="status-right">
        <div className={`sync-pill ${status === "success" ? "ok" : status === "failed" ? "bad" : ""}`}>
          {status || "Idle"}
        </div>
        <div className="sync-message">{last ? last.message : "No recent sync"}</div>
        <div className="sync-actions">
          <button className="btn ghost" onClick={() => window.open(`${API_BASE}/export/contacts`, "_blank")}>Export</button>
        </div>
      </div>
    </div>
  );
}
