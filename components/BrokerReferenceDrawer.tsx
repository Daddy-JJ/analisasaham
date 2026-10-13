'use client';

import React, { useState } from 'react';
import { BookOpen, Search } from 'lucide-react';
import { BROKER_GROUPS, getBrokerInfo } from '@/lib/broker-reference';

interface BrokerReferenceDrawerProps {
  isOpen: boolean;
}

export default function BrokerReferenceDrawer({ isOpen }: BrokerReferenceDrawerProps) {
  const [brokerSearch, setBrokerSearch] = useState('');

  if (!isOpen) return null;

  const renderBadge = (code: string) => {
    const info = getBrokerInfo(code);
    const classification = info?.classification;
    const isRetail = info?.isRetailHeavy;

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
      <span className="inline-flex items-center gap-1">
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

  const filterBroker = (b: { code: string; name: string; character: string }) => {
    if (!brokerSearch.trim()) return true;
    const q = brokerSearch.toLowerCase();
    return (
      b.code.toLowerCase().includes(q) ||
      b.name.toLowerCase().includes(q) ||
      b.character.toLowerCase().includes(q)
    );
  };

  return (
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
            {BROKER_GROUPS.FOREIGN.filter(filterBroker).map((b) => (
              <div key={b.code} className="p-1 rounded bg-terminal-950/40 border border-terminal-800/50 hover:border-purple-700/50 transition-colors">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-purple-300 text-[11px]">{b.code}</span>
                  {renderBadge(b.code)}
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
            {BROKER_GROUPS.DOMESTIC_PRIVATE.filter(filterBroker).map((b) => (
              <div key={b.code} className="p-1 rounded bg-terminal-950/40 border border-terminal-800/50 hover:border-blue-700/50 transition-colors">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-blue-300 text-[11px]">{b.code}</span>
                  {renderBadge(b.code)}
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
            {BROKER_GROUPS.BUMN.filter(filterBroker).map((b) => (
              <div key={b.code} className="p-1 rounded bg-terminal-950/40 border border-terminal-800/50 hover:border-cyan-700/50 transition-colors">
                <div className="flex items-center justify-between font-mono">
                  <span className="font-bold text-cyan-300 text-[11px]">{b.code}</span>
                  {renderBadge(b.code)}
                </div>
                <div className="text-[10px] text-slate-200 font-medium truncate">{b.name}</div>
                <div className="text-[9px] text-slate-400 italic line-clamp-1">{b.character}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
