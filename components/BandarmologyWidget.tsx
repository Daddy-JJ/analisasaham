'use client';

import React, { useEffect, useState, useCallback } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Layers,
  Sparkles,
  RefreshCw,
  Flame,
  BarChart3,
  ChevronRight,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import { IdxBandarmologyData, formatIdrCompact } from '@/lib/idx-terminal';
import { formatDotNumber } from '@/lib/broksum-parser';

interface BandarmologyWidgetProps {
  currentTicker: string;
  onOpenBroksumModal: () => void;
  onAnalyzeWithAi: (prompt: string) => void;
}

export default function BandarmologyWidget({
  currentTicker,
  onOpenBroksumModal,
  onAnalyzeWithAi,
}: BandarmologyWidgetProps) {
  const [data, setData] = useState<IdxBandarmologyData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const cleanTicker = currentTicker ? currentTicker.trim().toUpperCase().replace(/\.JK$/, '').replace(/^\^/, '') : '';

  const loadLiveBroksum = useCallback(async (ticker: string) => {
    if (!ticker || ticker === 'IHSG' || ticker === 'JKSE') {
      setData(null);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/broksum/live?ticker=${encodeURIComponent(ticker)}`);
      const json = await res.json();
      if (!res.ok || !json.ok) {
        throw new Error(json.message || 'Data tidak tersedia');
      }
      setData(json.data);
    } catch (err: any) {
      setError(err.message || 'Gagal memuat data live bandarmologi.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cleanTicker) {
      loadLiveBroksum(cleanTicker);
    }
  }, [cleanTicker, loadLiveBroksum]);

  if (cleanTicker === 'IHSG' || cleanTicker === 'JKSE') {
    return null;
  }

  if (isLoading) {
    return (
      <div className="bg-terminal-900 border border-terminal-800 rounded-xl p-4 animate-pulse space-y-3">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-terminal-800 rounded w-1/3"></div>
          <div className="h-4 bg-terminal-800 rounded w-1/4"></div>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-16 bg-terminal-800 rounded"></div>
          <div className="h-16 bg-terminal-800 rounded"></div>
          <div className="h-16 bg-terminal-800 rounded"></div>
        </div>
        <div className="h-20 bg-terminal-800 rounded"></div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="bg-terminal-900/60 border border-terminal-800 rounded-xl p-4 text-xs text-slate-400">
        <div className="flex items-center justify-between pb-2 border-b border-terminal-800">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5 font-mono text-xs">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>BANDARMOLOGI & VOLUME EOD</span>
          </span>
          <button
            onClick={() => loadLiveBroksum(cleanTicker)}
            className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            <RefreshCw className="w-3 h-3" /> Coba Muat
          </button>
        </div>
        <p className="mt-2 text-[11px] text-slate-500">
          {error || `Data Broker Summary EOD untuk ${cleanTicker} belum tersedia.`} Anda tetap dapat menempelkan screenshot tabel secara manual di tombol Broker Summary.
        </p>
      </div>
    );
  }

  const isAccumulation = data.bandarSide === 'ACCUMULATION';
  const isDistribution = data.bandarSide === 'DISTRIBUTION';
  const isForeignNetBuy = data.netForeignValue > 0;
  const isForeignNetSell = data.netForeignValue < 0;

  const volRatio = data.volume.ratio || 1;
  let volBadgeColor = 'text-cyan-400 bg-cyan-950/70 border-cyan-800/80';
  let volLabel = 'Normal';
  if (data.volume.signal === 'VOLUME_SURGE' || volRatio >= 1.5) {
    volBadgeColor = 'text-emerald-400 bg-emerald-950/70 border-emerald-700/80';
    volLabel = 'Surge';
  } else if (data.volume.signal === 'DRY' || volRatio <= 0.75) {
    volBadgeColor = 'text-amber-400 bg-amber-950/70 border-amber-800/80';
    volLabel = 'Dry (Sepi)';
  } else if (data.volume.signal === 'LOW') {
    volBadgeColor = 'text-rose-400 bg-rose-950/70 border-rose-800/80';
    volLabel = 'Rendah';
  }

  return (
    <div className="bg-terminal-900 border border-terminal-800 rounded-xl p-4 shadow-lg shadow-black/40 space-y-3.5 animate-fadeIn">
      {/* Header Bar */}
      <div className="flex items-center justify-between pb-2.5 border-b border-terminal-800/80">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-950/60 border border-amber-800/60 text-amber-400">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-xs font-mono text-slate-100 uppercase tracking-wide">
                Bandarmologi & Volume
              </h3>
              <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/70 font-mono flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                EOD Live
              </span>
            </div>
            <p className="text-[10px] text-slate-400 mt-0.5">
              Data: <span className="font-mono text-slate-300">{data.date}</span> • Sumber: IDX EOD Terminal
            </p>
          </div>
        </div>

        <button
          onClick={() => loadLiveBroksum(cleanTicker)}
          className="p-1 text-slate-400 hover:text-slate-200 hover:bg-terminal-800 rounded transition-colors"
          title="Perbarui Data"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Row 1: Key 3 Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {/* Card 1: Bandar Status */}
        <div className="bg-terminal-950/70 border border-terminal-800/90 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Arah Bandar</span>
            <span className="text-[9px] font-mono text-slate-500">
              Top 3/5: {data.brokerConcentrationPct.toFixed(1)}%
            </span>
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            {isAccumulation ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-950 border border-emerald-600 text-emerald-300 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> AKUMULASI
              </span>
            ) : isDistribution ? (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-rose-950 border border-rose-600 text-rose-300 flex items-center gap-1">
                <TrendingDown className="w-3 h-3" /> DISTRIBUSI
              </span>
            ) : (
              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 border border-slate-700 text-slate-300">
                NETRAL
              </span>
            )}
          </div>
          <div className="text-xs font-mono font-bold mt-1.5 text-slate-200 truncate" title={formatIdrCompact(data.bandarValue)}>
            {formatIdrCompact(data.bandarValue)}
          </div>
        </div>

        {/* Card 2: Foreign Flow */}
        <div className="bg-terminal-950/70 border border-terminal-800/90 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Arus Asing</span>
            {data.foreignStreakLength > 1 && (
              <span className="text-[9px] font-mono text-amber-400 flex items-center gap-0.5 font-semibold">
                <Flame className="w-2.5 h-2.5 text-amber-400" />
                {data.foreignStreakLength}D {data.foreignStreakSide}
              </span>
            )}
          </div>
          <div className="mt-1 flex items-center gap-1 font-mono font-bold text-xs truncate">
            <span
              className={
                isForeignNetBuy
                  ? 'text-emerald-400'
                  : isForeignNetSell
                  ? 'text-rose-400'
                  : 'text-slate-300'
              }
            >
              {formatIdrCompact(data.netForeignValue)}
            </span>
          </div>
          <div className="text-[9px] text-slate-500 font-mono mt-1 truncate">
            Buy: {formatIdrCompact(data.foreignBuyValue).replace('+', '')}
          </div>
        </div>

        {/* Card 3: Volume Ratio */}
        <div className="bg-terminal-950/70 border border-terminal-800/90 rounded-lg p-2.5 flex flex-col justify-between">
          <div className="text-[10px] text-slate-400 flex items-center justify-between">
            <span>Volume (SMA 20)</span>
            <BarChart3 className="w-3 h-3 text-cyan-400" />
          </div>
          <div className="mt-1 flex items-center gap-1.5">
            <span className="text-xs font-mono font-bold text-slate-100">
              {volRatio.toFixed(2).replace('.', ',')}x
            </span>
            <span className={`text-[9px] px-1 py-0.2 rounded border font-semibold ${volBadgeColor}`}>
              {volLabel}
            </span>
          </div>
          <div className="text-[9px] text-slate-500 font-mono mt-1">
            {formatDotNumber(Math.round(data.volume.latest / 100))} lot
          </div>
        </div>
      </div>

      {/* Row 2: Top Buyers vs Top Sellers Micro Table */}
      <div className="bg-terminal-950/80 border border-terminal-800/80 rounded-lg p-2.5">
        <div className="grid grid-cols-2 gap-3 text-[11px]">
          {/* Top Buyers */}
          <div>
            <div className="text-[10px] font-semibold text-emerald-400 pb-1 border-b border-terminal-850 flex items-center justify-between">
              <span>TOP BUYER</span>
              <span className="text-[9px] font-mono text-slate-500">AVG</span>
            </div>
            <div className="space-y-1 mt-1.5">
              {data.topBuyers.slice(0, 3).map((b, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1 truncate">
                    <span className="text-slate-200 font-bold">{b.code}</span>
                    {b.isForeign && (
                      <span className="text-[8px] px-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                        F
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-emerald-400 font-medium">{formatDotNumber(b.avgPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Top Sellers */}
          <div>
            <div className="text-[10px] font-semibold text-rose-400 pb-1 border-b border-terminal-850 flex items-center justify-between">
              <span>TOP SELLER</span>
              <span className="text-[9px] font-mono text-slate-500">AVG</span>
            </div>
            <div className="space-y-1 mt-1.5">
              {data.topSellers.slice(0, 3).map((s, idx) => (
                <div key={idx} className="flex items-center justify-between text-[11px] font-mono">
                  <div className="flex items-center gap-1 truncate">
                    <span className="text-slate-200 font-bold">{s.code}</span>
                    {s.isForeign && (
                      <span className="text-[8px] px-0.5 rounded bg-purple-950 text-purple-300 border border-purple-800">
                        F
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="text-rose-400 font-medium">{formatDotNumber(s.avgPrice)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Multi-day Akumulasi if available */}
      {data.multiday && (data.multiday.accumulators.length > 0 || data.multiday.distributors.length > 0) && (
        <div className="text-[10px] font-mono bg-terminal-950/40 p-2 rounded border border-terminal-850 flex items-center justify-between text-slate-400">
          <div className="truncate mr-2">
            <span className="text-emerald-400 font-semibold">5D Acc: </span>
            {data.multiday.accumulators.slice(0, 3).map((a) => a.code).join(', ')}
            {' • '}
            <span className="text-rose-400 font-semibold">Dist: </span>
            {data.multiday.distributors.slice(0, 3).map((d) => d.code).join(', ')}
          </div>
          <span className="text-slate-500 text-[9px] shrink-0">Multi-day</span>
        </div>
      )}

      {/* Row 4: Action Footer */}
      <div className="flex items-center justify-between pt-1 gap-2">
        <button
          onClick={() =>
            onAnalyzeWithAi(
              `${cleanTicker} analisa mendalam aliran bandarmologi, top broker buyer/seller, dan konfirmasi volume terhadap tren harga saat ini`
            )
          }
          className="flex-1 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg text-xs font-semibold bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-sm shadow-cyan-950 transition-all"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-300" />
          <span>Analisa Smart Money dengan AI</span>
        </button>

        <button
          onClick={onOpenBroksumModal}
          className="py-1.5 px-2.5 rounded-lg text-xs font-medium bg-terminal-800 hover:bg-terminal-750 text-slate-300 hover:text-white border border-terminal-700 transition-colors flex items-center gap-1 shrink-0"
          title="Buka detail tabel Broker Summary dan Orderbook"
        >
          <span>Detail</span>
          <ChevronRight className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    </div>
  );
}
