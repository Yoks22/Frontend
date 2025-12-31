import axios from "axios";

// Axios instance using CRA proxy → forwards /api/* to http://localhost:5000/api/*
const api = axios.create({
  baseURL: "/api",
});

// Health check
export const fetchHealth = () => api.get("/health");

// Status (sync state, last sync, environment, etc.)
export const fetchStatus = () => api.get("/status");

// Overview (total records + modules summary)
export const fetchOverview = () => api.get("/overview");

// Modules list + related counts
export const fetchModules = () => api.get("/modules");

// Run sync now (manual trigger)
export const runSyncNow = () => api.post("/sync");

// CSV export for a specific module (no limit)
export const downloadModuleCsv = (moduleName) =>
  api.get(`/export/${moduleName}`, {
    responseType: "blob",
  });

// CSV export for ALL modules combined (no limit)
export const downloadAllCsv = () =>
  api.get("/export/all", {
    responseType: "blob",
  });

// Sync log entries (used for Last Sync + Sync Log table)
export const fetchSyncLogs = () => api.get("/logs");
