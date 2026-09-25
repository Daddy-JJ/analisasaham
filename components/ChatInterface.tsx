'use client';

import React, { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Send, Bot, User, Sparkles, RefreshCw, Layers, TrendingUp, Cpu, ShieldAlert } from 'lucide-react';

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

interface ChatInterfaceProps {
  messages: Message[];
  isLoading: boolean;
  onSendMessage: (text: string) => void;
  onClearChat: () => void;
  currentTicker: string;
}

export default function ChatInterface({
  messages,
  isLoading,
  onSendMessage,
  onClearChat,
  currentTicker,
}: ChatInterfaceProps) {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      onSendMessage(input.trim());
      setInput('');
    }
  };

  // Helper to extract follow-up action suggestions from markdown
  const lastMessage = messages[messages.length - 1];
  const showQuickActions = lastMessage && lastMessage.role === 'assistant' && !isLoading;

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] bg-terminal-950 border border-terminal-800 rounded-xl overflow-hidden shadow-2xl">
      {/* Chat Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-terminal-800 bg-terminal-900/60">
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4 text-cyan-400" />
          <span className="text-xs font-mono font-medium text-slate-200">
            Analisa Aktif: <span className="text-cyan-400 font-bold">{currentTicker}</span>
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
        </div>
        {messages.length > 0 && (
          <button
            onClick={onClearChat}
            disabled={isLoading}
            className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RefreshCw className="w-3 h-3" /> Bersihkan Chat
          </button>
        )}
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4 max-w-md mx-auto">
            <div className="w-12 h-12 rounded-xl bg-cyan-950/60 border border-cyan-800/80 flex items-center justify-center text-cyan-400 shadow-lg shadow-cyan-950/40">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">Selamat Datang di Gemini IDX Pro</h3>
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                Asisten Analisa Saham Indonesia berbasis disiplin <span className="text-cyan-400">Elliott Wave</span>, <span className="text-amber-400">Fibonacci Confluence</span>, dan <span className="text-purple-400">Bandarmology</span>.
              </p>
            </div>

            <div className="w-full space-y-2 pt-2">
              <p className="text-[11px] text-slate-500 font-mono">Pilih perintah awal:</p>
              <div className="grid grid-cols-1 gap-1.5 text-xs text-left">
                <button
                  onClick={() => onSendMessage(`${currentTicker} fase 1 step auto mendalam konservatif`)}
                  className="p-2.5 rounded-lg bg-terminal-900 hover:bg-terminal-850 border border-terminal-800 hover:border-cyan-500/40 text-slate-200 transition-colors flex items-center gap-2"
                >
                  <Layers className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Mulai <span className="font-semibold text-emerald-400">Fase 1:</span> Elliott Wave {currentTicker}</span>
                </button>
                <button
                  onClick={() => onSendMessage(`${currentTicker} fase 4 complete trading plan entry sl tp`)}
                  className="p-2.5 rounded-lg bg-terminal-900 hover:bg-terminal-850 border border-terminal-800 hover:border-purple-500/40 text-slate-200 transition-colors flex items-center gap-2"
                >
                  <ShieldAlert className="w-4 h-4 text-purple-400 shrink-0" />
                  <span>Buat <span className="font-semibold text-purple-400">Trading Plan</span> {currentTicker} (Entry & SL)</span>
                </button>
                <button
                  onClick={() => onSendMessage(`IHSG fase 1 wave count analisa arah market`)}
                  className="p-2.5 rounded-lg bg-terminal-900 hover:bg-terminal-850 border border-terminal-800 hover:border-cyan-500/40 text-slate-200 transition-colors flex items-center gap-2"
                >
                  <TrendingUp className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Analisa <span className="font-semibold text-cyan-400">IHSG</span> (Market Regime)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              {message.role === 'assistant' && (
                <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center shrink-0 mt-0.5 text-cyan-400">
                  <Bot className="w-4 h-4" />
                </div>
              )}

              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-sm shadow-md ${
                  message.role === 'user'
                    ? 'bg-cyan-700 text-white font-medium rounded-tr-none'
                    : 'bg-terminal-900/90 border border-terminal-800 text-slate-200 rounded-tl-none prose-dark'
                }`}
              >
                {message.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{message.content}</p>
                ) : (
                  <div className="overflow-x-auto">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {message.content}
                    </ReactMarkdown>
                  </div>
                )}
              </div>

              {message.role === 'user' && (
                <div className="w-7 h-7 rounded-lg bg-terminal-800 border border-terminal-700 flex items-center justify-center shrink-0 mt-0.5 text-slate-300">
                  <User className="w-4 h-4" />
                </div>
              )}
            </div>
          ))
        )}

        {/* Loading Indicator */}
        {isLoading && (
          <div className="flex gap-3 items-start animate-pulse">
            <div className="w-7 h-7 rounded-lg bg-cyan-950 border border-cyan-800/80 flex items-center justify-center text-cyan-400">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-terminal-900/90 border border-terminal-800 rounded-xl px-4 py-3 text-xs font-mono text-cyan-400 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></div>
              <span>Gemini sedang membedah struktur data {currentTicker}...</span>
            </div>
          </div>
        )}

        {/* Follow-up Quick Action Pills */}
        {showQuickActions && (
          <div className="pt-2 flex flex-wrap items-center gap-1.5">
            <span className="text-[10px] text-slate-500 font-mono">Langkah Lanjutan:</span>
            <button
              onClick={() => onSendMessage(`Lanjut fase 2 untuk ${currentTicker} fibonacci targets`)}
              className="px-2.5 py-1 text-xs rounded-full bg-cyan-950/60 border border-cyan-800/60 hover:bg-cyan-900/60 text-cyan-300 transition-colors"
            >
              Lanjut Fase 2 (Fibonacci)
            </button>
            <button
              onClick={() => onSendMessage(`Lanjut fase 3 untuk ${currentTicker} bandarmology dan volume`)}
              className="px-2.5 py-1 text-xs rounded-full bg-amber-950/60 border border-amber-800/60 hover:bg-amber-900/60 text-amber-300 transition-colors"
            >
              Lanjut Fase 3 (Bandarmology)
            </button>
            <button
              onClick={() => onSendMessage(`Lanjut fase 4 untuk ${currentTicker} complete trading plan`)}
              className="px-2.5 py-1 text-xs rounded-full bg-purple-950/60 border border-purple-800/60 hover:bg-purple-900/60 text-purple-300 transition-colors"
            >
              Lanjut Fase 4 (Trading Plan)
            </button>
            <button
              onClick={() => onSendMessage(`Bandingkan pergerakan ${currentTicker} terhadap IHSG`)}
              className="px-2.5 py-1 text-xs rounded-full bg-terminal-900 border border-terminal-700 hover:bg-terminal-800 text-slate-300 transition-colors"
            >
              Korelasi vs IHSG
            </button>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Bar */}
      <div className="p-3 border-t border-terminal-800 bg-terminal-900/80">
        <form onSubmit={handleSubmit} className="flex items-center gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Tanyakan analisa saham ${currentTicker} (contoh: "Fase 1 wave count", "Hitung SL & TP", atau pertanyaan bebas)...`}
            disabled={isLoading}
            className="flex-1 bg-terminal-950 border border-terminal-700 rounded-lg px-3.5 py-2 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isLoading || !input.trim()}
            className="p-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-50 transition-colors shadow-md shadow-cyan-950/40"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
        <div className="flex items-center justify-between mt-2 px-1 text-[10px] text-slate-500">
          <span>Tekan Enter untuk mengirim</span>
          <span className="font-mono">Google Gemini Pro + Yahoo Finance Live</span>
        </div>
      </div>
    </div>
  );
}
