'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';
import {
  parseBroksumText,
  formatRupiahShort,
  formatNumberShort,
  ParsedBroksumResult,
} from '@/lib/broksum-parser';

interface BroksumModalProps {
  isOpen: boolean;
  onClose: () => void;
  broksumText: string;
  onSaveBroksum: (text: string) => void;
  onAnalyzeBroksum?: (prompt: string) => void;
  currentTicker: string;
}

const SAMPLE_STANDARD = `[Tanggal: Hari Ini / 1 Minggu Terakhir]
Top Net Buyer:
1. AK: Net Buy 45.200 lot @ Avg 6.225 (Value: Rp 28,1 Miliar)
2. CC: Net Buy 32.100 lot @ Avg 6.200 (Value: Rp 19,9 Miliar)
3. NI: Net Buy 18.500 lot @ Avg 6.210 (Value: Rp 11,5 Miliar)

Top Net Seller:
1. YP: Net Sell -52.000 lot @ Avg 6.230 (Value: Rp -32,4 Miliar)
2. PD: Net Sell -25.000 lot @ Avg 6.215 (Value: Rp -15,5 Miliar)
3. XC: Net Sell -12.400 lot @ Avg 6.240 (Value: Rp -7,7 Miliar)

Foreign Flow: Net Buy Rp +35,2 Miliar
Total Traded Value: Rp 145 Miliar`;

const SAMPLE_STOCKBIT_TABLE = `BUYER\tB.Lot\tB.Val\tB.Avg\tSELLER\tS.Lot\tS.Val\tS.Avg
AK\t45.2K\t28.1B\t6,225\tYP\t52.0K\t32.4B\t6,230
CC\t32.1K\t19.9B\t6,200\tPD\t25.0K\t15.5B\t6,215
NI\t18.5K\t11.5B\t6,210\tXC\t12.4K\t7.7B\t6,240
BK\t12.0K\t7.5B\t6,220\tSQ\t10.5K\t6.5B\t6,235
KZ\t8.4K\t5.2B\t6,215\tXL\t9.2K\t5.7B\t6,225
Foreign Flow: Net Buy 35.2B`;

const SAMPLE_DISTRIBUTION = `Top Buyer:
1. YP: Net Buy 55.000 lot @ 2100 (Value: 11.5 Miliar)
2. PD: Net Buy 40.000 lot @ 2090 (Value: 8.3 Miliar)
3. XC: Net Buy 30.000 lot @ 2110 (Value: 6.3 Miliar)

Top Seller:
1. AK: Net Sell 90.000 lot @ 2100 (Value: 18.9 Miliar)
2. BK: Net Sell 70.000 lot @ 2105 (Value: 14.7 Miliar)
3. CS: Net Sell 50.000 lot @ 2095 (Value: 10.5 Miliar)

Foreign Flow: Net Sell -25.2 Miliar`;

