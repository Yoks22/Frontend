// src/components/RecordsTable.js
import React, { useEffect, useState } from "react";
const API_BASE = process.env.REACT_APP_API_BASE_URL || "http://localhost:8000/api";

export default function RecordsTable() {
  const [moduleName, setModuleName] = useState("contacts");
  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const per = 50;
  const [total, setTotal] = useState(0);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const r = await fetch(`${API_BASE}/${moduleName}?page=${page}&per=${per}`);
        const j = await r.json();
        if (mounted) {
          setItems(j.items || []);
          setTotal(j.total || 0);
        }
      } catch (e) {
        console.error(e);
      }
    })();
    return () => (mounted = false);
  }, [moduleName, page]);

  return (
    <div>
      <div className="list-header">
        <h2>{moduleName.charAt(0).toUpperCase() + moduleName.slice(1)}</h2>
        <div className="list-meta muted">{Number(total).toLocaleString()} records • page {page}</div>
      </div>

      <div className="list-body">
        {items.length === 0 ? (
          <div className="empty">No items to display</div>
        ) : (
          <table className="records-table">
            <thead>
              <tr>
                {Object.keys(items[0]).slice(0, 8).map((k) => <th key={k}>{k}</th>)}
              </tr>
            </thead>
            <tbody>
              {items.map((r, idx) => (
                <tr key={idx}>
                  {Object.keys(items[0]).slice(0, 8).map((k) => <td key={k}>{String(r[k] ?? "")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="pager">
        <button className="btn ghost" onClick={() => setPage((p) => Math.max(1, p - 1))}>Prev</button>
        <div className="muted">Page {page}</div>
        <button className="btn ghost" onClick={() => setPage((p) => p + 1)}>Next</button>
      </div>
    </div>
  );
}
