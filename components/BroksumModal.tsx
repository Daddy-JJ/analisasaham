'use client';

import React, { useState } from 'react';
import { X, FileSpreadsheet, CheckCircle2, Trash2, HelpCircle } from 'lucide-react';

interface BroksumModalProps {
  isOpen: boolean;
  onClose: () => void;
  broksumText: string;
  onSaveBroksum: (text: string) => void;
  currentTicker: string;
}

const SAMPLE_BROKSUM = `[Tanggal: Hari Ini / 1 Minggu Terakhir]
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

export default function BroksumModal({
  isOpen,
  onClose,
  broksumText,
  onSaveBroksum,
  currentTicker,
}: BroksumModalProps) {
  const [inputText, setInputText] = useState(broksumText);

  if (!isOpen) return null;

  const handleSave = () => {
    onSaveBroksum(inputText);
    onClose();
  };

  const handleClear = () => {
    setInputText('');
    onSaveBroksum('');
  };

  const handleInsertSample = () => {
    setInputText(SAMPLE_BROKSUM);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-terminal-900 border border-terminal-700 rounded-xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-terminal-800">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-950/60 border border-amber-800/60 text-amber-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-100 text-sm">Input Data Broker Summary (Broksum)</h3>
              <p className="text-xs text-slate-400">
                Untuk emiten: <span className="text-cyan-400 font-mono font-bold">{currentTicker || 'Saham Terpilih'}</span>
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
        <div className="p-4 space-y-3 overflow-y-auto">
          <div className="bg-terminal-950/80 p-3 rounded-lg border border-terminal-800 text-xs text-slate-400 space-y-1">
            <div className="flex items-center gap-1.5 font-medium text-amber-400">
              <HelpCircle className="w-4 h-4" />
              <span>Cara Penggunaan:</span>
            </div>
            <p>
              Salin tabel atau teks Broker Summary (Top Buyer/Seller, Foreign Flow) dari aplikasi sekuritas Anda (Stockbit, IPOT, Mirae, Ajaib, dll), lalu tempelkan di kotak bawah ini.
            </p>
            <p className="text-[11px] text-slate-500">
              Gemini Pro akan menganalisis akumulasi/distribusi 6-layer Bandarmology berdasarkan data yang Anda lampirkan.
            </p>
          </div>

          <div className="relative">
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Tempel teks tabel Broker Summary di sini..."
              rows={8}
              className="w-full p-3 text-xs bg-terminal-950 border border-terminal-700 rounded-lg text-slate-200 font-mono focus:outline-none focus:border-amber-500 transition-colors resize-none placeholder-slate-600"
            />
          </div>

          <div className="flex items-center justify-between text-xs">
            <button
              type="button"
              onClick={handleInsertSample}
              className="text-cyan-400 hover:underline text-[11px]"
            >
              Gunakan contoh format
            </button>
            {inputText && (
              <button
                type="button"
                onClick={handleClear}
                className="text-rose-400 hover:text-rose-300 flex items-center gap-1 text-[11px]"
              >
                <Trash2 className="w-3 h-3" /> Bersihkan
              </button>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-terminal-800 bg-terminal-950/50 rounded-b-xl">
          <button
            type="button"
            onClick={onClose}
            className="px-3 py-1.5 text-xs rounded-lg border border-terminal-700 text-slate-400 hover:text-slate-200 hover:bg-terminal-800 transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium rounded-lg bg-amber-600 hover:bg-amber-500 text-white transition-colors shadow-md shadow-amber-900/30"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Simpan Data Broksum</span>
          </button>
        </div>
      </div>
    </div>
  );
}
