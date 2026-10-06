'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Key,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Unlink,
  Radio,
  Lock,
} from 'lucide-react';

interface MaxlongConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MaxlongConnectModal({
  isOpen,
  onClose,
}: MaxlongConnectModalProps) {
  const [status, setStatus] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [accessKeyInput, setAccessKeyInput] = useState('');
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [activeTab, setActiveTab] = useState<'oauth' | 'direct'>('oauth');

  const fetchStatus = async () => {
    try {
      const res = await fetch('/api/auth/maxlong/status');
      const data = await res.json();
      if (data.ok) {
        setStatus(data.status);
      }
    } catch (e) {
      console.warn('Gagal memuat status auth Maxlong:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchStatus();
      setMessage(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleStartOAuth = () => {
    window.location.href = '/api/auth/maxlong/login';
  };

  const handleDirectAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessKeyInput.trim()) return;

    setIsLoading(true);
    setMessage(null);

    try {
      const res = await fetch('/api/auth/maxlong/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessKey: accessKeyInput.trim() }),
      });
      const data = await res.json();

      if (data.ok) {
        setMessage({ type: 'success', text: data.message || 'Berhasil terhubung ke Maxlong!' });
        setStatus(data.status);
        setAccessKeyInput('');
      } else {
        setMessage({ type: 'error', text: data.message || 'Otorisasi gagal.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal menghubungi server.' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Apakah Anda yakin ingin memutus koneksi token Maxlong?')) return;

    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/maxlong/status', { method: 'DELETE' });
      const data = await res.json();
      if (data.ok) {
        setStatus(data.status);
        setMessage({ type: 'success', text: 'Koneksi berhasil diputus.' });
      }
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-terminal-900 border border-terminal-750 w-full max-w-xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-terminal-800 bg-terminal-950/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-cyan-950/80 border border-cyan-800/60 text-cyan-400">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm flex items-center gap-2">
                Koneksi Maxlong EOD &amp; Token Auto-Refresh
                <span className="text-[10px] px-2 py-0.5 rounded font-mono font-semibold bg-indigo-950 text-indigo-300 border border-indigo-800/60">
                  OAuth 2.1
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Pembaruan arsitektur token otomatis untuk data Broksum, Bandarmology, dan Screener MaX.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-terminal-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Current Connection Status Box */}
          <div
            className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
              status?.connected
                ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-200'
                : 'bg-terminal-950/80 border-terminal-800 text-slate-300'
            }`}
          >
            {status?.connected ? (
              <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <Radio className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-100">
                  Status:{' '}
                  <span className={status?.connected ? 'text-emerald-400 font-semibold' : 'text-amber-400'}>
                    {status?.connected ? 'Terhubung (Online)' : 'Belum Terhubung'}
                  </span>
                </span>
                {status?.connected && (
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-900/60 text-emerald-300 border border-emerald-700/60">
                    {status.type === 'oauth' ? 'OAuth 2.1 Auto-Refresh' : 'Static API Key'}
                  </span>
                )}
              </div>

              {status?.connected ? (
                <>
                  <p className="text-[11px] text-slate-300">
                    Aplikasi memiliki token resmi dari <code>https://eod.maxlong.my.id/</code>.
                    {status.hasRefreshToken && (
                      <span className="text-cyan-300 block mt-0.5">
                        ✓ Fitur <strong>Background Auto-Renew</strong> aktif. Token akan diperbarui otomatis saat masa berlaku habis tanpa perlu login ulang.
                      </span>
                    )}
                  </p>
                  {status.expiresInSeconds != null && (
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      Masa berlaku token saat ini: ~{Math.floor(status.expiresInSeconds / 60)} menit lagi (otomatis ter-refresh).
                    </div>
                  )}
                </>
              ) : (
                <p className="text-[11px] text-slate-400">
                  Data live saat ini menggunakan Yahoo Finance. Hubungkan akun Maxlong Anda untuk membuka feed resmi Broksum, Bandarmology Factors, dan Screener MaX Kompas 100.
                </p>
              )}
            </div>
          </div>

          {/* Feedback Message */}
          {message && (
            <div
              className={`p-3 rounded-lg text-xs flex items-center gap-2 ${
                message.type === 'success'
                  ? 'bg-emerald-950/60 border border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/60 border border-rose-800 text-rose-300'
              }`}
            >
              {message.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              )}
              <span>{message.text}</span>
            </div>
          )}

          {/* Tabs for Connection Method (if not connected or want to reconnect) */}
          <div className="space-y-3 pt-1">
            <div className="flex border-b border-terminal-800 text-xs">
              <button
                type="button"
                onClick={() => setActiveTab('oauth')}
                className={`pb-2 px-3 font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'oauth'
                    ? 'border-cyan-500 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Metode 1: Login OAuth 2.1 Resmi (Web)
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('direct')}
                className={`pb-2 px-3 font-medium transition-colors border-b-2 -mb-px ${
                  activeTab === 'direct'
                    ? 'border-cyan-500 text-cyan-300'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Metode 2: Input Langsung Access Key
              </button>
            </div>

            {activeTab === 'oauth' ? (
              <div className="bg-terminal-950/60 p-4 rounded-xl border border-terminal-800 space-y-3">
                <div className="space-y-1 text-xs text-slate-300">
                  <h4 className="font-semibold text-slate-100 flex items-center gap-1.5">
                    <span>Otorisasi Standar OAuth 2.1 (PKCE S256)</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Anda akan diarahkan ke halaman persetujuan resmi <code>https://eod.maxlong.my.id/authorize</code> untuk memasukkan Access Key Anda sekali saja. Setelah diizinkan, server akan mengembalikan <code>access_token</code> dan <code>refresh_token</code> ke aplikasi lokal kita.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleStartOAuth}
                  disabled={isLoading}
                  className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-medium text-xs shadow-lg shadow-cyan-950/40 transition-all disabled:opacity-50"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka Halaman Otorisasi Maxlong</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handleDirectAuth} className="bg-terminal-950/60 p-4 rounded-xl border border-terminal-800 space-y-3">
                <div className="space-y-1 text-xs text-slate-300">
                  <h4 className="font-semibold text-slate-100 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Input Cepat IDX API Access Key</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Tempel access key yang Anda miliki di sini. Sistem backend lokal kami akan otomatis memproses persetujuan OAuth di background dan menerbitkan token dengan fitur auto-refresh.
                  </p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-mono text-slate-400">Access Key:</label>
                  <input
                    type="password"
                    value={accessKeyInput}
                    onChange={(e) => setAccessKeyInput(e.target.value)}
                    placeholder="Masukkan IDX Access Key Anda..."
                    className="w-full px-3 py-2 text-xs bg-terminal-900 border border-terminal-700 rounded-lg text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 font-mono"
                    required
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading || !accessKeyInput.trim()}
                  className="w-full flex items-center justify-center gap-2 py-2 px-4 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-medium text-xs shadow-md transition-colors disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Memverifikasi Token...</span>
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Verifikasi &amp; Dapatkan Token Otomatis</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-terminal-800 bg-terminal-950 flex items-center justify-between text-xs">
          <div className="text-[11px] text-slate-500 font-mono">
            {status?.connected ? 'Status: Terhubung' : 'Status: Offline'}
          </div>

          <div className="flex items-center gap-2">
            {status?.connected && (
              <button
                type="button"
                onClick={handleDisconnect}
                disabled={isLoading}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-rose-800/60 bg-rose-950/40 hover:bg-rose-900/40 text-rose-300 font-medium text-xs transition-colors"
              >
                <Unlink className="w-3 h-3 text-rose-400" />
                <span>Putus Koneksi</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-terminal-800 hover:bg-terminal-700 text-slate-300 font-medium text-xs transition-colors"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
