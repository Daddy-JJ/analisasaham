'use client';

import React, { useState } from 'react';
import { Search, TrendingUp, Layers, Compass, ShieldAlert, Cpu, FileSpreadsheet } from 'lucide-react';

interface HeaderProps {
  currentTicker: string;
  onSelectTicker: (ticker: string) => void;
  onTriggerPhase: (phaseText: string) => void;
  onOpenBroksumModal: () => void;
  onOpenScreenerModal: () => void;
  hasBroksumData: boolean;
  isLoading: boolean;
}

const POPULAR_TICKERS = ['BBCA', 'BBRI', 'BMRI', 'TLKM', 'ASII', 'AMMN', 'BREN', 'IHSG'];

export default function Header({
  currentTicker,
  onSelectTicker,
  onTriggerPhase,
  onOpenBroksumModal,
  onOpenScreenerModal,
  hasBroksumData,
  isLoading,
}: HeaderProps) {
  const [searchInput, setSearchInput] = useState(currentTicker);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchInput.trim()) {
      onSelectTicker(searchInput.trim().toUpperCase());
    }
  };

  return (
    <header className="border-b border-terminal-800 bg-terminal-950/80 backdrop-blur-md sticky top-0 z-30 px-4 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-cyan-600 via-blue-600 to-indigo-600 flex items-center justify-center shadow-lg shadow-cyan-900/30">
              <TrendingUp className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-100 tracking-wide">GEMINI IDX PRO</span>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-semibold">
                  AI TERMINAL
                </span>
              </div>
              <p className="text-[11px] text-slate-400">Analisa Teknikal, Elliott Wave & Bandarmology BEI</p>
            </div>
          </div>
        </div>

        {/* Search Ticker */}
        <div className="flex items-center gap-2 flex-1 max-w-md">
          <form onSubmit={handleSubmit} className="relative w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value.toUpperCase())}
              placeholder="Ketik Ticker Saham (contoh: BBCA, TLKM, IHSG)..."
              className="w-full pl-9 pr-20 py-1.5 text-sm bg-terminal-900 border border-terminal-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors uppercase font-mono"
            />
            <button
              type="submit"
              disabled={isLoading || !searchInput.trim()}
              className="absolute right-1 top-1/2 -translate-y-1/2 px-2.5 py-1 text-xs font-medium rounded-md bg-terminal-800 hover:bg-terminal-700 text-slate-300 disabled:opacity-50 transition-colors"
            >
              Cari
            </button>
          </form>

          {/* Broksum Drawer Button */}
          <button
            onClick={onOpenBroksumModal}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all ${
              hasBroksumData
                ? 'bg-amber-950/40 border-amber-500/50 text-amber-300 shadow-sm shadow-amber-900/30'
                : 'bg-terminal-900 border-terminal-700 hover:border-terminal-600 text-slate-300'
            }`}
            title="Tempel Data Broker Summary (Broksum)"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Broksum</span>
            {hasBroksumData && (
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
            )}
          </button>
        </div>

        {/* Quick Tickers */}
        <div className="hidden lg:flex items-center gap-1.5">
          <span className="text-[11px] text-slate-500 font-mono">Popular:</span>
          {POPULAR_TICKERS.map((t) => (
            <button
              key={t}
              onClick={() => {
                setSearchInput(t);
                onSelectTicker(t);
              }}
              className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                currentTicker === t
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                  : 'bg-terminal-900 hover:bg-terminal-800 text-slate-400 hover:text-slate-200 border border-terminal-800'
              }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      {/* Action Pills Bar */}
      <div className="max-w-7xl mx-auto mt-2.5 pt-2 border-t border-terminal-900/80 flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 shrink-0">
          <Compass className="w-3 h-3 text-cyan-400" /> Jalur Analisa:
        </span>

        <button
          onClick={() => onTriggerPhase(`${currentTicker} fase 1: wave count & invalidation rules (fokus ringkas & to the point)`)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-emerald-950/40 border border-emerald-800/50 hover:bg-emerald-900/50 text-emerald-300 transition-colors whitespace-nowrap disabled:opacity-50"
        >
          <Layers className="w-3 h-3" />
          <span>Fase 1: Elliott Wave</span>
        </button>

        <button
          onClick={() => onTriggerPhase(`${currentTicker} fase 2: fibonacci targets & confluence S/R (fokus ringkas & to the point)`)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-cyan-950/40 border border-cyan-800/50 hover:bg-cyan-900/50 text-cyan-300 transition-colors whitespace-nowrap disabled:opacity-50"
        >
          <TrendingUp className="w-3 h-3" />
          <span>Fase 2: Fibonacci Targets</span>
        </button>

        <button
          onClick={() => onTriggerPhase(`${currentTicker} fase 3: bandarmology & volume VPA confirmation (fokus ringkas & to the point)`)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-amber-950/40 border border-amber-800/50 hover:bg-amber-900/50 text-amber-300 transition-colors whitespace-nowrap disabled:opacity-50"
        >
          <Cpu className="w-3 h-3" />
          <span>Fase 3: Bandarmology & Volume</span>
        </button>

        <button
          onClick={() => onTriggerPhase(`${currentTicker} fase 4: langsung buat actionable trading plan tabel entry zone, stop loss, tp1, tp2, r/r (fokus to the point, jangan ulang fase 1-3)`)}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md bg-purple-950/40 border border-purple-800/50 hover:bg-purple-900/50 text-purple-300 transition-colors whitespace-nowrap disabled:opacity-50"
        >
          <ShieldAlert className="w-3 h-3" />
          <span>Fase 4: Complete Trading Plan</span>
        </button>

        <button
          onClick={onOpenScreenerModal}
          disabled={isLoading}
          className="flex items-center gap-1.5 px-3 py-1 text-xs rounded-md bg-indigo-950/60 border border-indigo-700/60 hover:bg-indigo-900/60 text-indigo-300 font-semibold transition-colors whitespace-nowrap disabled:opacity-50 shadow-sm"
        >
          <Compass className="w-3.5 h-3.5 text-indigo-400" />
          <span>Screener MaX (Kompas 100)</span>
        </button>
      </div>
    </header>
  );
}
