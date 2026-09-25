import { KOMPAS_100_UNIVERSE, Kompas100Stock } from './kompas100';

export interface ScreenerItem {
  ticker: string;
  name: string;
  sector: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  rvol: number; // Relative Volume vs 20-day average
  rsi14: number;
  ma20: number;
  ma50: number;
  trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS';
  signal: 'BETA BREAKOUT' | 'SMART SNIPER' | 'PULLBACK' | 'G ACC' | 'FILTERED';
  grade: 'A+ ELITE' | 'A HIGH QUALITY' | 'B WATCHLIST' | 'FILTERED';
  score: number;
  buyGrid: {
    buy1: number;
    buy2: number;
    stopLoss: number;
    target1: number;
    target2: number;
    rewardRisk: string;
  };
}

export interface ScreenerResult {
  scanDate: string;
  totalScreened: number;
  totalSignals: number;
  signals: ScreenerItem[];
  allResults: ScreenerItem[];
  isCached: boolean;
  cachedAt: string;
}

// In-Memory Daily Cache
let cachedScreener: {
  date: string;
  result: ScreenerResult;
  timestamp: number;
} | null = null;

// User agents to rotate gently
const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0',
];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchTickerBars(ticker: string, userAgent: string) {
  const symbol = encodeURIComponent(`${ticker}.JK`);
  // Use range=3mo (~65 bars) to satisfy MA50 and MA20 calculation
  const url = `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=3mo`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': userAgent,
      'Accept': 'application/json',
      'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
    },
    next: { revalidate: 3600 },
  });

  if (!res.ok) return null;
  const json = await res.json();
  const result = json?.chart?.result?.[0];
  if (!result || !result.timestamp || result.timestamp.length < 20) return null;

  const quote = result.indicators?.quote?.[0] || {};
  const opens = quote.open || [];
  const highs = quote.high || [];
  const lows = quote.low || [];
  const closes = quote.close || [];
  const volumes = quote.volume || [];
  const timestamps = result.timestamp || [];

  const validCloses: number[] = [];
  const validOpens: number[] = [];
  const validHighs: number[] = [];
  const validLows: number[] = [];
  const validVolumes: number[] = [];

  for (let i = 0; i < timestamps.length; i++) {
    if (closes[i] != null && opens[i] != null && highs[i] != null && lows[i] != null) {
      validCloses.push(Number(closes[i].toFixed(2)));
      validOpens.push(Number(opens[i].toFixed(2)));
      validHighs.push(Number(highs[i].toFixed(2)));
      validLows.push(Number(lows[i].toFixed(2)));
      validVolumes.push(volumes[i] ?? 0);
    }
  }

  if (validCloses.length < 20) return null;

  return { closes: validCloses, opens: validOpens, highs: validHighs, lows: validLows, volumes: validVolumes, meta: result.meta };
}

function calculateSMA(data: number[], window: number): number {
  const slice = data.slice(-window);
  return Number((slice.reduce((a, b) => a + b, 0) / slice.length).toFixed(2));
}

function calculateRSI(closes: number[], period = 14): number {
  if (closes.length < period + 1) return 50;
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
  return Number((100 - 100 / (1 + rs)).toFixed(1));
}

