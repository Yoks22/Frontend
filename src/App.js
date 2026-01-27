import { format, setHours, setMinutes, setSeconds, getDay, addDays } from 'date-fns';
import { utcToZonedTime } from 'date-fns-tz';
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  RefreshCw, Database, Calendar, Users, Phone, FileText, CheckSquare, MapPin,
  AlertTriangle, Clock, X, Check, Activity, Search, FileDown, Layers, Terminal,
  TrendingUp, ChevronLeft, ChevronRight, HardDrive, Clock9, TrendingDown
} from 'lucide-react';

const MODULE_API_MAP = {
  Contacts: 'Contacts',
  Accounts: 'Accounts',
  Pipelines: 'Pipelines',
  Calls: 'Calls',
  Events: 'Events',
  Tasks: 'Tasks',
  Notes: 'Notes'
};

// This will look for the variable in .env, otherwise fall back to localhost
const API_BASE = process.env.REACT_APP_API_BASE_URL || "https://etl.spiotsystem.com";
const IST_TIMEZONE = 'Asia/Kolkata';

// --- Helper Functions ---

const getSyncMetrics = (log) => {
    const recentLog = log;
    const successfulSyncs = recentLog.filter(l => l.ok && l.duration && parseFloat(l.duration) > 0);
    const totalDuration = successfulSyncs.reduce((sum, l) => sum + parseFloat(l.duration), 0);
    const totalRuns = recentLog.length;
    return {
        avgDuration: successfulSyncs.length > 0 ?
        (totalDuration / successfulSyncs.length).toFixed(2) : 'N/A',
        lastSuccess: successfulSyncs[0]?.time || 'N/A',
        errorRate: totalRuns > 0 ?
        ((recentLog.filter(l => !l.ok).length / totalRuns) * 100).toFixed(1) : '0.0',
    };
};

const apiFetch = async (url, options = {}) => {
    // UPDATED: Removed forced setTimeout delay to prevent Connection Reset errors
    const res = await fetch(url, options);
    if (!res.ok) {
        const t = await res.text();
        throw new Error(`${res.status} (${res.statusText}): ${t}`);
    }
    return res.json();
};

