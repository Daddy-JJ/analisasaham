'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  X,
  FileSpreadsheet,
  CheckCircle2,
  Trash2,
  TrendingUp,
  TrendingDown,
  Layers,
  ArrowRight,
  ShieldCheck,
  AlertTriangle,
  UploadCloud,
  Image as ImageIcon,
  Loader2,
  Sparkles,
  Clipboard,
  RefreshCw,
  BookOpen,
  Search,
} from 'lucide-react';
import {
  parseBroksumText,
  formatRupiahShort,
  formatNumberShort,
  ParsedBroksumResult,
  BrokerItem,
} from '@/lib/broksum-parser';
import {
  BROKER_MASTER_LIST,
  BROKER_GROUPS,
  getBrokerInfo,
  BrokerDefinition,
} from '@/lib/broker-reference';

interface BroksumModalProps {
  isOpen: boolean;
  onClose: () => void;
  broksumText: string;
  onSaveBroksum: (text: string) => void;
  onAnalyzeBroksum?: (prompt: string) => void;
  onSelectTicker?: (ticker: string) => void;
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
LG\t236.8K\t77.3B\t3,257\tAK\t280.2K\t92.5B\t3,260
AZ\t175K\t57.7B\t3,280\tBK\t196.4K\t63.9B\t3,242
CC\t116.1K\t37.3B\t3,255\tSS\t132K\t42.4B\t3,214
OD\t61.9K\t20.3B\t3,264\tBB\t129.2K\t41.7B\t3,230
GR\t60.2K\t19.9B\t3,268\tSQ\t40.6K\t13.4B\t3,269
Total Traded Value: 307.8B`;

const SAMPLE_DISTRIBUTION = `Top Buyer:
1. YP: Net Buy 55.000 lot @ 2100 (Value: 11.5 Miliar)
2. PD: Net Buy 40.000 lot @ 2090 (Value: 8.3 Miliar)
3. XC: Net Buy 30.000 lot @ 2110 (Value: 6.3 Miliar)

Top Seller:
1. AK: Net Sell 90.000 lot @ 2100 (Value: 18.9 Miliar)
2. BK: Net Sell 70.000 lot @ 2105 (Value: 14.7 Miliar)
3. CS: Net Sell 50.000 lot @ 2095 (Value: 10.5 Miliar)

Foreign Flow: Net Sell -25.2 Miliar`;

const SAMPLE_ORDERBOOK_DSSA = `[ORDERBOOK]
DSSA 1,055 -35 (-3.21%)
Open: 1,095 | High: 1,125 | Low: 1,050 | Prev: 1,090
Lot: 3.05M | Val: 332.53B | Avg: 1,089 | Freq: 28,047
F Buy: 65.6 B | F Sell: 92.5 B
Total Bid: 571,744 (Freq 3,428)
Total Offer: 1,759,762 (Freq 9,146)
3,428 571,744 1,759,762 9,146`;

const SAMPLE_COMBINED_DSSA = `[ORDERBOOK]
DSSA 1,055 -35 (-3.21%)
Open: 1,095 | High: 1,125 | Low: 1,050 | Prev: 1,090
Lot: 3.05M | Val: 332.53B | Avg: 1,089 | Freq: 28,047
F Buy: 65.6 B | F Sell: 92.5 B
Total Bid: 571,744 (Freq 3,428)
Total Offer: 1,759,762 (Freq 9,146)

[BROKER SUMMARY]
Tanggal: 25 Sep 26
Top 1: -8.1B (Small Dist)
Top 3: -9.7B (Normal Dist)
Top 5: -14.5B (Big Dist)
BUYER B.Lot B.Val B.Avg SELLER S.Lot S.Val S.Avg
LG 86.2K 9.7B 1095 TP 160.5K 17.1B 1069
AZ 87.1K 9.5B 1085 BK 95.9K 10.3B 1074
RF 80K 8.7B 1094 AI 85.8K 9.7B 1115
CC 50.3K 5.4B 1094 YJ 69.9K 7.4B 1059
PD 35.5K 3.9B 1089 AK 59.7K 7.1B 1101
YP 34.8K 3.8B 1090 GR 49.2K 5.3B 1078`;

export default function BroksumModal({
  isOpen,
  onClose,
  broksumText,
  onSaveBroksum,
  onAnalyzeBroksum,
  onSelectTicker,
  currentTicker,
}: BroksumModalProps) {
  const [inputText, setInputText] = useState(broksumText);
  const [imagePreviewUrl, setImagePreviewUrl] = useState<string | null>(null);
  const [isOcrLoading, setIsOcrLoading] = useState(false);
  const [ocrError, setOcrError] = useState<string | null>(null);
  const [detectedTicker, setDetectedTicker] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [showBrokerRef, setShowBrokerRef] = useState(false);
  const [brokerSearch, setBrokerSearch] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronous live parsing as user types, pastes, or after OCR
  const parsed: ParsedBroksumResult = useMemo(() => {
    return parseBroksumText(inputText, currentTicker);
  }, [inputText, currentTicker]);

  // Synchronize internal state when modal opens with existing text
  useEffect(() => {
    if (isOpen) {
      setInputText(broksumText);
      setOcrError(null);
      setDetectedTicker(null);
    }
  }, [isOpen, broksumText]);

  // Image processor for file uploads or clipboard pastes
  const processImageFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setOcrError('File yang dipilih harus berupa gambar (PNG, JPG, JPEG, WebP).');
      return;
    }
    setOcrError(null);
    setIsOcrLoading(true);

    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64 = e.target?.result as string;
      setImagePreviewUrl(base64);

      try {
        const res = await fetch('/api/broksum/ocr', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: base64, ticker: currentTicker }),
        });
        const data = await res.json();
        if (!data.ok) {
          throw new Error(data.message || 'Gagal membaca gambar');
        }
        setInputText(data.text);
        if (data.detectedTicker && data.detectedTicker !== currentTicker) {
          setDetectedTicker(data.detectedTicker);
        }
      } catch (err: any) {
        console.error('OCR Error:', err);
        setOcrError(err.message || 'Gagal mengekstrak data dari screenshot. Coba potong gambar lebih fokus ke tabel.');
      } finally {
        setIsOcrLoading(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Clipboard paste listener: enables instant Ctrl + V anywhere inside the modal
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const file = items[i].getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file);
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => {
      window.removeEventListener('paste', handlePaste);
    };
  }, [isOpen, currentTicker]);

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
    setImagePreviewUrl(null);
    setOcrError(null);
    setDetectedTicker(null);
    onSaveBroksum('');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleSwitchTicker = (newTicker: string) => {
    if (onSelectTicker) {
      onSelectTicker(newTicker);
      setDetectedTicker(null);
    }
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

  const renderBrokerBadge = (brokerCode: string, item?: BrokerItem) => {
    const info = getBrokerInfo(brokerCode);
    const classification = item?.classification || info?.classification;
    const isRetail =
      item?.character?.toLowerCase().includes('retail') ||
      item?.category === 'RETAIL' ||
      info?.isRetailHeavy;
    const name = item?.brokerName || info?.name || brokerCode;
    const character = item?.character || info?.character || '';
    const tooltip = `${brokerCode} — ${name}${character ? ` (${character})` : ''}`;

    let badgeClass = 'bg-slate-800 text-slate-300 border-slate-700';
    let label = 'Other';

    if (classification === 'BUMN') {
      badgeClass = 'bg-cyan-950/70 text-cyan-300 border-cyan-700/60';
      label = 'BUMN';
    } else if (classification === 'FOREIGN') {
      badgeClass = 'bg-purple-950/70 text-purple-300 border-purple-700/60';
      label = 'Asing';
    } else if (classification === 'DOMESTIC_PRIVATE') {
      badgeClass = 'bg-blue-950/70 text-blue-300 border-blue-700/60';
      label = 'Lokal';
    }

    return (
      <span title={tooltip} className="inline-flex items-center gap-1 cursor-help">
        <span className={`text-[9px] px-1 py-0.2 rounded font-medium border ${badgeClass}`}>
          {label}
        </span>
        {isRetail && (
          <span className="text-[9px] px-1 py-0.2 rounded font-medium bg-amber-950/70 text-amber-300 border border-amber-800/60">
            Ritel
          </span>
        )}
      </span>
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-terminal-900 border border-terminal-700 rounded-xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-terminal-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-slate-100 text-sm">Smart Broksum & Orderbook Terminal</h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60 font-mono">
                  Vision AI • Tape Reading • OpenAPI 3.1
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Emiten: <span className="text-cyan-400 font-mono font-bold">{currentTicker || 'PILIH EMITEN'}</span>
                {' • '}
                <span>Paste screenshot Orderbook / Broksum (Ctrl+V) atau input teks</span>
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
          {/* Screenshot Upload / Paste Box */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-3.5 transition-all cursor-pointer flex flex-col sm:flex-row items-center justify-between gap-3 ${
              isDragging
                ? 'border-cyan-400 bg-cyan-950/30'
                : 'border-terminal-700 bg-terminal-950/70 hover:border-cyan-500/70 hover:bg-terminal-950'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept="image/*"
              className="hidden"
            />

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-cyan-950/70 border border-cyan-700/60 flex items-center justify-center text-cyan-400 shrink-0">
                {isOcrLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <UploadCloud className="w-5 h-5" />
                )}
              </div>
              <div className="text-left">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-semibold text-slate-200">
                    {isOcrLoading ? 'Gemini AI sedang membaca screenshot...' : 'Upload Screenshot Stockbit / Sekuritas'}
                  </span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-amber-950 text-amber-400 border border-amber-800/60 font-mono">
                    OCR AI
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tinggal tekan <kbd className="px-1.5 py-0.5 bg-terminal-800 rounded text-cyan-300 font-mono text-[10px] border border-terminal-700">Ctrl + V</kbd> untuk paste gambar langsung, atau klik untuk memilih file.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {imagePreviewUrl && (
                <div className="relative group">
                  <img
                    src={imagePreviewUrl}
                    alt="Preview Broksum"
                    className="w-10 h-10 object-cover rounded border border-terminal-700 shadow"
                  />
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity rounded">
                    <RefreshCw className="w-3.5 h-3.5 text-white" />
                  </div>
                </div>
              )}
              <span className="text-xs px-2.5 py-1 rounded bg-terminal-800 text-cyan-400 border border-terminal-700 font-medium whitespace-nowrap">
                Pilih Gambar
              </span>
            </div>
          </div>

          {/* OCR Error Notification */}
          {ocrError && (
            <div className="bg-rose-950/40 border border-rose-800/60 rounded-lg p-2.5 flex items-start gap-2 text-xs text-rose-300 animate-fadeIn">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <p className="text-[11px]">{ocrError}</p>
            </div>
          )}

          {/* Ticker Mismatch Suggestion Banner */}
          {detectedTicker && detectedTicker !== currentTicker && (
            <div className="bg-cyan-950/60 border border-cyan-700/70 rounded-lg p-2.5 flex items-center justify-between text-xs text-cyan-300 animate-fadeIn">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  Screenshot terdeteksi untuk emiten: <strong className="text-white font-mono">{detectedTicker}</strong> (sedang aktif: {currentTicker || 'Belum dipilih'}).
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleSwitchTicker(detectedTicker)}
                className="px-2.5 py-1 rounded bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-[11px] transition-colors whitespace-nowrap"
              >
                Beralih ke {detectedTicker}
              </button>
            </div>
          )}

          {/* Preset Buttons */}
          <div className="flex items-center justify-between text-xs flex-wrap gap-2 pt-1">
            <span className="text-slate-400 text-[11px] font-medium flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-amber-400" /> Contoh & Referensi:
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setShowBrokerRef(!showBrokerRef)}
                className={`px-2 py-1 text-[11px] rounded border transition-colors flex items-center gap-1 ${
                  showBrokerRef
                    ? 'bg-amber-950/70 text-amber-300 border-amber-600/70 font-semibold'
                    : 'bg-terminal-800 hover:bg-terminal-700 text-amber-400 border-terminal-700'
                }`}
              >
                <BookOpen className="w-3 h-3" />
                <span>{showBrokerRef ? 'Tutup Klasifikasi' : 'Referensi Broker IDX'}</span>
              </button>
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_COMBINED_DSSA)}
                className="px-2 py-1 text-[11px] rounded bg-terminal-800 hover:bg-terminal-700 text-purple-300 border border-purple-800/60 transition-colors"
                title="Contoh kombinasi Broksum dan Orderbook DSSA"
              >
                Broksum + OB (DSSA)
              </button>
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_ORDERBOOK_DSSA)}
                className="px-2 py-1 text-[11px] rounded bg-terminal-800 hover:bg-terminal-700 text-blue-300 border border-blue-800/60 transition-colors"
                title="Contoh Orderbook DSSA"
              >
                Orderbook (DSSA)
              </button>
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_STOCKBIT_TABLE)}
                className="px-2 py-1 text-[11px] rounded bg-terminal-800 hover:bg-terminal-700 text-cyan-300 border border-terminal-700 transition-colors"
              >
                Tabel Stockbit
              </button>
              <button
                type="button"
                onClick={() => setInputText(SAMPLE_STANDARD)}
                className="px-2 py-1 text-[11px] rounded bg-terminal-800 hover:bg-terminal-700 text-slate-300 border border-terminal-700 transition-colors"
              >
                Teks Standar
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

          {/* Collapsible Broker Reference Master Drawer */}
          {showBrokerRef && (
            <div className="bg-terminal-950 border border-cyan-800/60 rounded-xl p-3 space-y-2.5 animate-fadeIn shadow-xl">
              <div className="flex items-center justify-between gap-2 border-b border-terminal-800 pb-2 flex-wrap">
                <div className="flex items-center gap-2">
                  <div className="p-1 rounded bg-cyan-950 text-cyan-400 border border-cyan-800/60">
                    <BookOpen className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-semibold text-slate-100">
                      Master Klasifikasi & Karakter Broker IDX
                    </h4>
                    <p className="text-[10px] text-slate-400">
                      Foreign / foreign-affiliated • Local / swasta domestik • BUMN / state-linked
                    </p>
                  </div>
                </div>
                <div className="relative w-44 sm:w-56">
                  <Search className="w-3.5 h-3.5 absolute left-2 top-2 text-slate-400" />
                  <input
                    type="text"
                    value={brokerSearch}
                    onChange={(e) => setBrokerSearch(e.target.value)}
                    placeholder="Cari kode atau nama broker..."
                    className="w-full pl-7 pr-2 py-1 text-[11px] bg-terminal-900 border border-terminal-750 rounded text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {/* 1. Foreign / foreign-affiliated */}
                <div className="bg-terminal-900/60 rounded-lg p-2.5 border border-purple-900/40">
                  <div className="flex items-center justify-between text-purple-300 font-semibold mb-2 border-b border-purple-900/50 pb-1 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-purple-400"></span>
                      Foreign / Foreign-Affiliated
                    </span>
                    <span className="text-[10px] text-purple-400/80 font-mono">
                      {BROKER_GROUPS.FOREIGN.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {BROKER_GROUPS.FOREIGN
                      .filter(
                        (b) =>
                          !brokerSearch ||
                          b.code.toLowerCase().includes(brokerSearch.toLowerCase()) ||
                          b.name.toLowerCase().includes(brokerSearch.toLowerCase()) ||
                          b.character.toLowerCase().includes(brokerSearch.toLowerCase())
                      )
                      .map((b) => (
                        <div key={b.code} className="p-1 rounded bg-terminal-950/40 border border-terminal-800/50 hover:border-purple-700/50 transition-colors">
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-cyan-300 text-[11px]">{b.code}</span>
                            {renderBrokerBadge(b.code)}
                          </div>
                          <div className="text-[10px] text-slate-200 font-medium truncate">{b.name}</div>
                          <div className="text-[9px] text-slate-400 italic line-clamp-1">{b.character}</div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 2. Local / swasta domestik */}
                <div className="bg-terminal-900/60 rounded-lg p-2.5 border border-blue-900/40">
                  <div className="flex items-center justify-between text-blue-300 font-semibold mb-2 border-b border-blue-900/50 pb-1 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-400"></span>
                      Local / Swasta Domestik
                    </span>
                    <span className="text-[10px] text-blue-400/80 font-mono">
                      {BROKER_GROUPS.DOMESTIC_PRIVATE.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {BROKER_GROUPS.DOMESTIC_PRIVATE
                      .filter(
                        (b) =>
                          !brokerSearch ||
                          b.code.toLowerCase().includes(brokerSearch.toLowerCase()) ||
                          b.name.toLowerCase().includes(brokerSearch.toLowerCase()) ||
                          b.character.toLowerCase().includes(brokerSearch.toLowerCase())
                      )
                      .map((b) => (
                        <div key={b.code} className="p-1 rounded bg-terminal-950/40 border border-terminal-800/50 hover:border-blue-700/50 transition-colors">
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-cyan-300 text-[11px]">{b.code}</span>
                            {renderBrokerBadge(b.code)}
                          </div>
                          <div className="text-[10px] text-slate-200 font-medium truncate">{b.name}</div>
                          <div className="text-[9px] text-slate-400 italic line-clamp-1">{b.character}</div>
                        </div>
                      ))}
                  </div>
                </div>

                {/* 3. BUMN / state-linked */}
                <div className="bg-terminal-900/60 rounded-lg p-2.5 border border-cyan-900/40">
                  <div className="flex items-center justify-between text-cyan-300 font-semibold mb-2 border-b border-cyan-900/50 pb-1 text-[11px]">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                      BUMN / State-Linked
                    </span>
                    <span className="text-[10px] text-cyan-400/80 font-mono">
                      {BROKER_GROUPS.BUMN.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {BROKER_GROUPS.BUMN
                      .filter(
                        (b) =>
                          !brokerSearch ||
                          b.code.toLowerCase().includes(brokerSearch.toLowerCase()) ||
                          b.name.toLowerCase().includes(brokerSearch.toLowerCase()) ||
                          b.character.toLowerCase().includes(brokerSearch.toLowerCase())
                      )
                      .map((b) => (
                        <div key={b.code} className="p-1 rounded bg-terminal-950/40 border border-terminal-800/50 hover:border-cyan-700/50 transition-colors">
                          <div className="flex items-center justify-between font-mono">
                            <span className="font-bold text-cyan-300 text-[11px]">{b.code}</span>
                            {renderBrokerBadge(b.code)}
                          </div>
                          <div className="text-[10px] text-slate-200 font-medium truncate">{b.name}</div>
                          <div className="text-[9px] text-slate-400 italic line-clamp-1">{b.character}</div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Text Input Area */}
          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Hasil ekstrak OCR screenshot akan tampil di sini, atau Anda bisa paste teks tabel langsung..."
              rows={5}
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
                  <div className="text-[10px] text-slate-400">
                    {parsed.totalTradedValue ? 'Total Traded Value' : 'Net Foreign Flow'}
                  </div>
                  <div className="text-xs font-bold mt-0.5 text-cyan-400">
                    {parsed.totalTradedValue
                      ? formatRupiahShort(parsed.totalTradedValue)
                      : formatRupiahShort(parsed.foreignFlow)}
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

              {/* Orderbook Microstructure Card (if available) */}
              {parsed.orderbook?.hasOrderbook && (
                <div className="bg-terminal-900/60 border border-terminal-800 rounded-lg p-3 space-y-2.5">
                  <div className="flex items-center justify-between flex-wrap gap-2 pb-1.5 border-b border-terminal-800/80">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse"></span>
                      <span className="text-xs font-semibold text-slate-200">
                        Orderbook Microstructure (Tape Reading)
                      </span>
                    </div>
                    {parsed.orderbook.orderbookPosture && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-medium border ${
                          parsed.orderbook.orderbookPosture === 'HEAVY_OFFER_SUPPRESSION'
                            ? 'bg-rose-950/80 text-rose-300 border-rose-800/70'
                            : parsed.orderbook.orderbookPosture === 'STRONG_BID_CUSHION'
                            ? 'bg-emerald-950/80 text-emerald-300 border-emerald-800/70'
                            : 'bg-slate-800 text-slate-300 border-slate-700'
                        }`}
                      >
                        {parsed.orderbook.orderbookPosture === 'HEAVY_OFFER_SUPPRESSION'
                          ? 'Offer Wall Suppression'
                          : parsed.orderbook.orderbookPosture === 'STRONG_BID_CUSHION'
                          ? 'Strong Bid Cushion'
                          : 'Balanced Orderbook'}
                      </span>
                    )}
                  </div>

                  {/* Bid vs Offer Visual Bar */}
                  {parsed.orderbook.totalBidLot && parsed.orderbook.totalOfferLot && (
                    <div className="space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-mono">
                        <span className="text-emerald-400 font-semibold">
                          Bid: {formatNumberShort(parsed.orderbook.totalBidLot)} lot{' '}
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({Math.round(
                              (parsed.orderbook.totalBidLot /
                                (parsed.orderbook.totalBidLot + parsed.orderbook.totalOfferLot)) *
                                100
                            )}%)
                          </span>
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          Ratio: {parsed.orderbook.bidOfferRatio}x
                        </span>
                        <span className="text-rose-400 font-semibold">
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({Math.round(
                              (parsed.orderbook.totalOfferLot /
                                (parsed.orderbook.totalBidLot + parsed.orderbook.totalOfferLot)) *
                                100
                            )}%){' '}
                          </span>
                          Offer: {formatNumberShort(parsed.orderbook.totalOfferLot)} lot
                        </span>
                      </div>
                      <div className="w-full h-2.5 bg-terminal-950 rounded-full overflow-hidden flex border border-terminal-800">
                        <div
                          className="h-full bg-emerald-500 transition-all duration-500"
                          style={{
                            width: `${Math.round(
                              (parsed.orderbook.totalBidLot /
                                (parsed.orderbook.totalBidLot + parsed.orderbook.totalOfferLot)) *
                                100
                            )}%`,
                          }}
                        />
                        <div
                          className="h-full bg-rose-500 transition-all duration-500"
                          style={{
                            width: `${Math.round(
                              (parsed.orderbook.totalOfferLot /
                                (parsed.orderbook.totalBidLot + parsed.orderbook.totalOfferLot)) *
                                100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}

                  {/* Orderbook Key Metrics Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] font-mono">
                    {parsed.orderbook.lastPrice !== undefined && (
                      <div className="bg-terminal-950/60 p-1.5 rounded border border-terminal-800">
                        <div className="text-[9px] text-slate-400">Harga Terakhir</div>
                        <div className="font-bold text-slate-200">
                          Rp {parsed.orderbook.lastPrice.toLocaleString('id-ID')}
                          {parsed.orderbook.changePercent !== undefined && (
                            <span
                              className={`text-[10px] ml-1 ${
                                parsed.orderbook.changePercent < 0 ? 'text-rose-400' : 'text-emerald-400'
                              }`}
                            >
                              {parsed.orderbook.changePercent > 0 ? '+' : ''}
                              {parsed.orderbook.changePercent}%
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {parsed.orderbook.netForeignIntraday !== undefined && (
                      <div className="bg-terminal-950/60 p-1.5 rounded border border-terminal-800">
                        <div className="text-[9px] text-slate-400">Net Asing Intraday</div>
                        <div
                          className={`font-bold ${
                            parsed.orderbook.netForeignIntraday < 0 ? 'text-rose-400' : 'text-emerald-400'
                          }`}
                        >
                          {formatRupiahShort(parsed.orderbook.netForeignIntraday)}
                        </div>
                      </div>
                    )}
                    {parsed.orderbook.totalValue !== undefined && (
                      <div className="bg-terminal-950/60 p-1.5 rounded border border-terminal-800">
                        <div className="text-[9px] text-slate-400">Turnover Orderbook</div>
                        <div className="font-bold text-cyan-400">
                          {formatRupiahShort(parsed.orderbook.totalValue)}
                        </div>
                      </div>
                    )}
                    {parsed.orderbook.avg !== undefined && (
                      <div className="bg-terminal-950/60 p-1.5 rounded border border-terminal-800">
                        <div className="text-[9px] text-slate-400">Avg Transaksi</div>
                        <div className="font-bold text-slate-300">
                          Rp {parsed.orderbook.avg.toLocaleString('id-ID')}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Side-by-side Top Buyer vs Top Seller Preview (if present) */}
              {(parsed.topBuyers.length > 0 || parsed.topSellers.length > 0) && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
                  {/* Buyers */}
                  <div className="bg-terminal-900/50 p-2 rounded border border-terminal-800/80">
                    <div className="text-emerald-400 font-semibold mb-1 flex items-center justify-between">
                      <span>Top Net Buyer ({parsed.topBuyers.length})</span>
                      <span className="text-[10px] text-slate-400">{formatRupiahShort(parsed.totalBuyerValue)}</span>
                    </div>
                    <div className="space-y-1">
                      {parsed.topBuyers.slice(0, 5).map((b, i) => (
                        <div key={i} className="flex items-center justify-between font-mono text-[10px] text-slate-300">
                          <div className="flex items-center gap-1">
                            <span
                              className="font-bold text-slate-100 hover:text-cyan-300 cursor-help transition-colors"
                              title={b.brokerName ? `${b.broker} — ${b.brokerName}${b.character ? ` (${b.character})` : ''}` : b.broker}
                            >
                              {b.broker}
                            </span>
                            {renderBrokerBadge(b.broker, b)}
                          </div>
                          <div className="text-right">
                            <span>{formatNumberShort(b.lot)} lot</span>
                            <span className="text-slate-400 ml-1.5">{formatRupiahShort(b.value)}</span>
                            {b.avgPrice > 0 && (
                              <span className="text-slate-500 ml-1">@{b.avgPrice.toLocaleString('id-ID')}</span>
                            )}
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
                      {parsed.topSellers.slice(0, 5).map((s, i) => (
                        <div key={i} className="flex items-center justify-between font-mono text-[10px] text-slate-300">
                          <div className="flex items-center gap-1">
                            <span
                              className="font-bold text-slate-100 hover:text-cyan-300 cursor-help transition-colors"
                              title={s.brokerName ? `${s.broker} — ${s.brokerName}${s.character ? ` (${s.character})` : ''}` : s.broker}
                            >
                              {s.broker}
                            </span>
                            {renderBrokerBadge(s.broker, s)}
                          </div>
                          <div className="text-right">
                            <span>{formatNumberShort(s.lot)} lot</span>
                            <span className="text-slate-400 ml-1.5">{formatRupiahShort(s.value)}</span>
                            {s.avgPrice > 0 && (
                              <span className="text-slate-500 ml-1">@{s.avgPrice.toLocaleString('id-ID')}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

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
                Format belum terdeteksi. Pastikan mencantumkan kode broker 2 huruf (misalnya <code className="text-cyan-300">AK</code>, <code className="text-cyan-300">CC</code>, <code className="text-cyan-300">LG</code>) dan jumlah lot atau nilai transaksi. Atau gunakan fitur upload screenshot di atas.
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