export async function runKompas100Screener(forceRefresh = false): Promise<ScreenerResult> {
  const todayStr = new Date().toISOString().split('T')[0];

  // Return cached result if already scanned today and not force refreshed
  if (!forceRefresh && cachedScreener && cachedScreener.date === todayStr) {
    return {
      ...cachedScreener.result,
      isCached: true,
    };
  }

  const screenedItems: ScreenerItem[] = [];
  const BATCH_SIZE = 6; // Process 6 stocks at a time to remain polite
  const BATCH_DELAY = 120; // 120ms delay between batches

  for (let i = 0; i < KOMPAS_100_UNIVERSE.length; i += BATCH_SIZE) {
    const batch = KOMPAS_100_UNIVERSE.slice(i, i + BATCH_SIZE);
    const ua = USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];

    const promises = batch.map(async (stock) => {
      try {
        const bars = await fetchTickerBars(stock.ticker, ua);
        if (!bars) return null;

        const { closes, opens, highs, lows, volumes, meta } = bars;
        const len = closes.length;
        const currentPrice = Number(closes[len - 1].toFixed(2));
        const prevClose = Number(closes[len - 2].toFixed(2));
        const currentOpen = Number(opens[opens.length - 1].toFixed(2));
        const change = Number((currentPrice - prevClose).toFixed(2));
        const changePercent = Number(((change / prevClose) * 100).toFixed(2));

        const ma20 = calculateSMA(closes, 20);
        const ma50 = closes.length >= 50 ? calculateSMA(closes, 50) : ma20;
        const rsi14 = calculateRSI(closes, 14);

        // Relative Volume (RVOL)
        const recentVolumes = volumes.slice(-20);
        const avgVol20 = recentVolumes.reduce((a: number, b: number) => a + b, 0) / recentVolumes.length;
        const currentVol = volumes[volumes.length - 1] || 0;
        const rvol = avgVol20 > 0 ? Number((currentVol / avgVol20).toFixed(2)) : 1.0;

        // High/Low of last 20 days
        const high20 = Math.max(...highs.slice(-20));
        const low20 = Math.min(...lows.slice(-20));

        // Evaluate Trend
        let trend: 'UPTREND' | 'DOWNTREND' | 'SIDEWAYS' = 'SIDEWAYS';
        if (currentPrice > ma20 && currentPrice > ma50) trend = 'UPTREND';
        else if (currentPrice < ma20 && currentPrice < ma50) trend = 'DOWNTREND';

        // MaX V7.30 Signal Engine Evaluation
        let signal: ScreenerItem['signal'] = 'FILTERED';
        let grade: ScreenerItem['grade'] = 'FILTERED';
        let score = 50;

        // 1. BETA BREAKOUT: Price breaking 20d High with Volume Spike & Momentum
        if (
          currentPrice >= ma20 &&
          currentPrice >= high20 * 0.985 &&
          rvol >= 1.25 &&
          rsi14 >= 52 &&
          changePercent > 0
        ) {
          signal = 'BETA BREAKOUT';
          grade = rvol >= 1.8 && rsi14 <= 70 ? 'A+ ELITE' : 'A HIGH QUALITY';
          score = Math.min(95, Math.round(75 + rvol * 8 + (rsi14 > 60 ? 5 : 0)));
        }
        // 2. SMART SNIPER / V-SHAPE: Reversal from dip/oversold with green candle & volume
        else if (
          rsi14 >= 38 &&
          rsi14 <= 55 &&
          currentPrice > currentOpen &&
          changePercent > 0.5 &&
          rvol >= 1.15 &&
          currentPrice >= low20 * 1.02
        ) {
          signal = 'SMART SNIPER';
          grade = 'A HIGH QUALITY';
          score = Math.min(90, Math.round(72 + rvol * 7 + (currentPrice > ma20 ? 6 : 0)));
        }
        // 3. PULLBACK / SWEET SPOT: Uptrend resting near MA20
        else if (
          trend === 'UPTREND' &&
          Math.abs(currentPrice - ma20) / ma20 <= 0.025 &&
          rsi14 >= 46 &&
          rsi14 <= 58
        ) {
          signal = 'PULLBACK';
          grade = 'B WATCHLIST';
          score = 80;
        }
        // 4. G ACC: Strong continuous momentum
        else if (
          trend === 'UPTREND' &&
          rsi14 >= 58 &&
          rsi14 <= 72 &&
          changePercent > 0 &&
          rvol >= 1.1
        ) {
          signal = 'G ACC';
          grade = 'B WATCHLIST';
          score = 78;
        }

        // Calculate Buy Grid and Risk/Reward
        const buy1 = currentPrice;
        const buy2 = Math.round(ma20 > currentPrice ? currentPrice * 0.98 : ma20);
        const stopLoss = Math.round(Math.min(low20, buy2 * 0.96));
        const target1 = Math.round(currentPrice * 1.07);
        const target2 = Math.round(currentPrice * 1.14);

        const risk = currentPrice - stopLoss;
        const reward = target1 - currentPrice;
        const rrRatio = risk > 0 ? (reward / risk).toFixed(1) : '2.0';

        const item: ScreenerItem = {
          ticker: stock.ticker,
          name: stock.name,
          sector: stock.sector,
          price: currentPrice,
          change,
          changePercent,
          volume: currentVol,
          rvol,
          rsi14,
          ma20,
          ma50,
          trend,
          signal,
          grade,
          score,
          buyGrid: {
            buy1,
            buy2,
            stopLoss,
            target1,
            target2,
            rewardRisk: `1:${rrRatio}`,
          },
        };

        return item;
      } catch (err) {
        return null;
      }
    });

    const results = await Promise.allSettled(promises);
    for (const r of results) {
      if (r.status === 'fulfilled' && r.value) {
        screenedItems.push(r.value);
      }
    }

    // Polite delay between batches
    if (i + BATCH_SIZE < KOMPAS_100_UNIVERSE.length) {
      await sleep(BATCH_DELAY);
    }
  }

  // Filter only active signals (not FILTERED) and sort by score descending
  const activeSignals = screenedItems
    .filter((s) => s.signal !== 'FILTERED')
    .sort((a, b) => b.score - a.score);

  const finalResult: ScreenerResult = {
    scanDate: todayStr,
    totalScreened: screenedItems.length,
    totalSignals: activeSignals.length,
    signals: activeSignals,
    allResults: screenedItems,
    isCached: false,
    cachedAt: new Date().toLocaleTimeString('id-ID'),
  };

  // Cache in memory for subsequent requests today
  cachedScreener = {
    date: todayStr,
    result: finalResult,
    timestamp: Date.now(),
  };

  return finalResult;
}
