'use client';

import React from 'react';
import { StockQuoteData } from '@/lib/yahoo-finance';
import { Activity, ShieldAlert, Target, TrendingUp, AlertTriangle, ArrowUpRight, ArrowDownRight, Compass } from 'lucide-react';

interface TradingPlanCardProps {
  stockData: StockQuoteData | null;
  isLoadingData: boolean;
  onAnalyze: (prompt: string) => void;
}

export default function TradingPlanCard({
  stockData,
  isLoadingData,
  onAnalyze,
}: TradingPlanCardProps) {
  if (isLoadingData) {
    return (
      <div className="bg-terminal-900 border border-terminal-800 rounded-xl p-5 animate-pulse">
        <div className="h-6 bg-terminal-800 rounded w-1/3 mb-4"></div>
        <div className="h-10 bg-terminal-800 rounded w-1/2 mb-6"></div>
        <div className="space-y-3">
          <div className="h-4 bg-terminal-800 rounded w-full"></div>
          <div className="h-4 bg-terminal-800 rounded w-5/6"></div>
          <div className="h-4 bg-terminal-800 rounded w-4/6"></div>
        </div>
      </div>
    );
  }

  if (!stockData) {
    return (
      <div className="bg-terminal-900/60 border border-dashed border-terminal-800 rounded-xl p-6 text-center">
        <Compass className="w-8 h-8 text-slate-500 mx-auto mb-2" />
        <p className="text-sm font-medium text-slate-300">Belum ada emiten dipilih</p>
        <p className="text-xs text-slate-500 mt-1">
          Ketik ticker di atas (contoh: <span className="text-cyan-400 font-mono">BBCA</span>, <span className="text-cyan-400 font-mono">TLKM</span>, atau <span className="text-cyan-400 font-mono">IHSG</span>) untuk memuat data live.
        </p>
      </div>
    );
  }

  const isPositive = stockData.change >= 0;
  const isIHSG = stockData.tickerClean === 'IHSG';

  // Evaluate RSI State
  const rsi = stockData.rsi14;
  let rsiLabel = 'Netral';
  let rsiColor = 'text-slate-300';
  if (rsi !== undefined) {
    if (rsi >= 70) {
      rsiLabel = 'Overbought';
      rsiColor = 'text-rose-400';
    } else if (rsi <= 30) {
      rsiLabel = 'Oversold';
      rsiColor = 'text-emerald-400';
    } else if (rsi >= 50) {
      rsiLabel = 'Bullish Bias';
      rsiColor = 'text-cyan-400';
    } else {
      rsiLabel = 'Bearish Bias';
      rsiColor = 'text-amber-400';
    }
  }

  // Trend vs MA
  const aboveMA20 = stockData.ma20 ? stockData.price >= stockData.ma20 : null;
  const aboveMA50 = stockData.ma50 ? stockData.price >= stockData.ma50 : null;
  const aboveMA200 = stockData.ma200 ? stockData.price >= stockData.ma200 : null;

  return (
    <div className="bg-terminal-900 border border-terminal-800 rounded-xl p-5 shadow-lg shadow-black/40">
      {/* Header Info */}
      <div className="flex items-start justify-between border-b border-terminal-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold font-mono text-slate-100">{stockData.tickerClean}</h2>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-terminal-800 text-slate-300 border border-terminal-700">
              {stockData.symbol}
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{stockData.name}</p>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold font-mono text-slate-100">
            {isIHSG ? stockData.price.toFixed(2) : `Rp ${stockData.price.toLocaleString('id-ID')}`}
          </div>
          <div
            className={`flex items-center justify-end gap-1 text-xs font-mono font-medium mt-0.5 ${
              isPositive ? 'text-emerald-400' : 'text-rose-400'
            }`}
          >
            {isPositive ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>
              {isPositive ? '+' : ''}
              {isIHSG ? stockData.change.toFixed(2) : stockData.change.toLocaleString('id-ID')} ({stockData.changePercent.toFixed(2)}%)
            </span>
          </div>
        </div>
      </div>

      {/* Intraday Stats Grid */}
      <div className="grid grid-cols-2 gap-2 my-3 text-xs font-mono">
        <div className="bg-terminal-950/60 p-2 rounded-lg border border-terminal-800/60">
          <span className="text-slate-500 block text-[10px]">Rentang Hari Ini</span>
          <span className="text-slate-200">
            {stockData.low.toLocaleString('id-ID')} - {stockData.high.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="bg-terminal-950/60 p-2 rounded-lg border border-terminal-800/60">
          <span className="text-slate-500 block text-[10px]">52-Week Range</span>
          <span className="text-slate-200">
            {stockData.fiftyTwoWeekLow.toLocaleString('id-ID')} - {stockData.fiftyTwoWeekHigh.toLocaleString('id-ID')}
          </span>
        </div>
        <div className="bg-terminal-950/60 p-2 rounded-lg border border-terminal-800/60">
          <span className="text-slate-500 block text-[10px]">Volume Terakhir</span>
          <span className="text-slate-200">{stockData.volume.toLocaleString('id-ID')}</span>
        </div>
        <div className="bg-terminal-950/60 p-2 rounded-lg border border-terminal-800/60">
          <span className="text-slate-500 block text-[10px]">Vol Ratio (vs MA20)</span>
          <span className={`font-semibold ${stockData.volumeRatio && stockData.volumeRatio > 1.5 ? 'text-emerald-400' : 'text-slate-200'}`}>
            {stockData.volumeRatio ? `${stockData.volumeRatio}x` : 'N/A'}
          </span>
        </div>
      </div>

      {/* Technical Indicators */}
      <div className="space-y-2 mt-4 pt-3 border-t border-terminal-800/80">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-cyan-400" /> RSI (14 Period):
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-slate-200">{rsi !== undefined ? rsi : 'N/A'}</span>
            <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-medium bg-terminal-800 ${rsiColor}`}>
              {rsiLabel}
            </span>
          </div>
        </div>

        {/* RSI Bar Visual */}
        {rsi !== undefined && (
          <div className="w-full bg-terminal-950 rounded-full h-1.5 overflow-hidden flex">
            <div
              className={`h-full transition-all ${
                rsi >= 70 ? 'bg-rose-500' : rsi <= 30 ? 'bg-emerald-500' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(100, Math.max(0, rsi))}%` }}
            ></div>
          </div>
        )}

        {/* Moving Average Checklist */}
        <div className="grid grid-cols-3 gap-1.5 pt-2 text-[11px] font-mono text-center">
          <div className={`p-1 rounded border ${aboveMA20 ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' : 'bg-rose-950/30 border-rose-800/50 text-rose-300'}`}>
            <span className="block text-[9px] text-slate-500">MA20</span>
            {stockData.ma20 ? stockData.ma20.toLocaleString('id-ID') : '-'}
          </div>
          <div className={`p-1 rounded border ${aboveMA50 ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' : 'bg-rose-950/30 border-rose-800/50 text-rose-300'}`}>
            <span className="block text-[9px] text-slate-500">MA50</span>
            {stockData.ma50 ? stockData.ma50.toLocaleString('id-ID') : '-'}
          </div>
          <div className={`p-1 rounded border ${aboveMA200 ? 'bg-emerald-950/30 border-emerald-800/50 text-emerald-300' : 'bg-rose-950/30 border-rose-800/50 text-rose-300'}`}>
            <span className="block text-[9px] text-slate-500">MA200</span>
            {stockData.ma200 ? stockData.ma200.toLocaleString('id-ID') : '-'}
          </div>
        </div>
      </div>

      {/* Quick Launch Buttons for this Stock */}
      <div className="mt-4 pt-3 border-t border-terminal-800/80 space-y-2">
        <button
          onClick={() => onAnalyze(`${stockData.tickerClean} fase 1 wave count invalidation`)}
          className="w-full flex items-center justify-center gap-2 py-2 px-3 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-950/40 transition-colors"
        >
          <TrendingUp className="w-3.5 h-3.5" />
          <span>Mulai Analisa Wave {stockData.tickerClean}</span>
        </button>

        <button
          onClick={() => onAnalyze(`${stockData.tickerClean} fase 4 complete trading plan entry sl tp`)}
          className="w-full flex items-center justify-center gap-2 py-1.5 px-3 text-xs font-medium rounded-lg bg-terminal-800 hover:bg-terminal-700 text-slate-200 transition-colors"
        >
          <Target className="w-3.5 h-3.5 text-purple-400" />
          <span>Buat Trading Plan (Entry & SL)</span>
        </button>
      </div>

      <div className="mt-3 text-[10px] text-slate-500 text-center">
        Data realtime/EOD diperbarui: {stockData.latestDate} via Yahoo Finance
      </div>
    </div>
  );
}
