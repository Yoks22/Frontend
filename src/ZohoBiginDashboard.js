import React, { useEffect, useState, useRef, useCallback } from "react";
import {
  RefreshCw,
  Database,
  Zap
} from "lucide-react";

const API_BASE = "http://localhost:5000/api";

export default function ZohoBiginDashboard() {
  const [modules, setModules] = useState([]);
  const [syncing, setSyncing] = useState(false);
  const [syncLog, setSyncLog] = useState(null);
  const [autoSync, setAutoSync] = useState(true);
  const [timeLeft, setTimeLeft] = useState(0);

  const topRef = useRef(null);

  /* ---------------- time helpers ---------------- */
  const nextSaturday10AM = useCallback(() => {
    const now = new Date();
    const target = new Date(now);
    target.setDate(now.getDate() + ((6 - now.getDay() + 7) % 7 || 7));
    target.setHours(10, 0, 0, 0);
    if (target <= now) target.setDate(target.getDate() + 7);
    return target;
  }, []);

  const secondsUntil = useCallback(() => {
    return Math.floor((nextSaturday10AM() - new Date()) / 1000);
  }, [nextSaturday10AM]);

  /* ---------------- api ---------------- */
  const fetchModules = useCallback(async () => {
    try {
      const r = await fetch(`${API_BASE}/modules`);
      const j = await r.json();
      if (j?.ok) setModules(j.modules || []);
    } catch (e) {
      console.error("fetchModules failed", e);
    }
  }, []);

  const runSync = useCallback(
    async (auto = false) => {
      if (syncing) return;
      setSyncing(true);
      try {
        const r = await fetch(`${API_BASE}/sync`, { method: "POST" });
        const j = await r.json();
        setSyncLog({
          ...j,
          trigger: auto ? "Automatic" : "Manual",
          time: new Date().toISOString()
        });
        await fetchModules();
      } catch (e) {
        console.error("runSync failed", e);
      } finally {
        setSyncing(false);
      }
    },
    [syncing, fetchModules]
  );

  /* ---------------- effects ---------------- */
  useEffect(() => {
    fetchModules();
    setTimeLeft(secondsUntil());
  }, [fetchModules, secondsUntil]);

  useEffect(() => {
    if (!autoSync) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          runSync(true);
          return secondsUntil();
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoSync, runSync, secondsUntil]);

  /* ---------------- utils ---------------- */
  const formatTime = (s) => {
    const h = Math.floor(s / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    return `${h.toString().padStart(2, "0")}:${m
      .toString()
      .padStart(2, "0")}:${sec.toString().padStart(2, "0")}`;
  };

  /* ---------------- render ---------------- */
  return (
    <div
      ref={topRef}
      className="relative max-w-7xl mx-auto px-6 py-6 space-y-10"
    >
      {/* Header */}
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Marslab — Zoho Bigin
          </h1>
          <p className="text-xs text-slate-400">
            Dark · Glossy · Automated Sync
          </p>
        </div>

        <button
          onClick={() => runSync(false)}
          disabled={syncing}
          className="btn-primary"
        >
          {syncing ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Zap className="w-4 h-4" />
          )}
          <span>{syncing ? "Syncing…" : "Run Sync"}</span>
        </button>
      </header>

      {/* Auto Sync Box */}
      <section className="glass-card flex items-center justify-between">
        <div>
          <div className="text-xs uppercase tracking-widest text-slate-400">
            Auto Sync Countdown
          </div>
          <div className="font-mono text-2xl">{formatTime(timeLeft)}</div>
          <div className="text-xs text-slate-500">
            Every Saturday · 10:00 AM
          </div>
        </div>

        <button
          onClick={() => setAutoSync((v) => !v)}
          className={`pill ${autoSync ? "pill-on" : "pill-off"}`}
        >
          {autoSync ? "Enabled" : "Paused"}
        </button>
      </section>

      {/* Modules */}
      <section>
        <h2 className="section-title">Modules</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          {modules.map((m) => (
            <div key={m.name} className="module-card">
              <div className="module-icon">
                <Database />
              </div>
              <div className="module-name">{m.name}</div>
              <div className="module-count">
                {Number(m.records || 0).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Last Sync */}
      <section className="glass-card">
        <h2 className="section-title">Last Sync</h2>
        {syncLog ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <div className="label">Trigger</div>
              <div className="value">{syncLog.trigger}</div>
            </div>
            <div>
              <div className="label">Status</div>
              <div className="value">
                {syncLog.ok ? "SUCCESS" : "FAILED"}
              </div>
            </div>
            <div>
              <div className="label">Modules</div>
              <div className="value">
                {Object.keys(syncLog.result || {}).length}
              </div>
            </div>
            <div>
              <div className="label">Time</div>
              <div className="value">
                {new Date(syncLog.time).toLocaleString()}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-400 text-sm">
            No sync has been run yet.
          </div>
        )}
      </section>
    </div>
  );
}