const downloadCSV = (data, filename) => {
    if (!data || data.length === 0) return;
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(h => {
            let value = String(row[h] || '').replace(/"/g, '""');
            return `"${value}"`;
        }).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
};

const nextSaturday10AMIST = () => {
    const now = new Date();
    
    // 1. Convert current UTC time to IST Zoned Time
    // Changed 'toZonedTime' to 'utcToZonedTime' to fix build error
    const nowIST = utcToZonedTime(now, IST_TIMEZONE);
    
    const SATURDAY = 6;
    const TARGET_HOUR = 10;

    let currentDayIST = getDay(nowIST);
    let currentHourIST = nowIST.getHours();

    // 2. Calculate days until next Saturday
    let daysToAdd = (SATURDAY - currentDayIST + 7) % 7;

    // 3. If it's already Saturday after 10 AM, move to next week
    if (currentDayIST === SATURDAY && currentHourIST >= TARGET_HOUR) {
        daysToAdd = 7;
    }

    // 4. Construct the next sync date
    let nextSyncTimeIST = addDays(nowIST, daysToAdd);
    nextSyncTimeIST = setHours(nextSyncTimeIST, TARGET_HOUR);
    nextSyncTimeIST = setMinutes(nextSyncTimeIST, 0);
    nextSyncTimeIST = setSeconds(nextSyncTimeIST, 0);

    return nextSyncTimeIST;
};

export default function App() {
    const [modules, setModules] = useState([]);
    const [records, setRecords] = useState([]);
    const [selectedModule, setSelectedModule] = useState(null);
    const [page, setPage] = useState(1);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [syncCompleteStatus, setSyncCompleteStatus] = useState(null);
    const [totalRecordsCount, setTotalRecordsCount] = useState(0);

    const [syncLog, setSyncLog] = useState([
        { time: new Date(Date.now() - 3600000).toISOString(), ok: true, duration: '12.45', recordsUpdated: 4500, modulesProcessed: 7 },
        { time: new Date(Date.now() - 7200000).toISOString(), ok: false, error: 'Database Timeout', duration: '0.00', modulesProcessed: 2 },
        { time: new Date(Date.now() - 10800000).toISOString(), ok: true, duration: '15.10', recordsUpdated: 5100, modulesProcessed: 7 }
    ]);
    const [error, setError] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [countdown, setCountdown] = useState(0);
    const [searchTerm, setSearchTerm] = useState('');
    const timerRef = useRef(null);

    const icons = {
        Contacts: Users, Accounts: Database, Pipelines: MapPin,
        Calls: Phone, Events: Calendar, Tasks: CheckSquare, Notes: FileText
    };

    const loadModules = useCallback(async () => {
        try {
            setError(null);
            const data = await apiFetch(`${API_BASE}/modules`);
            const fetchedModules = data.modules || data || [];
            setModules(fetchedModules);
            const totalAggregatedRecords = fetchedModules.reduce((sum, m) => sum + (m.records || 0), 0);
            setTotalRecordsCount(totalAggregatedRecords);
        } catch (e) {
            console.error("Failed to load modules:", e);
            setError(`Connection Error: Ensure backend is running.`);
            setTotalRecordsCount(0);
        }
    }, []);

    const loadRecords = useCallback(async (moduleName, p) => {
        try {
            setLoading(true);
            const endpoint = MODULE_API_MAP[moduleName];
            if (!endpoint) {
             throw new Error(`No API endpoint mapped for module ${moduleName}`);
            }
            const url = `${API_BASE}/${endpoint}`;
            const data = await apiFetch(url);
            const items = data.items || data.records || data.data || [];
            setRecords(items);
            const moduleInfo = modules.find(m => m.name === moduleName);
            setTotal(data.total || moduleInfo?.records || items.length);
        } catch (e) {
            console.error(`Failed to load records for ${moduleName}:`, e);
            setError(`Failed to load records for ${moduleName}: ${e.message}`);
            setRecords([]);
            setTotal(0);
        } finally {
            setLoading(false);
        }
    }, [modules]);

   const handleSync = async () => {
    if (syncing) return;
    const startTime = new Date();
    setSyncing(true);
    setSyncCompleteStatus(null);
    setError(null);

    try {
        await apiFetch(`${API_BASE}/sync`, { method: 'POST' });
        const endTime = new Date();
        const duration = ((endTime - startTime) / 1000).toFixed(2);

        const data = await apiFetch(`${API_BASE}/modules`);
        const fetchedModules = data.modules || data || [];
        setModules(fetchedModules);

        const actualTotalRecords = fetchedModules.reduce((sum, m) => sum + (m.records || 0), 0);
        setTotalRecordsCount(actualTotalRecords);

        const newLogEntry = {
            time: endTime.toISOString(),
            ok: true,
            duration,
            recordsUpdated: actualTotalRecords,
            modulesProcessed: fetchedModules.length
        };

        setSyncLog(l => [newLogEntry, ...l].slice(0, 20));
        setSyncCompleteStatus('success');

    } catch (e) {
        console.error("Sync failed:", e);
        setError(e.message);
        const endTime = new Date();
        const errorEntry = {
            time: endTime.toISOString(),
            ok: false,
            error: e.message,
            duration: '0.00',
            recordsUpdated: 0,
            modulesProcessed: 0
        };
        setSyncLog(l => [errorEntry, ...l].slice(0, 20));
        setSyncCompleteStatus('fail');
    } finally {
        setSyncing(false);
    }
};

    const handleDownload = async (moduleName) => {
        try {
            setError(null);
            const endpoint = MODULE_API_MAP[moduleName];
            if (!endpoint) {
             throw new Error(`No API endpoint mapped for module ${moduleName}`);
            }
            const data = await apiFetch(`${API_BASE}/${endpoint}`);
            const items = data.items || data.records || data.data || [];

            if (items.length === 0) {
                setError(`No records found to download for ${moduleName}.`);
                return;
            }

            downloadCSV(items, moduleName.toLowerCase());
        } catch (e) {
            console.error(`Failed to download ${moduleName}:`, e);
            setError(`Failed to download ${moduleName}: ${e.message}`);
        }
    };

    useEffect(() => {
        loadModules();
const tick = () => {
    const nowIST = utcToZonedTime(new Date(), IST_TIMEZONE); // Fixed here too
    const nextSyncTime = nextSaturday10AMIST();
    setCountdown(Math.max(0, Math.floor((nextSyncTime.getTime() - nowIST.getTime()) / 1000)));
};

        tick();
        timerRef.current = setInterval(tick, 1000);
        return () => clearInterval(timerRef.current);
    }, [loadModules]);

    useEffect(() => {
        if (selectedModule && showModal) {
            loadRecords(selectedModule, page);
        } else {
            if (!showModal) setRecords([]);
        }
    }, [selectedModule, page, loadRecords, showModal]);

    useEffect(() => {
        if (syncCompleteStatus) {
            const autoHideTimer = setTimeout(() => {
                setSyncCompleteStatus(null);
            }, 5000);
            return () => clearTimeout(autoHideTimer);
        }
    }, [syncCompleteStatus]);

    const fmt = s => {
        const d = Math.floor(s / 86400);
        const h = Math.floor((s % 86400) / 3600);
        const m = Math.floor((s % 3600) / 60);
        const sec = s % 60;
        return { d, h, m, sec };
    };

    const filteredModules = modules.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const { avgDuration, lastSuccess, errorRate } = getSyncMetrics(syncLog);

    const time = fmt(countdown);
    const perPage = 20;
    const totalPages = Math.ceil(total / perPage);

    const primaryColor = '#DC2626';
    const secondaryColor = '#0d1117';
    const cardColor = '#111827';

    const countdownStyle = {
        fontFamily: "'Roboto Mono', monospace",
        fontWeight: 700,
        fontSize: '3.5rem',
        color: primaryColor,
        lineHeight: 1,
        letterSpacing: '-0.05em'
    };

    return (
        <div style={{ backgroundColor: secondaryColor }} className="min-h-screen text-slate-100 relative font-sans">
            <style>{`
                @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700;800;900&display=swap');
                @import url('https://fonts.googleapis.com/css2?family=Roboto+Mono:wght@400;700&display=swap');
                * { font-family: 'Inter', sans-serif; }
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slideUp { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
                @keyframes popIn { 0% { transform: scale(0.5); opacity: 0; } 100% { transform: scale(1); opacity: 1; } }
                @keyframes bg-pulse { 0% { background-position: 0% 0%; } 50% { background-position: 100% 100%; } 100% { background-position: 0% 0%; } }
                .card-base { background-color: ${cardColor}; border: 1px solid rgba(255,255,255,0.08); transition: all 0.3s ease; box-shadow: 0 4px 12px rgba(0,0,0,0.4); position: relative; overflow: hidden; }
                .card-base-hover:hover { border-color: ${primaryColor}50; box-shadow: 0 8px 20px rgba(220,38,38,0.2); transform: translateY(-2px); }
                .card-animated::before { content: ''; position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle at 50% 50%, rgba(220, 38, 38, 0.1) 0%, rgba(220, 38, 38, 0.05) 50%, transparent 70%); background-size: 200% 200%; opacity: 0.3; animation: bg-pulse 15s ease-in-out infinite; z-index: 0; }
                .card-animated > * { position: relative; z-index: 1; }
                .stat-box { animation: slideUp 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94) both; }
                .module-card { animation: slideUp 0.5s ease-out; }
                .header-base { background-color: rgba(17, 24, 39, 0.95); backdrop-filter: blur(12px); border-bottom: 1px solid rgba(255,255,255,0.08); }
                .btn-primary { background-color: ${primaryColor}; color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 700; transition: background-color 0.3s, box-shadow 0.3s, transform 0.2s; box-shadow: 0 6px 20px rgba(220,38,38,0.4); border: 2px solid transparent; }
                .btn-primary:hover { background-color: #EF4444; box-shadow: 0 8px 30px rgba(220,38,38,0.6); transform: translateY(-1px); }
                .btn-secondary { background-color: #374151; color: white; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-weight: 600; transition: background-color 0.3s, transform 0.2s; }
                .btn-secondary:hover:not(:disabled) { background-color: #4B5563; transform: translateY(-1px); }
                .marslab-text { color: ${primaryColor}; }
                .data-value { font-family: 'Roboto Mono', monospace; font-weight: 700; letter-spacing: -0.05em; }
                .countdown-value { ${Object.entries(countdownStyle).map(([k, v]) => `${k.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`)}: ${v};`).join(' ')} }
                .timer-separator { ${Object.entries(countdownStyle).map(([k, v]) => `${k.replace(/([A-Z])/g, (g) => `-${g[0].toLowerCase()}`)}: ${v};`).join(' ')} font-size: 2.5rem; color: #4B5563; }
                .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; display: flex; align-items: center; justify-content: center; z-index: 100; background-color: rgba(13, 17, 23, 0.9); backdrop-filter: blur(8px); animation: fadeIn 0.3s forwards; }
                .modal-content { background-color: ${cardColor}; border-radius: 1.5rem; box-shadow: 0 15px 50px rgba(0,0,0,0.7); animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; max-width: 90%; width: 1200px; max-height: 90vh; display: flex; flex-direction: column; }
                .syncing-overlay-style { background-color: rgba(13, 17, 23, 0.85); backdrop-filter: blur(16px); }
                .syncing-content-style { background-color: rgba(17, 24, 39, 0.7); border-radius: 1.5rem; box-shadow: 0 15px 50px rgba(0,0,0,0.8); animation: popIn 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards; position: relative; overflow: hidden; padding: 4rem; }
                .syncing-content-style::before { content: ''; position: absolute; top: 0; left: 0; right: 0; bottom: 0; z-index: 0; background: radial-gradient(circle at 50% 0%, ${primaryColor}40 0%, transparent 60%); }
                .syncing-content-style > * { position: relative; z-index: 1; }
                .sync-popup-base { position: fixed; bottom: 2rem; right: 2rem; z-index: 50; padding: 1rem 1.5rem; border-radius: 0.75rem; box-shadow: 0 6px 20px rgba(0,0,0,0.4); display: flex; align-items: center; gap: 0.75rem; color: white; cursor: pointer; animation: fadeIn 0.5s ease-out; }
                .sync-success { background-color: #059669; border: 1px solid #10B981; }
                .sync-fail { background-color: ${primaryColor}; border: 1px solid #F87171; }
                .search-input { width: 100%; background-color: ${cardColor}; border: 1px solid rgba(255,255,255,0.1); padding: 0.6rem 1rem 0.6rem 2.5rem; border-radius: 0.75rem; color: white; outline: none; transition: border-color 0.3s, box-shadow 0.3s; }
                .search-input:focus { border-color: ${primaryColor}; box-shadow: 0 0 0 2px ${primaryColor}30; }
            `}</style>

            <header className="header-base sticky top-0 z-50">
                <div className="max-w-[1600px] mx-auto px-8 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl bg-slate-700/50`}>
                                <HardDrive size={24} className="marslab-text" />
                            </div>
                            <div>
                                <h1 className="text-3xl font-black tracking-tight text-white">
                                    MARS<span className='marslab-text'>LAB</span>
                                </h1>
                                <p className="text-sm text-slate-400">Synchronization Platform</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-xl transition-all duration-500 flex items-center gap-3 ${syncing ?
                                'bg-amber-900/30' : 'bg-emerald-900/30'}`}>
                                <div className={`w-3 h-3 rounded-full ${syncing ?
                                    'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></div>
                                <div className="text-sm font-semibold text-white">
                                    {syncing ? 'Syncing...' : 'Ready'}
                                </div>
                            </div>

                            <button
                                onClick={handleSync}
                                disabled={syncing}
                                className={`btn-primary flex items-center gap-2 transition-all ${syncing ?
                                    'opacity-70 cursor-wait' : ''}`}
                            >
                                <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
                                {syncing ? 'Syncing...' : 'Sync Now'}
                            </button>
                        </div>
                    </div>
                </div>
            </header>

            <main className="max-w-[1600px] mx-auto px-8 py-8 space-y-8 relative z-10">

                {error && (
                    <div className="p-4 rounded-xl border border-red-500 bg-red-900/30 flex items-start justify-between animate-fadeIn">
                        <div className="flex items-center gap-4">
                            <AlertTriangle size={20} className="text-red-400 mt-0.5" />
                            <div className="text-red-300">
                                <span className="font-semibold mr-2">Error:</span>
                                {error}
                            </div>
                        </div>
                        <button onClick={() => setError(null)} className="p-1 text-red-400 hover:text-white transition">
                            <X size={16} />
                        </button>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    <div className="card-base card-base-hover card-animated p-8 rounded-2xl flex flex-col items-center justify-center stat-box">
                        <TrendingUp size={36} className='text-slate-400 mb-4'/>
                        <p className="text-sm font-semibold uppercase tracking-widest text-slate-400 mb-3">Total Records Synced</p>
                        <div className="text-7xl data-value text-white">
                            {totalRecordsCount.toLocaleString()}
                        </div>
                    </div>

                    <div className="lg:col-span-2 card-base card-animated p-8 rounded-2xl flex flex-col stat-box" style={{animationDelay: '0.1s'}}>
                        <h2 className="text-lg font-bold mb-6 text-slate-300 flex items-center gap-2">
                            <Clock size={20} className="marslab-text" />
                            Next Automated Synchronization
                        </h2>

                        <div className="flex items-center justify-center gap-4">
                            {[{v: time.d, l: 'Days'}, {v: time.h, l: 'Hours'}, {v: time.m, l: 'Mins'}, {v: time.sec, l: 'Secs'}].map((segment, index) => (
                                <React.Fragment key={segment.l}>
                                    <div className="countdown-segment text-center">
                                        <span className="countdown-value">{segment.v.toString().padStart(2, '0')}</span>
                                        <span className="text-sm font-medium text-slate-400 block mt-1">{segment.l}</span>
                                    </div>
                                    {index < 3 && <span className="timer-separator">:</span>}
                                </React.Fragment>
                            ))}
                        </div>

                        <p className="text-center text-sm text-slate-500 mt-6">
                            Scheduled for Saturday at 10:00 AM <span className='font-semibold text-slate-400'>({format(nextSaturday10AMIST(), 'zzz')})</span>
                        </p>
                    </div>
                </div>

                <div className="card-base p-8 rounded-2xl">
                    <h2 className="text-2xl font-bold text-slate-300 flex items-center gap-3 mb-6">
                        <Activity size={24} className="marslab-text" />
                        Operational Metrics
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="card-base p-5 rounded-xl stat-box flex flex-col items-start justify-between border-emerald-600/30" style={{animationDelay: '0.2s'}}>
                            <div className='flex items-center gap-2 text-slate-400'><Check size={18} className='text-emerald-400'/> <span className='text-xs uppercase font-semibold'>Last Successful Sync</span></div>
                            <div className='text-xl font-bold text-white mt-2 data-value'>{lastSuccess === 'N/A' ?
                                lastSuccess : new Date(lastSuccess).toLocaleTimeString()}</div>
                        </div>

                        <div className="card-base p-5 rounded-xl stat-box flex flex-col items-start justify-between border-blue-600/30" style={{animationDelay: '0.3s'}}>
                            <div className='flex items-center gap-2 text-slate-400'><Clock9 size={18} className='text-blue-400'/> <span className='text-xs uppercase font-semibold'>Average Sync Time</span></div>
                            <div className='text-xl font-bold text-white mt-2 data-value'>{avgDuration}s</div>
                        </div>

                        <div className="card-base p-5 rounded-xl stat-box flex flex-col items-start justify-between border-marslab-600/30" style={{animationDelay: '0.4s'}}>
                            <div className='flex items-center gap-2 text-slate-400'><TrendingDown size={18} className='marslab-text'/> <span className='text-xs uppercase font-semibold'>Error Rate (Recent)</span></div>
                            <div className='text-xl font-bold text-white mt-2 data-value'>{errorRate}%</div>
                        </div>

                        <div className="card-base p-5 rounded-xl stat-box flex flex-col items-start justify-between border-purple-600/30" style={{animationDelay: '0.5s'}}>
                            <div className='flex items-center gap-2 text-slate-400'><Layers size={18} className='text-purple-400'/> <span className='text-xs uppercase font-semibold'>Modules Active</span></div>
                            <div className='text-xl font-bold text-white mt-2 data-value'>{modules.length}</div>
                        </div>
                    </div>
                </div>

                <div className="card-base p-8 rounded-2xl">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-2xl font-bold text-slate-300 flex items-center gap-3">
                            <Layers size={24} className="marslab-text" />
                            Data Modules Directory
                        </h2>
                        <div className="w-80 relative">
                            <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                            <input
                                className="search-input"
                                placeholder="Search modules..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {filteredModules.map((m, i) => {
                            const Icon = icons[m.name] || Database;
                            return (
                                <div
                                    key={m.name}
                                    className="card-base card-base-hover card-animated module-card p-5 rounded-xl flex flex-col justify-between transition-all cursor-pointer"
                                    style={{ animationDelay: `${i * 0.05}s` }}
                                    onClick={() => {
                                        setSelectedModule(m.name);
                                        setPage(1);
                                        setShowModal(true);
                                    }}
                                >
                                    <div className="flex items-center justify-between mb-4">
                                        <Icon size={24} className="marslab-text" />
                                        <span className="text-sm font-bold data-value text-white bg-slate-700/50 px-3 py-1 rounded-full">{m.records ? m.records.toLocaleString() : 'N/A'}</span>
                                    </div>
                                    <div className="font-semibold text-lg text-white">{m.name}</div>
                                    <div className="flex justify-between mt-2">
                                        <button
                                            className="text-sm font-medium text-slate-400 hover:marslab-text transition-colors flex items-center gap-1"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleDownload(m.name);
                                            }}
                                        >
                                            <FileDown size={16} /> Export
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="card-base p-8 rounded-2xl">
                    <h2 className="text-2xl font-bold text-slate-300 flex items-center gap-3 mb-6">
                        <Terminal size={24} className="marslab-text" />
                        Synchronization Timeline
                    </h2>
                    <div className="space-y-4">
                        {syncLog.map((l, i) => (
                            <div key={l.time} className="card-base p-5 rounded-xl flex flex-col transition-all">
                                <div className='flex justify-between items-center pb-2'>
                                    <div className='flex items-center gap-4'>
                                        <div className={l.ok ? 'text-emerald-400' : 'marslab-text'}>
                                            {l.ok ? <Check size={20} /> : <X size={20} />}
                                        </div>
                                        <div>
                                            <div className={`font-semibold ${l.ok ? 'text-emerald-300' : 'marslab-text'}`}>
                                                {l.ok ? 'Sync Successful' : 'Sync Failed'}
                                            </div>
                                            <div className="text-xs text-slate-500">{new Date(l.time).toLocaleString()}</div>
                                        </div>
                                    </div>
                                    <div className={`text-sm font-mono px-3 py-1 rounded-full ${l.ok ? 'bg-emerald-900/40 text-emerald-300' : 'bg-red-900/40 marslab-text'}`}>{l.duration}s</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {showModal && selectedModule && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content p-8" onClick={e => e.stopPropagation()}>
                        <div className="flex justify-between items-center mb-6 border-b border-slate-700 pb-4">
                            <h2 className="text-3xl font-bold text-white">{selectedModule} <span className='marslab-text'>Data View</span></h2>
                            <button onClick={() => setShowModal(false)} className='text-slate-400 hover:marslab-text p-2'><X size={24} /></button>
                        </div>
                        {loading ? (
                            <div className="text-center py-20"><RefreshCw size={36} className="animate-spin marslab-text mx-auto mb-4" /></div>
                        ) : (
                            <>
                                <div className='flex justify-between items-center mb-4'>
                                    <span className='text-sm text-slate-500'>Showing {records.length} of {total.toLocaleString()} records.</span>
                                    <button className="btn-primary flex items-center gap-2 py-2 px-4 text-sm" onClick={() => handleDownload(selectedModule)}><FileDown size={16} /> Export CSV</button>
                                </div>
                                <div className="overflow-auto max-h-[60vh] border border-slate-700 rounded-lg">
                                    <table className="w-full text-xs table-auto">
                                        <thead className='sticky top-0 bg-slate-800/95'>
                                            <tr>{Object.keys(records[0] || {}).map((c) => (<th key={c} className="p-3 text-left uppercase text-slate-400 border-b border-slate-700">{c}</th>))}</tr>
                                        </thead>
                                        <tbody>
                                            {records.map((r, i) => (
                                                <tr key={i} className='border-b border-slate-800 hover:bg-slate-800'>
                                                    {Object.values(r).map((v, j) => (<td key={j} className="p-3 text-slate-300 max-w-xs overflow-hidden text-ellipsis whitespace-nowrap">{String(v)}</td>))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <div className="flex justify-center items-center gap-4 mt-6">
                                    <button className="btn-secondary py-2 px-3 text-sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}><ChevronLeft size={16} /></button>
                                    <span className="text-slate-300">Page <span className='marslab-text'>{page}</span> of {totalPages}</span>
                                    <button className="btn-secondary py-2 px-3 text-sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}><ChevronRight size={16} /></button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {syncing && (
                <div className="modal-overlay syncing-overlay-style">
                    <div className="syncing-content-style p-10 max-w-sm text-center">
                        <RefreshCw size={48} className="animate-spin marslab-text mx-auto mb-6" />
                        <h3 className="text-2xl font-bold text-white">Synchronizing Data</h3>
                        <p className="text-slate-400">Updating records...</p>
                    </div>
                </div>
            )}

            {syncCompleteStatus && (
                <div className={`sync-popup-base ${syncCompleteStatus === 'success' ? 'sync-success' : 'sync-fail'}`} onClick={() => setSyncCompleteStatus(null)}>
                    {syncCompleteStatus === 'success' ? <><Check size={24} /> <div>Sync Complete!</div></> : <><AlertTriangle size={24} /> <div>Sync Failed!</div></>}
                </div>
            )}
        </div>
    );
}

