import { GoogleGenerativeAI } from '@google/generative-ai';
import { IDX_PRO_SYSTEM_INSTRUCTION } from './system-prompt';
import { StockQuoteData } from './yahoo-finance';
import { parseBroksumText, formatRupiahShort, formatDotNumber } from './broksum-parser';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export const SUPPORTED_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
];

export function getGeminiModel(modelName?: string) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY belum dikonfigurasi di Environment Variables (.env.local / Vercel).');
  }

  const selectedModel = modelName || process.env.GEMINI_MODEL || 'gemini-3.8-flash';
  const genAI = new GoogleGenerativeAI(apiKey);

  return genAI.getGenerativeModel({
    model: selectedModel,
    systemInstruction: IDX_PRO_SYSTEM_INSTRUCTION,
    generationConfig: {
      temperature: 0.2, // Low temperature for high analytical discipline and accuracy
      topP: 0.8,
      maxOutputTokens: 8192,
    },
  });
}

export function buildContextPrompt(
  userPrompt: string,
  stockData?: StockQuoteData | null,
  broksumText?: string | null,
  maxlongData?: any | null
): string {
  let context = '';

  if (maxlongData) {
    context += `\n--- DATA LIVE RESMI MAXLONG EOD / BANDARMOLOGY (TOKEN AUTO-REFRESH) ---\n`;
    context += `Data terverifikasi langsung dari server Maxlong:\n`;
    context += typeof maxlongData === 'string' ? maxlongData : JSON.stringify(maxlongData, null, 2);
    context += `\n--- AKHIR DATA RESMI MAXLONG ---\n\n`;
  }

  if (stockData) {
    context += `\n--- DATA PASAR NYATA DARI YAHOO FINANCE ---\n`;
    context += `Ticker: ${stockData.tickerClean} (${stockData.symbol})\n`;
    context += `Nama Emiten: ${stockData.name}\n`;
    context += `Tanggal Data Terakhir: ${stockData.latestDate}\n`;
    context += `Harga Terakhir: Rp ${formatDotNumber(stockData.price)} (${stockData.change >= 0 ? '+' : ''}${formatDotNumber(stockData.change)} / ${formatDotNumber(stockData.changePercent, 2)}%)\n`;
    context += `Rentang Hari Ini: Low ${formatDotNumber(stockData.low)} - High ${formatDotNumber(stockData.high)} (Open: ${formatDotNumber(stockData.open)}, Prev Close: ${formatDotNumber(stockData.previousClose)})\n`;
    context += `Volume: ${formatDotNumber(stockData.volume)} lot/lembar\n`;
    context += `52-Week Range: Low ${formatDotNumber(stockData.fiftyTwoWeekLow)} - High ${formatDotNumber(stockData.fiftyTwoWeekHigh)}\n`;
    
    if (stockData.ma20) context += `MA20: ${formatDotNumber(stockData.ma20)}\n`;
    if (stockData.ma50) context += `MA50: ${formatDotNumber(stockData.ma50)}\n`;
    if (stockData.ma200) context += `MA200: ${formatDotNumber(stockData.ma200)}\n`;
    if (stockData.rsi14) context += `RSI (14): ${formatDotNumber(stockData.rsi14, 1)}\n`;
    if (stockData.volumeRatio) context += `Volume Ratio (vs MA20 Volume): ${formatDotNumber(stockData.volumeRatio, 2)}x\n`;

    context += `\nHISTORI EOD OHLCV (90 Hari Terakhir):\n`;
    context += stockData.csvHistory;
    context += `\n--- AKHIR DATA PASAR ---\n\n`;
  }

  if (broksumText && broksumText.trim().length > 0) {
    const parsed = parseBroksumText(broksumText, stockData?.tickerClean || '');
    if (parsed.hasData) {
      context += `\n--- DATA BROKER SUMMARY & BANDARMOLOGY (OPENAPI FORMAT) ---\n`;
      context += `Status / Label Evaluasi: ${parsed.label} (Score: ${parsed.score > 0 ? '+' : ''}${parsed.score}/100, Confidence: ${parsed.confidence.toFixed(2)})\n`;
      context += `Bandar Value (Top 3): ${formatRupiahShort(parsed.bandarValue3)}\n`;
      context += `Bandar Value (Top 5): ${formatRupiahShort(parsed.bandarValue5)}\n`;
      context += `Konsentrasi Buyer: Top 1 = ${formatDotNumber(parsed.buyerConcentration.top1, 1)}%, Top 3 = ${formatDotNumber(parsed.buyerConcentration.top3, 1)}%, Top 5 = ${formatDotNumber(parsed.buyerConcentration.top5, 1)}%\n`;
      context += `Konsentrasi Seller: Top 1 = ${formatDotNumber(parsed.sellerConcentration.top1, 1)}%, Top 3 = ${formatDotNumber(parsed.sellerConcentration.top3, 1)}%, Top 5 = ${formatDotNumber(parsed.sellerConcentration.top5, 1)}%\n`;
      if (parsed.foreignFlow !== null) {
        context += `Net Foreign Flow: ${formatRupiahShort(parsed.foreignFlow)}\n`;
      }
      if (parsed.totalTradedValue !== null) {
        context += `Total Traded Value: ${formatRupiahShort(parsed.totalTradedValue)}\n`;
      }
      context += `\nTop Net Buyer:\n`;
      parsed.topBuyers.forEach((b, i) => {
        const meta = b.brokerName
          ? ` (${b.brokerName} | ${b.classificationLabel || b.category} - ${b.character || ''})`
          : ` [${b.category}]`;
        context += `${i + 1}. ${b.broker}${meta}: ${formatDotNumber(b.lot)} lot @ Avg ${formatDotNumber(b.avgPrice)} (Nilai: ${formatRupiahShort(b.value)})\n`;
      });
      context += `\nTop Net Seller:\n`;
      parsed.topSellers.forEach((s, i) => {
        const meta = s.brokerName
          ? ` (${s.brokerName} | ${s.classificationLabel || s.category} - ${s.character || ''})`
          : ` [${s.category}]`;
        context += `${i + 1}. ${s.broker}${meta}: ${formatDotNumber(s.lot)} lot @ Avg ${formatDotNumber(s.avgPrice)} (Nilai: ${formatRupiahShort(s.value)})\n`;
      });
      if (parsed.orderbook?.hasOrderbook) {
        context += `\n--- DATA ORDERBOOK & TAPE READING (MICROSTRUCTURE) ---\n`;
        if (parsed.orderbook.lastPrice) context += `Last Price: Rp ${formatDotNumber(parsed.orderbook.lastPrice)} (${parsed.orderbook.changePercent !== undefined ? `${parsed.orderbook.changePercent > 0 ? '+' : ''}${formatDotNumber(parsed.orderbook.changePercent, 2)}%` : ''})\n`;
        if (parsed.orderbook.open) context += `Open: ${formatDotNumber(parsed.orderbook.open)} | High: ${formatDotNumber(parsed.orderbook.high)} | Low: ${formatDotNumber(parsed.orderbook.low)} | Prev: ${formatDotNumber(parsed.orderbook.prev)}\n`;
        if (parsed.orderbook.totalBidLot && parsed.orderbook.totalOfferLot) {
          context += `Total Bid: ${formatDotNumber(parsed.orderbook.totalBidLot)} lot vs Total Offer: ${formatDotNumber(parsed.orderbook.totalOfferLot)} lot\n`;
          context += `Bid/Offer Ratio: ${formatDotNumber(parsed.orderbook.bidOfferRatio, 2)}x (Posture: ${parsed.orderbook.orderbookPosture})\n`;
        }
        if (parsed.orderbook.foreignBuy !== undefined && parsed.orderbook.foreignSell !== undefined) {
          context += `Foreign Buy: ${formatRupiahShort(parsed.orderbook.foreignBuy)} | Foreign Sell: ${formatRupiahShort(parsed.orderbook.foreignSell)} | Net Foreign Intraday: ${formatRupiahShort(parsed.orderbook.netForeignIntraday || 0)}\n`;
        }
        if (parsed.orderbook.tapeReadingSignal) {
          context += `Tape Reading Signal: ${parsed.orderbook.tapeReadingSignal}\n`;
        }
        context += `--- AKHIR DATA ORDERBOOK ---\n`;
      }
      if (parsed.reasons.length > 0) {
        context += `\nFakta Analitik Bandarmology & Tape Reading:\n`;
        parsed.reasons.forEach((r) => {
          context += `- ${r}\n`;
        });
      }
      context += `\nOpenAPI 3.1.0 Schemas (BroksumGenericResponse & BandarmologyGenericResponse):\n`;
      context += `Broksum JSON: ${JSON.stringify(parsed.openApiBroksum)}\n`;
      context += `Bandarmology JSON: ${JSON.stringify(parsed.openApiBandarmology)}\n`;
      context += `--- AKHIR DATA BROKER SUMMARY & BANDARMOLOGY ---\n\n`;
    } else {
      context += `\n--- DATA BROKER SUMMARY (INPUT DARI PENGGUNA) ---\n`;
      context += `${broksumText.trim()}\n`;
      context += `--- AKHIR DATA BROKER SUMMARY ---\n\n`;
    }
  } else if (stockData) {
    context += `\n[CATATAN DATA: Pengguna belum menempelkan tabel Broker Summary (Broksum) khusus. Lakukan analisa teknikal & Elliott Wave berdasarkan data harga/volume di atas, dan nyatakan bahwa broksum belum dilampirkan].\n\n`;
  }

  return `${context}Permintaan Pengguna: "${userPrompt}"`;
}

