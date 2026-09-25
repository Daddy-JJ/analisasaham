'use client';

import React, { useState, useEffect } from 'react';
import { X, Filter, Sparkles, TrendingUp, ShieldAlert, RefreshCw, ArrowUpRight, ArrowDownRight, Compass, CheckCircle } from 'lucide-react';
import { ScreenerItem, ScreenerResult } from '@/lib/screener-engine';

interface ScreenerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectAndAnalyze: (ticker: string) => void;
  onSendToChat: (prompt: string) => void;
}

export default function ScreenerModal({
  isOpen,
  onClose,
  onSelectAndAnalyze,
  onSendToChat,
}: ScreenerModalProps) {
  const [data, setData] = useState<ScreenerResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [filterType, setFilterType] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  const fetchScreenerData = async (force = false) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/screener${force ? '?force=true' : ''}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setData(json.data);
      } else {
        throw new Error(json.message || 'Gagal memuat hasil screening.');
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Terjadi kesalahan saat memindai Kompas 100.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && !data) {
      fetchScreenerData(false);
    }
  }, [isOpen, data]);

  if (!isOpen) return null;

  const signals = data?.signals || [];
  const filteredSignals = signals.filter((item) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'BREAKOUT') return item.signal === 'BETA BREAKOUT';
    if (filterType === 'SNIPER') return item.signal === 'SMART SNIPER';
    if (filterType === 'PULLBACK') return item.signal === 'PULLBACK' || item.signal === 'G ACC';
    return true;
  });

  const handleSendSummaryToGemini = () => {
    if (!data || data.signals.length === 0) return;
    const top5 = data.signals.slice(0, 5);
    const summaryText = top5
      .map(
        (s, idx) =>
          `${idx + 1}. **${s.ticker}** (Rp ${s.price.toLocaleString('id-ID')}, ${s.changePercent >= 0 ? '+' : ''}${s.changePercent}%) - Sinyal: ${s.signal} (RVOL: ${s.rvol}x, RSI: ${s.rsi14}, Buy 1: ${s.buyGrid.buy1}, SL: ${s.buyGrid.stopLoss}, TP: ${s.buyGrid.target1})`
      )
      .join('\n');

    const prompt = `Berikut hasil screening harian MaX V7.30 dari Indeks Kompas 100:\n\n${summaryText}\n\nBerikan rangkuman analisis pasar, urutkan prioritas saham yang paling prospektif, dan berikan strategi trading plan MaX untuk saham peringkat pertama.`;
    onSendToChat(prompt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-terminal-900 border border-terminal-700 rounded-2xl w-full max-w-5xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-terminal-800 bg-terminal-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 text-white shadow-lg shadow-cyan-900/40">
              <Compass className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-slate-100 text-base">Screener MaX V7.30 — Indeks Kompas 100</h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800 font-semibold">
                  DAILY ACTIVE
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Pemindai kuantitatif harian: Trend, Momentum RSI, Relative Volume (RVOL), dan Buy Grid.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchScreenerData(true)}
              disabled={isLoading}
              title="Perbarui Data Screening (Force Scan)"
              className="p-1.5 rounded-lg border border-terminal-700 text-slate-400 hover:text-slate-200 hover:bg-terminal-800 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-terminal-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Status & Cache Information Bar */}
        <div className="px-4 py-2 bg-terminal-950/80 border-b border-terminal-800/80 flex flex-wrap items-center justify-between text-xs text-slate-400 gap-2">
          <div className="flex items-center gap-3 font-mono text-[11px]">
            <span>
              Total Diperiksa: <strong className="text-slate-200">{data?.totalScreened || 0} Saham</strong>
            </span>
            <span>•</span>
            <span>
              Sinyal Ditemukan: <strong className="text-emerald-400">{data?.totalSignals || 0} Saham</strong>
            </span>
            {data && (
              <>
                <span>•</span>
                <span className="text-slate-500">Scan: {data.scanDate} ({data.cachedAt})</span>
              </>
            )}
          </div>
          <div className="flex items-center gap-1.5 text-[10px] text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/40 font-mono">
            <CheckCircle className="w-3 h-3 text-cyan-400" />
            <span>Anti-Blocking Enabled (Gently Batched + Daily Cache)</span>
          </div>
        </div>

        {/* Filter Navigation Tabs */}
        <div className="p-3 border-b border-terminal-800 bg-terminal-900 flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none">
            <button
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === 'ALL'
                  ? 'bg-cyan-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:bg-terminal-800 hover:text-slate-200'
              }`}
            >
              Semua Sinyal ({signals.length})
            </button>
            <button
              onClick={() => setFilterType('BREAKOUT')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === 'BREAKOUT'
                  ? 'bg-emerald-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:bg-terminal-800 hover:text-slate-200'
              }`}
            >
              Beta Breakout ({signals.filter((s) => s.signal === 'BETA BREAKOUT').length})
            </button>
            <button
              onClick={() => setFilterType('SNIPER')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === 'SNIPER'
                  ? 'bg-blue-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:bg-terminal-800 hover:text-slate-200'
              }`}
            >
              Smart Sniper / V-Shape ({signals.filter((s) => s.signal === 'SMART SNIPER').length})
            </button>
            <button
              onClick={() => setFilterType('PULLBACK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                filterType === 'PULLBACK'
                  ? 'bg-amber-600 text-white font-semibold shadow-sm'
                  : 'text-slate-400 hover:bg-terminal-800 hover:text-slate-200'
              }`}
            >
              Pullback & Momentum ({signals.filter((s) => s.signal === 'PULLBACK' || s.signal === 'G ACC').length})
            </button>
          </div>

          {filteredSignals.length > 0 && (
            <button
              onClick={handleSendSummaryToGemini}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium transition-colors shadow-md shadow-indigo-950/40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Analisa Lengkap via Gemini</span>
            </button>
          )}
        </div>

        {/* Modal Content / Table */}
        <div className="flex-1 overflow-y-auto p-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 space-y-3">
              <div className="w-10 h-10 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin"></div>
              <p className="text-sm font-mono text-cyan-400">Sedang memindai Indeks Kompas 100 dengan aman...</p>
              <p className="text-xs text-slate-500 font-mono">Batch throttle aktif untuk mencegah pembatasan rate limit.</p>
            </div>
          ) : error ? (
            <div className="text-center py-16 space-y-3">
              <ShieldAlert className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-sm font-semibold text-rose-400">{error}</p>
              <button
                onClick={() => fetchScreenerData(true)}
                className="px-4 py-2 rounded-lg bg-terminal-800 hover:bg-terminal-700 text-xs text-slate-200"
              >
                Coba Lagi
              </button>
            </div>
          ) : filteredSignals.length === 0 ? (
            <div className="text-center py-20 space-y-2 text-slate-400">
              <Filter className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-sm font-medium text-slate-300">Tidak ada sinyal aktif pada kategori ini hari ini.</p>
              <p className="text-xs text-slate-500">Pasar mungkin sedang berkonsolidasi atau di bawah tekanan.</p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-terminal-800">
              <table className="w-full text-xs font-mono text-left">
                <thead className="bg-terminal-950 text-slate-400 border-b border-terminal-800 text-[11px]">
                  <tr>
                    <th className="py-2.5 px-3">Ticker / Emiten</th>
                    <th className="py-2.5 px-3 text-right">Harga (IDR)</th>
                    <th className="py-2.5 px-3 text-center">Sinyal MaX</th>
                    <th className="py-2.5 px-3 text-center">RVOL (Vol)</th>
                    <th className="py-2.5 px-3 text-center">RSI (14)</th>
                    <th className="py-2.5 px-3 text-right">Buy 1 (Entry)</th>
                    <th className="py-2.5 px-3 text-right">Stop Loss</th>
                    <th className="py-2.5 px-3 text-right">Target 1</th>
                    <th className="py-2.5 px-3 text-center">R/R</th>
                    <th className="py-2.5 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-terminal-800/60 bg-terminal-900/40">
                  {filteredSignals.map((item) => {
                    const isPos = item.change >= 0;
                    let badgeColor = 'bg-cyan-950 text-cyan-300 border-cyan-800';
                    if (item.signal === 'BETA BREAKOUT') badgeColor = 'bg-emerald-950 text-emerald-300 border-emerald-800';
                    else if (item.signal === 'SMART SNIPER') badgeColor = 'bg-blue-950 text-blue-300 border-blue-800';
                    else if (item.signal === 'PULLBACK') badgeColor = 'bg-amber-950 text-amber-300 border-amber-800';

                    return (
                      <tr key={item.ticker} className="hover:bg-terminal-850/60 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-100 text-sm">{item.ticker}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1">{item.name}</div>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <div className="font-semibold text-slate-200">{item.price.toLocaleString('id-ID')}</div>
                          <div className={`text-[10px] flex items-center justify-end ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isPos ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                            <span>{isPos ? '+' : ''}{item.changePercent.toFixed(2)}%</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${badgeColor}`}>
                            {item.signal}
                          </span>
                          <div className="text-[9px] text-slate-500 mt-0.5">{item.grade}</div>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`font-semibold ${item.rvol >= 1.5 ? 'text-emerald-400 font-bold' : 'text-slate-300'}`}>
                            {item.rvol}x
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <span className={`${item.rsi14 <= 35 ? 'text-emerald-400' : item.rsi14 >= 70 ? 'text-rose-400' : 'text-slate-300'}`}>
                            {item.rsi14}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right text-slate-200">
                          {item.buyGrid.buy1.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right text-rose-400">
                          {item.buyGrid.stopLoss.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-right text-emerald-400">
                          {item.buyGrid.target1.toLocaleString('id-ID')}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-300">
                          {item.buyGrid.rewardRisk}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => {
                              onSelectAndAnalyze(item.ticker);
                              onClose();
                            }}
                            className="px-2.5 py-1 rounded-md bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-medium transition-colors shadow-sm"
                          >
                            Analisa
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="p-3 bg-terminal-950/80 border-t border-terminal-800 flex items-center justify-between text-xs text-slate-400">
          <div className="text-[11px]">
            Indeks Kompas 100 disaring otomatis berdasarkan volume, momentum RSI, dan struktur moving averages.
          </div>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg border border-terminal-700 hover:bg-terminal-800 text-slate-300 text-xs transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
