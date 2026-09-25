import { GoogleGenerativeAI } from '@google/generative-ai';
import { IDX_PRO_SYSTEM_INSTRUCTION } from './system-prompt';
import { StockQuoteData } from './yahoo-finance';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export function getGeminiModel() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di Environment Variables (.env.local / Vercel).');
  }

  const modelName = process.env.GEMINI_MODEL || 'gemini-1.5-pro';
  const genAI = new GoogleGenerativeAI(apiKey);

  return genAI.getGenerativeModel({
    model: modelName,
    systemInstruction: IDX_PRO_SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.2, // Low temperature for high analytical discipline and accuracy
      topP: 0.8,
      maxOutputTokens: 4096,
    },
  });
}

export function buildContextPrompt(
  userPrompt: string,
  stockData?: StockQuoteData | null,
  broksumText?: string | null
): string {
  let context = '';

  if (stockData) {
    context += `\n--- DATA PASAR NYATA DARI YAHOO FINANCE ---\n`;
    context += `Ticker: ${stockData.tickerClean} (${stockData.symbol})\n`;
    context += `Nama Emiten: ${stockData.name}\n`;
    context += `Tanggal Data Terakhir: ${stockData.latestDate}\n`;
    context += `Harga Terakhir: Rp ${stockData.price.toLocaleString('id-ID')} (${stockData.change >= 0 ? '+' : ''}${stockData.change} / ${stockData.changePercent.toFixed(2)}%)\n`;
    context += `Rentang Hari Ini: Low ${stockData.low.toLocaleString('id-ID')} - High ${stockData.high.toLocaleString('id-ID')} (Open: ${stockData.open.toLocaleString('id-ID')}, Prev Close: ${stockData.previousClose.toLocaleString('id-ID')})\n`;
    context += `Volume: ${stockData.volume.toLocaleString('id-ID')} lot/lembar\n`;
    context += `52-Week Range: Low ${stockData.fiftyTwoWeekLow.toLocaleString('id-ID')} - High ${stockData.fiftyTwoWeekHigh.toLocaleString('id-ID')}\n`;
    
    if (stockData.ma20) context += `MA20: ${stockData.ma20.toLocaleString('id-ID')}\n`;
    if (stockData.ma50) context += `MA50: ${stockData.ma50.toLocaleString('id-ID')}\n`;
    if (stockData.ma200) context += `MA200: ${stockData.ma200.toLocaleString('id-ID')}\n`;
    if (stockData.rsi14) context += `RSI (14): ${stockData.rsi14}\n`;
    if (stockData.volumeRatio) context += `Volume Ratio (vs MA20 Volume): ${stockData.volumeRatio}x\n`;

    context += `\nHISTORI EOD OHLCV (90 Hari Terakhir):\n`;
    context += stockData.csvHistory;
    context += `\n--- AKHIR DATA PASAR ---\n\n`;
  }

  if (broksumText && broksumText.trim().length > 0) {
    context += `\n--- DATA BROKER SUMMARY (INPUT DARI PENGGUNA) ---\n`;
    context += `${broksumText.trim()}\n`;
    context += `--- AKHIR DATA BROKER SUMMARY ---\n\n`;
  } else if (stockData) {
    context += `\n[CATATAN DATA: Pengguna belum menempelkan tabel Broker Summary (Broksum) khusus. Lakukan analisa teknikal & Elliott Wave berdasarkan data harga/volume di atas, dan nyatakan bahwa broksum belum dilampirkan].\n\n`;
  }

  return `${context}Permintaan Pengguna: "${userPrompt}"`;
}
