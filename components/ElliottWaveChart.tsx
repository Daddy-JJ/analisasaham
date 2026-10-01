'use client';

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Layers,
  Sparkles,
  ShieldAlert,
  Target,
  ArrowRight,
  Maximize2,
  RotateCcw,
  Compass,
} from 'lucide-react';
import { StockQuoteData } from '@/lib/yahoo-finance';
import {
  calculateElliottWaveProjections,
  ElliottWaveAnalysis,
} from '@/lib/elliott-wave';
import { formatDotNumber } from '@/lib/broksum-parser';

interface ElliottWaveChartProps {
  stockData: StockQuoteData | null;
  currentTicker: string;
  onSendToChat?: (prompt: string) => void;
  height?: string | number;
}

export default function ElliottWaveChart({
  stockData,
  currentTicker,
  onSendToChat,
  height = 540,
}: ElliottWaveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<any>(null);

  // User Interactive Toggles
  const [showProjection, setShowProjection] = useState(true);
  const [showFibLevels, setShowFibLevels] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [activeScenario, setActiveScenario] = useState<'preferred' | 'alternate'>('preferred');
  const [showRulesInfo, setShowRulesInfo] = useState(false);

  // Compute Elliott Wave analysis from real bars
  const ew: ElliottWaveAnalysis | null = useMemo(() => {
    if (!stockData || !stockData.bars || stockData.bars.length === 0) return null;
    return calculateElliottWaveProjections(stockData.bars, currentTicker, stockData.price);
  }, [stockData, currentTicker]);

  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !stockData || !stockData.bars || stockData.bars.length === 0 || !ew) return;

    let isDisposed = false;

    // Dynamically import Lightweight Charts to guarantee 100% safe client-side execution
    import('lightweight-charts').then((lc) => {
      if (isDisposed || !container) return;

      // Clean up any existing chart
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.remove();
        } catch (e) {
          // ignore cleanup errors
        }
        chartInstanceRef.current = null;
      }
      container.innerHTML = '';

      // 1. Create Chart Instance
      const chart = lc.createChart(container, {
        width: container.clientWidth || 800,
        height: typeof height === 'number' ? height : parseInt(height as string) || 500,
        layout: {
          background: { type: lc.ColorType.Solid, color: '#080c14' },
          textColor: '#94a3b8',
          fontSize: 11,
          fontFamily: 'JetBrains Mono, monospace, system-ui',
        },
        grid: {
          vertLines: { color: 'rgba(30, 41, 59, 0.4)' },
          horzLines: { color: 'rgba(30, 41, 59, 0.4)' },
        },
        crosshair: {
          mode: lc.CrosshairMode.Normal,
          vertLine: {
            color: '#38bdf8',
            width: 1,
            style: lc.LineStyle.Dashed,
            labelBackgroundColor: '#0369a1',
          },
          horzLine: {
            color: '#38bdf8',
            width: 1,
            style: lc.LineStyle.Dashed,
            labelBackgroundColor: '#0369a1',
          },
        },
        rightPriceScale: {
          borderColor: 'rgba(30, 41, 59, 0.8)',
          scaleMargins: {
            top: 0.1,
            bottom: showVolume ? 0.25 : 0.1,
          },
        },
        timeScale: {
          borderColor: 'rgba(30, 41, 59, 0.8)',
          timeVisible: true,
          secondsVisible: false,
          fixLeftEdge: false,
          fixRightEdge: false,
        },
      });

      chartInstanceRef.current = chart;

      // 2. Candlestick Series (Historical EOD)
      const candleSeries = (chart as any).addCandlestickSeries
        ? (chart as any).addCandlestickSeries({
            upColor: '#10b981',
            downColor: '#f43f5e',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#f43f5e',
          })
        : chart.addSeries(lc.CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#f43f5e',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#f43f5e',
          });

      const candleData = stockData.bars!.map((b) => ({
        time: b.time,
        open: b.open,
        high: b.high,
        low: b.low,
        close: b.close,
      }));
      candleSeries.setData(candleData);

      // 3. Volume Histogram Series (Optional)
      if (showVolume) {
        const volumeSeries = (chart as any).addHistogramSeries
          ? (chart as any).addHistogramSeries({
              priceFormat: { type: 'volume' },
              priceScaleId: '', // overlay
            })
          : chart.addSeries(lc.HistogramSeries, {
              priceFormat: { type: 'volume' },
              priceScaleId: '',
            });

        volumeSeries.priceScale().applyOptions({
          scaleMargins: {
            top: 0.8,
            bottom: 0,
          },
        });

        const volumeData = stockData.bars!.map((b) => ({
          time: b.time,
          value: b.volume,
          color: b.close >= b.open ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)',
        }));
        volumeSeries.setData(volumeData);
      }

      // 4. Historical Wave Path (Solid Line Connecting 0 -> 1 -> 2 -> Current)
      const histLineSeries = (chart as any).addLineSeries
        ? (chart as any).addLineSeries({
            color: '#38bdf8', // Neon Cyan
            lineWidth: 2,
            lineStyle: lc.LineStyle.Solid,
            title: 'Siklus Gelombang',
          })
        : chart.addSeries(lc.LineSeries, {
            color: '#38bdf8',
            lineWidth: 2,
            lineStyle: lc.LineStyle.Solid,
            title: 'Siklus Gelombang',
          });

      histLineSeries.setData(ew.historicalPath);

      // 5. Projected Wave Path (Dashed Line Connecting Current -> 3 -> 4 -> 5)
      if (showProjection) {
        const projLineSeries = (chart as any).addLineSeries
          ? (chart as any).addLineSeries({
              color: '#a855f7', // Purple Neon
              lineWidth: 2,
              lineStyle: lc.LineStyle.Dashed,
              title: 'Proyeksi Elliott Wave',
            })
          : chart.addSeries(lc.LineSeries, {
              color: '#a855f7',
              lineWidth: 2,
              lineStyle: lc.LineStyle.Dashed,
              title: 'Proyeksi Elliott Wave',
            });

        projLineSeries.setData(ew.projectedPath);
      }

      // 6. Wave Markers on historical & projected points
      const markers: any[] = [
        {
          time: ew.p0.time,
          position: 'belowBar',
          color: '#94a3b8',
          shape: 'circle',
          text: '(0) Base',
          size: 1,
        },
        {
          time: ew.p1.time,
          position: 'aboveBar',
          color: '#38bdf8',
          shape: 'arrowDown',
          text: '(1)',
          size: 1.5,
        },
        {
          time: ew.p2.time,
          position: 'belowBar',
          color: '#3b82f6',
          shape: 'arrowUp',
          text: `(2) -${ew.wave2RetracePercent.toString().replace('.', ',')}%`,
          size: 1.5,
        },
      ];

      if (showProjection) {
        markers.push(
          {
            time: ew.p3.time,
            position: 'aboveBar',
            color: '#10b981',
            shape: 'arrowDown',
            text: `(3) Target ${formatDotNumber(ew.p3.price)}`,
            size: 2,
          },
          {
            time: ew.p4.time,
            position: 'belowBar',
            color: '#f59e0b',
            shape: 'arrowUp',
            text: `(4) Pullback ${formatDotNumber(ew.p4.price)}`,
            size: 1.5,
          },
          {
            time: ew.p5.time,
            position: 'aboveBar',
            color: '#a855f7',
            shape: 'arrowDown',
            text: `(5) Finale ${formatDotNumber(ew.p5.price)}`,
            size: 1.5,
          }
        );
      }

      // Set markers (supports both v4 and v5)
      try {
        if (typeof (lc as any).createSeriesMarkers === 'function') {
          (lc as any).createSeriesMarkers(candleSeries, markers);
        } else if (typeof candleSeries.setMarkers === 'function') {
          candleSeries.setMarkers(markers);
        }
      } catch (e) {
        console.warn('Marker render note:', e);
      }

      // 7. Horizontal PriceLines (Fibonacci Targets & Invalidation)
      if (showFibLevels) {
        // Target Wave 3 (1.618 Fib)
        candleSeries.createPriceLine({
          price: ew.p3.price,
          color: '#10b981',
          lineWidth: 2,
          lineStyle: lc.LineStyle.Dashed,
          axisLabelVisible: true,
          title: `🎯 Target W3: Fib 1.618 (Rp ${formatDotNumber(ew.p3.price)})`,
        });

        // Target Wave 5 (Parity 1.0 Fib)
        candleSeries.createPriceLine({
          price: ew.p5.price,
          color: '#a855f7',
          lineWidth: 2,
          lineStyle: lc.LineStyle.Dashed,
          axisLabelVisible: true,
          title: `🎯 Target W5: Fib 1.0 (Rp ${formatDotNumber(ew.p5.price)})`,
        });

        // Invalidation Level (Red Line)
        candleSeries.createPriceLine({
          price: ew.invalidationLevel,
          color: '#f43f5e',
          lineWidth: 2,
          lineStyle: lc.LineStyle.Solid,
          axisLabelVisible: true,
          title: `⛔ Invalidation / SL (Rp ${formatDotNumber(ew.invalidationLevel)})`,
        });

        // Golden Ratio 61.8% of Wave 1
        candleSeries.createPriceLine({
          price: ew.goldenRatioInflection,
          color: '#f59e0b',
          lineWidth: 1,
          lineStyle: lc.LineStyle.Dotted,
          axisLabelVisible: true,
          title: `Area Golden Ratio 61.8% (Rp ${formatDotNumber(ew.goldenRatioInflection)})`,
        });
      }

      // Fit content nicely
      chart.timeScale().fitContent();

      // Handle window / container resize
      const handleResize = () => {
        if (container && chartInstanceRef.current) {
          chartInstanceRef.current.applyOptions({
            width: container.clientWidth,
          });
        }
      };

      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('resize', handleResize);
      };
    });

    return () => {
      isDisposed = true;
      if (chartInstanceRef.current) {
        try {
          chartInstanceRef.current.remove();
        } catch (e) {
          // ignore
        }
        chartInstanceRef.current = null;
      }
    };
  }, [stockData, ew, showProjection, showFibLevels, showVolume, height]);

  if (!stockData || !stockData.bars || stockData.bars.length === 0) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center bg-terminal-950 border border-terminal-800 rounded-xl p-6 text-center">
        <Compass className="w-10 h-10 text-cyan-400 mb-2 animate-spin" />
        <h4 className="text-sm font-semibold text-slate-200">Memuat Data Lilin EOD...</h4>
        <p className="text-xs text-slate-500 mt-1">Mengambil histori harga untuk kalkulasi proyeksi Elliott Wave.</p>
      </div>
    );
  }

  if (!ew) {
    return (
      <div className="w-full h-80 flex flex-col items-center justify-center bg-terminal-950 border border-terminal-800 rounded-xl p-6 text-center">
        <AlertTriangle className="w-8 h-8 text-amber-400 mb-2" />
        <h4 className="text-sm font-semibold text-slate-200">Histori Belum Mencukupi</h4>
        <p className="text-xs text-slate-400 mt-1">Dibutuhkan minimal 30 bar harian untuk mendeteksi swing siklus gelombang.</p>
      </div>
    );
  }

  const handleAskAIAboutWave = () => {
    if (onSendToChat) {
      onSendToChat(
        `Fase 1: Elliott Wave Principle & Fibonacci Projection untuk ${currentTicker}. Jelaskan Preferred Count (Target W3 Rp ${formatDotNumber(ew.p3.price)}) vs Alternate Count, level invalidation Rp ${formatDotNumber(ew.invalidationLevel)}, dan konfirmasi volume.`
      );
    }
  };

  return (
    <div className="w-full flex flex-col space-y-2.5 bg-terminal-950 border border-terminal-800 rounded-xl p-3 shadow-2xl">
      {/* Top Header Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 border-b border-terminal-800/80 pb-2.5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-950 border border-cyan-800 text-cyan-400">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-sm font-mono">{currentTicker}</span>
              <span className="text-[10px] px-2 py-0.5 rounded font-semibold bg-emerald-950/80 text-emerald-300 border border-emerald-800/70">
                {ew.activeWaveLabel}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Harga: <strong className="text-slate-200 font-mono">Rp {formatDotNumber(ew.currentPrice)}</strong>
              {' • '}
              Target W3: <span className="text-emerald-400 font-mono font-bold">Rp {formatDotNumber(ew.p3.price)}</span>
              {' • '}
              Risk/Reward: <span className="text-cyan-400 font-mono">{ew.riskRewardRatio}</span>
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Invalidation Badge */}
          <div className="flex items-center gap-1 px-2 py-1 rounded bg-rose-950/60 border border-rose-800/60 text-rose-300 text-[11px] font-mono">
            <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
            <span>Invalidation: Rp {formatDotNumber(ew.invalidationLevel)}</span>
          </div>

          {/* Toggle Projection */}
          <button
            type="button"
            onClick={() => setShowProjection(!showProjection)}
            className={`px-2.5 py-1 text-[11px] rounded font-medium border transition-colors ${
              showProjection
                ? 'bg-purple-950 text-purple-300 border-purple-700'
                : 'bg-terminal-900 text-slate-400 border-terminal-800 hover:text-slate-200'
            }`}
          >
            Proyeksi (3-4-5)
          </button>

          {/* Toggle Fibonacci Levels */}
          <button
            type="button"
            onClick={() => setShowFibLevels(!showFibLevels)}
            className={`px-2.5 py-1 text-[11px] rounded font-medium border transition-colors ${
              showFibLevels
                ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                : 'bg-terminal-900 text-slate-400 border-terminal-800 hover:text-slate-200'
            }`}
          >
            Garis Fibonacci
          </button>

          {/* Rules Checklist Dropdown */}
          <button
            type="button"
            onClick={() => setShowRulesInfo(!showRulesInfo)}
            className={`px-2.5 py-1 text-[11px] rounded font-medium border transition-colors flex items-center gap-1 ${
              showRulesInfo
                ? 'bg-cyan-950 text-cyan-300 border-cyan-700'
                : 'bg-terminal-900 text-slate-400 border-terminal-800 hover:text-slate-200'
            }`}
          >
            <CheckCircle2 className="w-3 h-3 text-cyan-400" />
            <span>Aturan Wave</span>
          </button>

          {/* Ask AI button */}
          <button
            type="button"
            onClick={handleAskAIAboutWave}
            className="flex items-center gap-1 px-2.5 py-1 text-[11px] rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium shadow-sm transition-colors"
          >
            <Sparkles className="w-3 h-3" />
            <span>Analisa AI</span>
          </button>
        </div>
      </div>

      {/* Collapsible Rules Compliance Drawer */}
      {showRulesInfo && (
        <div className="bg-terminal-900/90 border border-terminal-800 rounded-lg p-3 text-xs space-y-2 animate-fadeIn">
          <div className="flex items-center justify-between border-b border-terminal-800 pb-1.5">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" /> Kepatuhan 3 Hukum Mutlak Elliott Wave (Frost & Prechter):
            </span>
            <span className="text-[10px] text-cyan-400 font-mono">Otomatis Terverifikasi</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px]">
            <div className={`p-2 rounded border ${ew.rulesCheck.rule1Passed ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-rose-950/40 border-rose-800/60 text-rose-300'}`}>
              <div className="font-bold flex items-center gap-1">
                <span>Hukum 1: Wave 2 &lt; 100% W1</span>
                {ew.rulesCheck.rule1Passed ? '✅' : '❌'}
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">{ew.rulesCheck.rule1Note}</p>
            </div>

            <div className={`p-2 rounded border ${ew.rulesCheck.rule2Passed ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-rose-950/40 border-rose-800/60 text-rose-300'}`}>
              <div className="font-bold flex items-center gap-1">
                <span>Hukum 2: Wave 3 Bukan Terpendek</span>
                {ew.rulesCheck.rule2Passed ? '✅' : '❌'}
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">{ew.rulesCheck.rule2Note}</p>
            </div>

            <div className={`p-2 rounded border ${ew.rulesCheck.rule3Passed ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300' : 'bg-amber-950/40 border-amber-800/60 text-amber-300'}`}>
              <div className="font-bold flex items-center gap-1">
                <span>Hukum 3: Wave 4 Bebas Overlap W1</span>
                {ew.rulesCheck.rule3Passed ? '✅' : '⚠️'}
              </div>
              <p className="text-[10px] text-slate-300 mt-0.5">{ew.rulesCheck.rule3Note}</p>
            </div>
          </div>

          {/* Alternate Scenario Box */}
          <div className="bg-terminal-950/60 p-2 rounded border border-terminal-800 text-[11px] text-slate-400">
            <span className="text-amber-400 font-semibold">{ew.alternateCount.name}: </span>
            <span>{ew.alternateCount.scenario}</span>
          </div>
        </div>
      )}

      {/* Main Lightweight Charts Canvas Container */}
      <div
        ref={chartContainerRef}
        className="w-full rounded-lg overflow-hidden border border-terminal-850 bg-terminal-950 relative"
        style={{ height }}
      />

      {/* Bottom Chart Footer Legend */}
      <div className="flex items-center justify-between text-[10px] text-slate-400 px-1 pt-1 flex-wrap gap-2">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-cyan-400 inline-block"></span> Siklus Nyata (0-1-2)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 border-t-2 border-dashed border-purple-400 inline-block"></span> Proyeksi Masa Depan (3-4-5)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-emerald-500 inline-block"></span> Target W3 (Fib 1.618)
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-0.5 bg-rose-500 inline-block"></span> Invalidation (SL)
          </span>
        </div>
        <div className="font-mono text-slate-500">
          Powered by TradingView Lightweight Charts™ • HTML5 Canvas 60 FPS
        </div>
      </div>
    </div>
  );
}
