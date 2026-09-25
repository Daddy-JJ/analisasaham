'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import TradingPlanCard from '@/components/TradingPlanCard';
import ChatInterface, { Message } from '@/components/ChatInterface';
import BroksumModal from '@/components/BroksumModal';
import ScreenerModal from '@/components/ScreenerModal';
import TradingViewWidget from '@/components/TradingViewWidget';
import { StockQuoteData } from '@/lib/yahoo-finance';
import { MessageSquare, LineChart, Columns } from 'lucide-react';

export default function Home() {
  const [currentTicker, setCurrentTicker] = useState('BBCA');
  const [stockData, setStockData] = useState<StockQuoteData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [broksumText, setBroksumText] = useState('');
  const [isBroksumModalOpen, setIsBroksumModalOpen] = useState(false);
  const [isScreenerModalOpen, setIsScreenerModalOpen] = useState(false);
  const [viewMode, setViewMode] = useState<'chat' | 'chart' | 'split'>('chat');

  // Fetch real-time market data whenever ticker changes
  const loadMarketData = useCallback(async (ticker: string) => {
    setIsLoadingData(true);
    try {
      const res = await fetch(`/api/market-data?ticker=${encodeURIComponent(ticker)}`);
      const json = await res.json();
      if (json.ok && json.data) {
        setStockData(json.data);
      } else {
        console.warn('Failed to load market data:', json.message);
      }
    } catch (err) {
      console.error('Error fetching market data:', err);
    } finally {
      setIsLoadingData(false);
    }
  }, []);

  useEffect(() => {
    loadMarketData(currentTicker);
  }, [currentTicker, loadMarketData]);

  const handleSelectTicker = (newTicker: string) => {
    const clean = newTicker.trim().toUpperCase();
    if (clean && clean !== currentTicker) {
      setCurrentTicker(clean);
      loadMarketData(clean);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoadingChat) return;

    // Switch view mode to chat or split if user is on chart-only mode so they see the AI response
    if (viewMode === 'chart') {
      setViewMode('split');
    }

    const userMessageId = `user-${Date.now()}`;
    const assistantMessageId = `assistant-${Date.now()}`;

    const newMessages: Message[] = [
      ...messages,
      { id: userMessageId, role: 'user', content: text },
    ];
    setMessages(newMessages);
    setIsLoadingChat(true);

    // Placeholder for streaming assistant response
    setMessages((prev) => [
      ...prev,
      { id: assistantMessageId, role: 'assistant', content: '' },
    ]);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          ticker: currentTicker,
          broksumText,
          history: messages.slice(-10).map((m) => ({
            role: m.role,
            content: m.content,
          })),
        }),
      });

      if (!res.ok) {
        const errorJson = await res.json().catch(() => ({}));
        throw new Error(errorJson.message || `Server error: ${res.status}`);
      }

      if (!res.body) {
        throw new Error('ReadableStream not supported by browser.');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const rawData = line.slice(6).trim();
            if (!rawData || rawData === '{}') continue;

            try {
              const parsed = JSON.parse(rawData);

              if (parsed.type === 'meta' && parsed.stockData) {
                // Safely merge technical snapshot card data
                setStockData((prev) => ({ ...(prev || {}), ...parsed.stockData }));
              } else if (parsed.type === 'text' && parsed.content) {
                accumulatedContent += parsed.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              } else if (parsed.type === 'error') {
                accumulatedContent += `\n\n> ⚠️ **Error:** ${parsed.message}`;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === assistantMessageId
                      ? { ...msg, content: accumulatedContent }
                      : msg
                  )
                );
              }
            } catch (parseErr) {
              console.warn('Error parsing SSE event data:', parseErr);
            }
          }
        }
      }
    } catch (err: any) {
      console.error('Chat error:', err);
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === assistantMessageId
            ? {
                ...msg,
                content: `⚠️ **Gagal memproses analisa:** ${
                  err.message || 'Periksa koneksi atau konfigurasi GEMINI_API_KEY.'
                }`,
              }
            : msg
        )
      );
    } finally {
      setIsLoadingChat(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleSelectAndAnalyze = (ticker: string) => {
    handleSelectTicker(ticker);
    handleSendMessage(`${ticker} fase 1 wave count invalidation trading plan`);
  };

  return (
    <div className="min-h-screen flex flex-col bg-terminal-950 text-slate-100">
      {/* Sticky Header with Ticker Search and 4-Phase Actions */}
      <Header
        currentTicker={currentTicker}
        onSelectTicker={handleSelectTicker}
        onTriggerPhase={handleSendMessage}
        onOpenBroksumModal={() => setIsBroksumModalOpen(true)}
        onOpenScreenerModal={() => setIsScreenerModalOpen(true)}
        hasBroksumData={!!broksumText.trim()}
        isLoading={isLoadingChat}
      />

      {/* Main 1-Page Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Chat and/or TradingView Chart (8 cols) */}
        <section className="lg:col-span-8 flex flex-col space-y-3">
          {/* View Mode Switcher */}
          <div className="flex items-center justify-between bg-terminal-900/60 p-1.5 rounded-lg border border-terminal-800">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setViewMode('chat')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'chat'
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-terminal-850'
                }`}
              >
                <MessageSquare className="w-3.5 h-3.5" />
                <span>Analisa AI Pro</span>
              </button>

              <button
                onClick={() => setViewMode('chart')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'chart'
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-terminal-850'
                }`}
              >
                <LineChart className="w-3.5 h-3.5 text-amber-400" />
                <span>Chart TradingView</span>
              </button>

              <button
                onClick={() => setViewMode('split')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                  viewMode === 'split'
                    ? 'bg-cyan-600 text-white shadow-sm shadow-cyan-950'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-terminal-850'
                }`}
              >
                <Columns className="w-3.5 h-3.5 text-purple-400" />
                <span>Split View (Chat + Chart)</span>
              </button>
            </div>

            <div className="text-[11px] font-mono text-slate-400 pr-2 hidden sm:block">
              Simbol Chart: <span className="text-amber-400 font-bold">{currentTicker === 'IHSG' ? 'IDX:COMPOSITE' : `IDX:${currentTicker}`}</span>
            </div>
          </div>

          {/* Conditional View Rendering */}
          {viewMode === 'chat' && (
            <ChatInterface
              messages={messages}
              isLoading={isLoadingChat}
              onSendMessage={handleSendMessage}
              onClearChat={handleClearChat}
              currentTicker={currentTicker}
            />
          )}

          {viewMode === 'chart' && (
            <div className="h-[calc(100vh-190px)] min-h-[500px]">
              <TradingViewWidget ticker={currentTicker} height="100%" />
            </div>
          )}

          {viewMode === 'split' && (
            <div className="flex flex-col space-y-3">
              <div className="h-[360px]">
                <TradingViewWidget ticker={currentTicker} height="100%" />
              </div>
              <div>
                <ChatInterface
                  messages={messages}
                  isLoading={isLoadingChat}
                  onSendMessage={handleSendMessage}
                  onClearChat={handleClearChat}
                  currentTicker={currentTicker}
                />
              </div>
            </div>
          )}
        </section>

        {/* Right Column: Live Technicals & Trading Plan Snapshot (4 cols) */}
        <aside className="lg:col-span-4 space-y-4">
          <TradingPlanCard
            stockData={stockData}
            isLoadingData={isLoadingData}
            onAnalyze={handleSendMessage}
          />

          {/* Quick Info Box */}
          <div className="bg-terminal-900/60 border border-terminal-800 rounded-xl p-4 text-xs text-slate-400 space-y-2">
            <h4 className="font-semibold text-slate-200 text-xs font-mono flex items-center gap-1.5">
              <span>Fitur Interaktif TradingView:</span>
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
              <li>Pilih timeframe lilin (*1D, 1W, 1M, 15m*).</li>
              <li>Tersedia indikator bawaan (*RSI, MACD, Moving Averages, Volume*).</li>
              <li>Alat gambar tren (*Trendline, Fibonacci Retracement, Elliott Wave drawing*).</li>
              <li>Otomatis sinkron saat Anda mencari emiten baru.</li>
            </ul>
          </div>
        </aside>
      </main>

      {/* Broksum Drawer / Modal */}
      <BroksumModal
        isOpen={isBroksumModalOpen}
        onClose={() => setIsBroksumModalOpen(false)}
        broksumText={broksumText}
        onSaveBroksum={(text) => setBroksumText(text)}
        onAnalyzeBroksum={(prompt) => handleSendMessage(prompt)}
        currentTicker={currentTicker}
      />

      {/* Screener MaX (Kompas 100) Modal */}
      <ScreenerModal
        isOpen={isScreenerModalOpen}
        onClose={() => setIsScreenerModalOpen(false)}
        onSelectAndAnalyze={handleSelectAndAnalyze}
        onSendToChat={handleSendMessage}
      />
    </div>
  );
}
