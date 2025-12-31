// src/components/ModuleList.js
import React, { useEffect, useState } from "react";
import Icon3D from "./Icon3D";

const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";

export default function ModuleList() {
  const modules = [
    { id: "contacts", label: "Contacts" },
    { id: "accounts", label: "Accounts" },
    { id: "pipelines", label: "Pipelines" },
    { id: "calls", label: "Calls" },
    { id: "events", label: "Events" },
    { id: "tasks", label: "Tasks" },
    { id: "notes", label: "Notes" },
  ];

  const [stats, setStats] = useState({});
  const [active, setActive] = useState("contacts");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/stats`);
        const j = await r.json();
        if (mounted) setStats(j || {});
      } catch (e) {
        console.error(e);
      }
    })();
    return () => (mounted = false);
  }, []);

  return (
    <div className="cards">
      {modules.map((m) => {
        const count = stats[m.id] || 0;
        return (
          <div key={m.id} className={`module-card ${active === m.id ? "active" : ""}`} onClick={() => setActive(m.id)}>
            <Icon3D active={active === m.id}>
              <div className="icon-inner">{m.label.charAt(0)}</div>
            </Icon3D>
            <div className="module-meta">
              <div className="module-name">{m.label}</div>
              <div className="module-count">{Number(count).toLocaleString()}</div>
            </div>
            <div className={`module-anim ${active === m.id ? "pulse" : ""}`} />
          </div>
        );
      })}
    </div>
  );
}
