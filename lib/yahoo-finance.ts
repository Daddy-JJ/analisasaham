export interface StockQuoteData {
  symbol: string;
  tickerClean: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  open: number;
  high: number;
  low: number;
  previousClose: number;
  fiftyTwoWeekHigh: number;
  fiftyTwoWeekLow: number;
  ma20?: number;
  ma50?: number;
  ma200?: number;
  rsi14?: number;
  volumeRatio?: number;
  csvHistory: string;
  latestDate: string;
}

export function normalizeTicker(tickerInput: string): string {
  const clean = tickerInput.trim().toUpperCase();
  if (clean === 'IHSG' || clean === '^JKSE' || clean === 'COMPOSITE') {
    return '^JKSE';
  }
  if (clean.endsWith('.JK') || clean.startsWith('^')) {
    return clean;
  }
  return `${clean}.JK`;
}

export function cleanDisplayTicker(symbol: string): string {
  if (symbol === '^JKSE') return 'IHSG';
  return symbol.replace('.JK', '');
}

function calculateSMA(data: number[], window: number): number | undefined {
  if (data.length < window) return undefined;
  const slice = data.slice(-window);
  const sum = slice.reduce((acc, val) => acc + val, 0);
  return Number((sum / window).toFixed(2));
}

function calculateRSI(closes: number[], period = 14): number | undefined {
  if (closes.length < period + 1) return undefined;
  
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) gains += diff;
    else losses += Math.abs(diff);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  for (let i = period + 1; i < closes.length; i++) {
    const diff = closes[i] - closes[i - 1];
    if (diff >= 0) {
      avgGain = (avgGain * (period - 1) + diff) / period;
      avgLoss = (avgLoss * (period - 1)) / period;
    } else {
      avgGain = (avgGain * (period - 1)) / period;
      avgLoss = (avgLoss * (period - 1) + Math.abs(diff)) / period;
    }
  }

  if (avgLoss === 0) return 100;
  const rs = avgGain / avgLoss;
  return Number((100 - (100 / (1 + rs))).toFixed(2));
}

export async function fetchStockData(tickerInput: string): Promise<StockQuoteData> {
  const symbol = normalizeTicker(tickerInput);
  const tickerClean = cleanDisplayTicker(symbol);

  // Directly query Yahoo Finance v8 chart API - reliable, no crumb issues, no auth required
  const encodedSymbol = encodeURIComponent(symbol);
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${encodedSymbol}?interval=1d&range=6mo`;

  const response = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'application/json',
    },
    next: { revalidate: 300 }, // Cache 5 minutes in Next.js
  });

  if (!response.ok) {
    throw new Error(`Gagal mengambil data ${tickerClean} dari Yahoo Finance (Status: ${response.status})`);
  }

  const data = await response.json();
  const result = data?.chart?.result?.[0];

  if (!result || !result.timestamp || result.timestamp.length === 0) {
    throw new Error(`Data histori untuk saham ${tickerClean} (${symbol}) tidak ditemukan.`);
  }

  const meta = result.meta;
  const timestamps = result.timestamp as number[];
  const quote = result.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];

  // Filter out any null bars (market holidays / empty ticks)
  const validBars: { date: string; open: number; high: number; low: number; close: number; volume: number }[] = [];
  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null && opens[i] != null && highs[i] != null && lows[i] != null) {
      const d = new Date(timestamps[i] * 1000).toISOString().split('T')[0];
      validBars.push({
        date: d,
        open: Number(opens[i].toFixed(2)),
        high: Number(highs[i].toFixed(2)),
        low: Number(lows[i].toFixed(2)),
        close: Number(closes[i].toFixed(2)),
        volume: volumes[i] ?? 0,
      });
    }
  }

  if (validBars.length === 0) {
    throw new Error(`Data bar historis kosong untuk ${tickerClean}.`);
  }

  const validCloses = validBars.map(b => b.close);
  const validVolumes = validBars.map(b => b.volume);

  const ma20 = calculateSMA(validCloses, 20);
  const ma50 = calculateSMA(validCloses, 50);
  const ma200 = calculateSMA(validCloses, 200);
  const rsi14 = calculateRSI(validCloses, 14);

  let volumeRatio: number | undefined;
  if (validVolumes.length >= 20) {
    const lastVol = validVolumes[validVolumes.length - 1];
    const avgVol20 = validVolumes.slice(-20).reduce((a, b) => a + b, 0) / 20;
    if (avgVol20 > 0) {
      volumeRatio = Number((lastVol / avgVol20).toFixed(2));
    }
  }

  // Format CSV for last 90 trading days
  const csvRows = ['Date,Open,High,Low,Close,Volume'];
  for (const bar of validBars.slice(-90)) {
    csvRows.push(`${bar.date},${bar.open},${bar.high},${bar.low},${bar.close},${bar.volume}`);
  }
  const csvHistory = csvRows.join('\n');

  const latestBar = validBars[validBars.length - 1];
  const prevBar = validBars.length > 1 ? validBars[validBars.length - 2] : latestBar;

  const currentPrice = meta.regularMarketPrice ?? latestBar.close;
  const prevClose = meta.chartPreviousClose ?? prevBar.close;
  const change = currentPrice - prevClose;
  const changePercent = prevClose ? (change / prevClose) * 100 : 0;

  return {
    symbol,
    tickerClean,
    name: meta.longName || meta.shortName || tickerClean,
    price: Number(currentPrice.toFixed(2)),
    change: Number(change.toFixed(2)),
    changePercent: Number(changePercent.toFixed(2)),
    volume: meta.regularMarketVolume ?? latestBar.volume,
    open: meta.regularMarketDayHigh ? (latestBar.open || currentPrice) : latestBar.open,
    high: meta.regularMarketDayHigh ?? latestBar.high ?? currentPrice,
    low: meta.regularMarketDayLow ?? latestBar.low ?? currentPrice,
    previousClose: Number(prevClose.toFixed(2)),
    fiftyTwoWeekHigh: meta.fiftyTwoWeekHigh ?? Math.max(...validCloses),
    fiftyTwoWeekLow: meta.fiftyTwoWeekLow ?? Math.min(...validCloses),
    ma20,
    ma50,
    ma200,
    rsi14,
    volumeRatio,
    csvHistory,
    latestDate: latestBar.date,
  };
}