export default function BroksumModal({
  isOpen,
  onClose,
  broksumText,
  onSaveBroksum,
  onAnalyzeBroksum,
  currentTicker,
}: BroksumModalProps) {
  const [inputText, setInputText] = useState(broksumText);

  // Synchronous live parsing as user types or pastes
  const parsed: ParsedBroksumResult = useMemo(() => {
    return parseBroksumText(inputText, currentTicker);
  }, [inputText, currentTicker]);

  if (!isOpen) return null;

  const handleSaveOnly = () => {
    onSaveBroksum(inputText);
    onClose();
  };

  const handleSaveAndAnalyze = () => {
    onSaveBroksum(inputText);
    onClose();
    if (onAnalyzeBroksum) {
      onAnalyzeBroksum(`Fase 3: Bandarmology & Volume Flow Analysis untuk ${currentTicker || 'saham ini'}`);
    }
  };

  const handleClear = () => {
    setInputText('');
    onSaveBroksum('');
  };

  const getLabelBadge = (label: ParsedBroksumResult['label']) => {
    switch (label) {
      case 'BIG ACCUMULATION':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/80 border border-emerald-500 text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Akumulasi Masif (Big Accum)
          </span>
        );
      case 'NORMAL ACCUMULATION':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-emerald-950/50 border border-emerald-600/70 text-emerald-300 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" /> Akumulasi Normal
          </span>
        );
      case 'NORMAL DISTRIBUTION':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950/50 border border-rose-600/70 text-rose-300 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Distribusi Normal
          </span>
        );
      case 'BIG DISTRIBUTION':
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-rose-950/80 border border-rose-500 text-rose-400 flex items-center gap-1">
            <TrendingDown className="w-3.5 h-3.5" /> Distribusi Masif (Big Dist)
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300 flex items-center gap-1">
            Netral / Seimbang
          </span>
        );
    }
  };

  const getCategoryBadge = (cat: string) => {
    if (cat === 'FOREIGN_INST') {
      return <span className="text-[10px] px-1 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/60">Asing</span>;
    }
    if (cat === 'LOCAL_INST') {
      return <span className="text-[10px] px-1 py-0.2 rounded bg-blue-950/60 text-blue-300 border border-blue-800/60">Institusi</span>;
    }
    if (cat === 'RETAIL') {
      return <span className="text-[10px] px-1 py-0.2 rounded bg-amber-950/60 text-amber-300 border border-amber-800/60">Ritel</span>;
    }
    return null;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-terminal-900 border border-terminal-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-terminal-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm">Smart Broker Summary & Bandarmology Parser</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
                  OpenAPI 3.1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Emiten Aktif: <span className="text-cyan-400 font-mono font-bold">{currentTicker || 'PILIH EMITEN'}</span>
                {' • '}
                <span>Mendukung copy-paste tabel Stockbit, IPOT, Mirae, dan format teks bebas</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-terminal-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 space-y-3.5 overflow-y-auto flex-1">
          {/* Preset Buttons */}
          <div className="flex items-center justify-between text-xs flex-wrap gap-2">
            <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> Contoh Format Cepat:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_STANDARD)}
                className="px-2 py-1 text-[11px] rounded bg-terminal-800 hover:bg-terminal-700 text-slate-300 border border-terminal-700 transition-colors"
              >
                Teks Standar
              </button>
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_STOCKBIT_TABLE)}
                className="px-2 py-1 text-[11px] rounded bg-terminal-800 hover:bg-terminal-700 text-cyan-300 border border-terminal-700 transition-colors"
              >
                Tabel Stockbit/IPOT
              </button>
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_DISTRIBUTION)}
                className="px-2 py-1 text-[11px] rounded bg-terminal-800 hover:bg-terminal-700 text-rose-300 border border-terminal-700 transition-colors"
              >
                Contoh Distribusi
              </button>
            </div>
          </div>

          {/* Text Input Area */}
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tempel data Broker Summary di sini (teks atau tabel copy-paste dari sekuritas)..."
              rows={6}
              className="w-full p-3 text-xs bg-terminal-950 border border-terminal-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-amber-500 transition-colors resize-none placeholder-slate-600"
            />
          </div>

          {/* Live Parser Preview */}
          {parsed.hasData ? (
            <div className="bg-terminal-950/90 border border-terminal-750 rounded-lg p-3.5 space-y-3 animate-fadeIn">
              {/* Header Status & Score */}
              <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-terminal-800">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-medium">Hasil Deteksi Smart Parser:</span>
                  {getLabelBadge(parsed.label)}
                </div>
                <div className="text-xs font-mono">
                  <span className="text-slate-400">Score Bandar: </span>
                  <span
                    className={`font-bold ${
                      parsed.score > 0 ? 'text-emerald-400' : parsed.score < 0 ? 'text-rose-400' : 'text-slate-400'
                    }`}
                  >
                    {parsed.score > 0 ? `+${parsed.score}` : parsed.score} / 100
                  </span>
                  <span className="text-[10px] text-slate-500 ml-1">
                    (Conf: {(parsed.confidence * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>

              {/* Key Factor Metrics Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
                <div className="bg-terminal-900/80 p-2 rounded border border-terminal-800">
                  <div className="text-[10px] text-slate-400">Bandar Value (Top 3)</div>
                  <div
                    className={`text-xs font-bold mt-0.5 ${
                      parsed.bandarValue3 > 0 ? 'text-emerald-400' : parsed.bandarValue3 < 0 ? 'text-rose-400' : 'text-slate-300'
                    }`}
                  >
                    {formatRupiahShort(parsed.bandarValue3)}
                  </div>
                </div>

                <div className="bg-terminal-900/80 p-2 rounded border border-terminal-800">
                  <div className="text-[10px] text-slate-400">Net Foreign Flow</div>
                  <div
                    className={`text-xs font-bold mt-0.5 ${
                      (parsed.foreignFlow ?? 0) > 0
                        ? 'text-emerald-400'
                        : (parsed.foreignFlow ?? 0) < 0
                        ? 'text-rose-400'
                        : 'text-slate-400'
                    }`}
                  >
                    {formatRupiahShort(parsed.foreignFlow)}
                  </div>
                </div>

                <div className="bg-terminal-900/80 p-2 rounded border border-terminal-800">
                  <div className="text-[10px] text-slate-400">Konsentrasi Buyer</div>
                  <div className="text-xs font-bold text-cyan-400 mt-0.5">
                    T3: {parsed.buyerConcentration.top3}%{' '}
                    <span className="text-[10px] text-slate-500 font-normal">(T1: {parsed.buyerConcentration.top1}%)</span>
                  </div>
                </div>

                <div className="bg-terminal-900/80 p-2 rounded border border-terminal-800">
                  <div className="text-[10px] text-slate-400">Konsentrasi Seller</div>
                  <div className="text-xs font-bold text-amber-400 mt-0.5">
                    T3: {parsed.sellerConcentration.top3}%{' '}
                    <span className="text-[10px] text-slate-500 font-normal">(T1: {parsed.sellerConcentration.top1}%)</span>
                  </div>
                </div>
              </div>

              {/* Side-by-side Top Buyer vs Top Seller Preview */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                {/* Buyers */}
                <div className="bg-terminal-900/50 p-2 rounded border border-terminal-800/80">
                  <div className="text-emerald-400 font-semibold mb-1 flex items-center justify-between">
                    <span>Top Net Buyer ({parsed.topBuyers.length})</span>
                    <span className="text-[10px] text-slate-400">{formatRupiahShort(parsed.totalBuyerValue)}</span>
                  </div>
                  <div className="space-y-1">
                    {parsed.topBuyers.slice(0, 4).map((b, i) => (
                      <div key={i} className="flex items-center justify-between font-mono text-[10px] text-slate-300">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-100">{b.broker}</span>
                          {getCategoryBadge(b.category)}
                        </div>
                        <div className="text-right">
                          <span>{formatNumberShort(b.lot)} lot</span>
                          <span className="text-slate-400 ml-1.5">{formatRupiahShort(b.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Sellers */}
                <div className="bg-terminal-900/50 p-2 rounded border border-terminal-800/80">
                  <div className="text-rose-400 font-semibold mb-1 flex items-center justify-between">
                    <span>Top Net Seller ({parsed.topSellers.length})</span>
                    <span className="text-[10px] text-slate-400">{formatRupiahShort(parsed.totalSellerValue)}</span>
                  </div>
                  <div className="space-y-1">
                    {parsed.topSellers.slice(0, 4).map((s, i) => (
                      <div key={i} className="flex items-center justify-between font-mono text-[10px] text-slate-300">
                        <div className="flex items-center gap-1">
                          <span className="font-bold text-slate-100">{s.broker}</span>
                          {getCategoryBadge(s.category)}
                        </div>
                        <div className="text-right">
                          <span>{formatNumberShort(s.lot)} lot</span>
                          <span className="text-slate-400 ml-1.5">{formatRupiahShort(s.value)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Reasons & Rationale bullets */}
              {parsed.reasons.length > 0 && (
                <div className="text-[11px] text-slate-300 bg-terminal-900/40 p-2 rounded border border-terminal-800 space-y-0.5">
                  <div className="text-[10px] text-amber-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Evaluasi Faktor Bandarmology:
                  </div>
                  {parsed.reasons.map((r, i) => (
                    <div key={i} className="text-slate-400 flex items-start gap-1">
                      <span className="text-cyan-400">•</span>
                      <span>{r}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : inputText.trim().length > 0 ? (
            <div className="bg-amber-950/30 border border-amber-800/50 rounded-lg p-2.5 flex items-start gap-2 text-xs text-amber-300">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p className="text-[11px]">
                Format belum terdeteksi. Pastikan mencantumkan kode broker 2 huruf (misalnya <code className="text-cyan-300">AK</code>, <code className="text-cyan-300">CC</code>, <code className="text-cyan-300">YP</code>) dan jumlah lot atau nilai transaksi. Gunakan tombol contoh format di atas sebagai panduan.
              </p>
            </div>
          ) : null}

          {/* Quick Clear Button */}
          {inputText && (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleClear}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px]"
              >
                <Trash2 className="w-3 h-3" /> Bersihkan Input
              </button>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between p-3.5 sm:p-4 border-t border-terminal-800 bg-terminal-950/60 rounded-b-xl gap-2 flex-wrap">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg border border-terminal-700 text-slate-400 hover:text-slate-200 hover:bg-terminal-800 transition-colors"
          >
            Tutup
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSaveOnly}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-medium rounded-lg border border-amber-600/70 text-amber-400 hover:bg-amber-950/40 transition-colors"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Simpan Saja</span>
            </button>

            <button
              type="button"
              onClick={handleSaveAndAnalyze}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white transition-colors shadow-md shadow-cyan-900/30"
            >
              <span>Simpan & Analisa Bandarmologi</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
