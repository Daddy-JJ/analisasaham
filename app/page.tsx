'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Header from '@/components/Header';
import TradingPlanCard from '@/components/TradingPlanCard';
import ChatInterface, { Message } from '@/components/ChatInterface';
import BroksumModal from '@/components/BroksumModal';
import { StockQuoteData } from '@/lib/yahoo-finance';

export default function Home() {
  const [currentTicker, setCurrentTicker] = useState('BBCA');
  const [stockData, setStockData] = useState<StockQuoteData | null>(null);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoadingChat, setIsLoadingChat] = useState(false);
  const [broksumText, setBroksumText] = useState('');
  const [isBroksumModalOpen, setIsBroksumModalOpen] = useState(false);

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

  return (
    <div className="min-h-screen flex flex-col bg-terminal-950 text-slate-100">
      {/* Sticky Header with Ticker Search and 4-Phase Actions */}
      <Header
        currentTicker={currentTicker}
        onSelectTicker={handleSelectTicker}
        onTriggerPhase={handleSendMessage}
        onOpenBroksumModal={() => setIsBroksumModalOpen(true)}
        hasBroksumData={!!broksumText.trim()}
        isLoading={isLoadingChat}
      />

      {/* Main 1-Page Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 lg:grid-cols-12 gap-4">
        {/* Left Column: Chat Analysis (8 cols) */}
        <section className="lg:col-span-8 flex flex-col">
          <ChatInterface
            messages={messages}
            isLoading={isLoadingChat}
            onSendMessage={handleSendMessage}
            onClearChat={handleClearChat}
            currentTicker={currentTicker}
          />
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
              <span>Panduan Aturan IDX Pro:</span>
            </h4>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-slate-400">
              <li><strong className="text-emerald-400">Fase 1:</strong> Wave count & invalidation (W2 tidak &gt;100% W1, W3 bukan terpendek).</li>
              <li><strong className="text-cyan-400">Fase 2:</strong> Target Fibonacci (0.382, 0.5, 0.618, 0.786, Golden Ratio).</li>
              <li><strong className="text-amber-400">Fase 3:</strong> 6-layer Bandarmology & Price-Volume confirmation.</li>
              <li><strong className="text-purple-400">Fase 4:</strong> Entry Zone, Stop Loss terukur, Target 1 & 2.</li>
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
        currentTicker={currentTicker}
      />
    </div>
  );
}
