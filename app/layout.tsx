import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gemini IDX Pro — Terminal Analisa Saham BEI',
  description: 'Sistem Analisa Teknikal Saham Indonesia berbasis Elliott Wave, Fibonacci, dan Bandarmology bertenaga Google Gemini Pro.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className="dark">
      <body className="bg-terminal-950 text-slate-100 min-h-screen selection:bg-cyan-500/30 selection:text-cyan-200">
        {children}
      </body>
    </html>
  );
}
