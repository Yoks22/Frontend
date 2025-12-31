// src/components/SyncLogs.js
import React, { useEffect, useState } from "react";
const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";

export default function SyncLogs() {
  const [logs, setLogs] = useState([]);
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/sync_logs`);
        const j = await r.json();
        if (mounted) setLogs(j || []);
      } catch (e) {
        console.error(e);
      }
    })();
    return () => (mounted = false);
  }, []);
  if (!logs.length) return <div className="empty">No logs</div>;
  return (
    <div className="logs">
      {logs.slice(0, 8).map((l) => (
        <div key={l.id} className="log-row">
          <div className="log-left">
            <div className={`log-badge ${l.status === "success" ? "ok" : "bad"}`}>{l.module}</div>
            <div className="log-meta">
              <div className="muted small">{l.started_at ? new Date(l.started_at).toLocaleString() : ""}</div>
              <div className="small">{l.records_synced} records • {l.status}</div>
            </div>
          </div>
          <div className="log-msg muted">{l.message}</div>
        </div>
      ))}
    </div>
  );
}
