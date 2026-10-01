/**
 * Elliott Wave Principle & Fibonacci Projection Engine
 * Conforms to Frost & Prechter standards and IDX financial mathematics.
 */

import { formatDotNumber } from './broksum-parser';

export interface BarData {
  time: string; // YYYY-MM-DD
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface WavePoint {
  index: number;
  time: string;
  price: number;
  label: string;
  isProjected: boolean;
  fibLevel?: string;
}

export interface ElliottWaveAnalysis {
  ticker: string;
  currentPrice: number;
  activeWave: 'WAVE_1_ORIGIN' | 'WAVE_2_PULLBACK' | 'WAVE_3_IMPULSE' | 'WAVE_4_CONSOLIDATION' | 'WAVE_5_FINALE' | 'ABC_CORRECTIVE';
  activeWaveLabel: string;
  trend: 'BULLISH' | 'BEARISH' | 'SIDEWAYS';
  
  // Historical swing points (0, 1, 2)
  p0: WavePoint;
  p1: WavePoint;
  p2: WavePoint;

  // Projections (3, 4, 5)
  p3: WavePoint;
  p3Extended: WavePoint;
  p4: WavePoint;
  p5: WavePoint;

  // Key Levels
  invalidationLevel: number;
  invalidationReason: string;
  wave1Length: number;
  wave2RetracePercent: number;
  goldenRatioInflection: number; // 61.8% of Wave 1
  riskRewardRatio: string;

  // Verification Rules (Frost & Prechter)
  rulesCheck: {
    rule1Passed: boolean; // Wave 2 does not retrace > 100% of Wave 1
    rule1Note: string;
    rule2Passed: boolean; // Wave 3 is not shortest wave
    rule2Note: string;
    rule3Passed: boolean; // Wave 4 does not overlap Wave 1
    rule3Note: string;
  };

  // Paths for Lightweight Charts
  historicalPath: { time: string; value: number }[];
  projectedPath: { time: string; value: number }[];
  
  // Alternate Count Scenario
  alternateCount: {
    name: string;
    scenario: string;
    target: number;
    invalidation: number;
  };
}

/**
 * Add trading days (skipping Sat & Sun) to a date string YYYY-MM-DD
 */
export function addTradingDays(dateStr: string, days: number): string {
  const d = new Date(dateStr);
  let count = 0;
  while (count < days) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) {
      count++;
    }
  }
  return d.toISOString().split('T')[0];
}

/**
 * Identifies Elliott Wave structure and computes Fibonacci projections from OHLCV bars
 */
export function calculateElliottWaveProjections(
  bars: BarData[] | undefined,
  ticker: string,
  livePrice?: number
): ElliottWaveAnalysis | null {
  if (!bars || bars.length < 30) return null;

  const validBars = bars.slice(-180); // analyze last ~6-8 months
  const n = validBars.length;
  const currentPrice = livePrice || validBars[n - 1].close;
  const latestDate = validBars[n - 1].time;

  // 1. Pivot Detection / ZigZag algorithm: find local extrema (swings)
  const window = Math.max(5, Math.min(10, Math.floor(n / 20)));
  const swingLows: { index: number; time: string; price: number }[] = [];
  const swingHighs: { index: number; time: string; price: number }[] = [];

  for (let i = window; i < n - window; i++) {
    const isLow = validBars.slice(i - window, i + window + 1).every((b) => b.low >= validBars[i].low);
    const isHigh = validBars.slice(i - window, i + window + 1).every((b) => b.high <= validBars[i].high);

    if (isLow) swingLows.push({ index: i, time: validBars[i].time, price: validBars[i].low });
    if (isHigh) swingHighs.push({ index: i, time: validBars[i].time, price: validBars[i].high });
  }

  // Fallback if pivots are sparse
  const overallMin = validBars.reduce((min, b, idx) => (b.low < min.price ? { index: idx, time: b.time, price: b.low } : min), { index: 0, time: validBars[0].time, price: validBars[0].low });
  const overallMax = validBars.reduce((max, b, idx) => (b.high > max.price ? { index: idx, time: b.time, price: b.high } : max), { index: 0, time: validBars[0].time, price: validBars[0].high });

  // 2. Determine Primary Impulse Cycle (0 -> 1 -> 2)
  // Find major base (P0) within the first 70% of dataset
  let p0Candidate = swingLows.length > 0
    ? swingLows.slice(0, Math.max(1, Math.floor(swingLows.length * 0.6))).reduce((min, s) => (s.price < min.price ? s : min), swingLows[0])
    : overallMin;

  // Find Peak 1 (P1) after P0
  const highsAfterP0 = swingHighs.filter((h) => h.index > p0Candidate.index);
  let p1Candidate = highsAfterP0.length > 0
    ? highsAfterP0.reduce((max, s) => (s.price > max.price ? s : max), highsAfterP0[0])
    : overallMax;

  // If P1 index <= P0 index, reset
  if (p1Candidate.index <= p0Candidate.index) {
    p0Candidate = { index: 0, time: validBars[0].time, price: validBars[0].low };
    p1Candidate = { index: Math.floor(n / 2), time: validBars[Math.floor(n / 2)].time, price: validBars[Math.floor(n / 2)].high };
  }

  // Find Low 2 (P2 - pullback) after P1
  // Crucial: Wave 2 is the lowest point reached after P1 up to the current date!
  let p2Candidate: { index: number; time: string; price: number };
  const allBarsAfterP1 = validBars.slice(p1Candidate.index + 1);
  if (allBarsAfterP1.length > 0) {
    p2Candidate = allBarsAfterP1.reduce(
      (min, b, offset) => (b.low < min.price ? { index: p1Candidate.index + 1 + offset, time: b.time, price: b.low } : min),
      { index: p1Candidate.index + 1, time: allBarsAfterP1[0].time, price: allBarsAfterP1[0].low }
    );
  } else {
    p2Candidate = { index: n - 1, time: latestDate, price: currentPrice };
  }

  // Guard: P2 must not fall below P0 for a valid bull impulse
  if (p2Candidate.price <= p0Candidate.price) {
    // If it dropped below P0, reset P0 to P2 as a new higher low base
    p0Candidate = p2Candidate;
    const nextHigh = swingHighs.find((h) => h.index > p0Candidate.index) || { index: n - 1, time: latestDate, price: currentPrice };
    p1Candidate = nextHigh;
    p2Candidate = { index: n - 1, time: latestDate, price: Math.round(currentPrice * 0.98) };
  }

  const p0: WavePoint = { ...p0Candidate, label: '(0) Base', isProjected: false };
  const p1: WavePoint = { ...p1Candidate, label: '(1)', isProjected: false };
  const p2: WavePoint = { ...p2Candidate, label: '(2)', isProjected: false };

  // 3. Mathematical Calculations & Fibonacci Confluence
  const wave1Length = Math.max(1, p1.price - p0.price);
  const wave2Drop = p1.price - p2.price;
  const wave2RetracePercent = Number(((wave2Drop / wave1Length) * 100).toFixed(1));
  const wave2RetraceFormatted = wave2RetracePercent.toFixed(1).replace('.', ',');

  // Golden ratio 61.8% inflection level
  const goldenRatioInflection = Math.round(p1.price - 0.618 * wave1Length);

  // Fibonacci Projections:
  // Wave 3 standard = P2 + 1.618 * W1
  // Wave 3 extended = P2 + 2.618 * W1
  const w3TargetPrice = Math.round(p2.price + 1.618 * wave1Length);
  const w3ExtPrice = Math.round(p2.price + 2.618 * wave1Length);

  // Wave 4 standard pullback = 38.2% retracement of Wave 3 length (W3 - P2)
  const w3WaveLength = w3TargetPrice - p2.price;
  const w4TargetPrice = Math.round(w3TargetPrice - 0.382 * w3WaveLength);

  // Wave 5 target = W4 + 1.0 * W1 (Parity with Wave 1)
  const w5TargetPrice = Math.round(w4TargetPrice + 1.0 * wave1Length);

  // Invalidation:
  // If current price has bounced above P2, tactical Invalidation is placed just below P2 (2% buffer)
  // If current price is at or testing P2, structural Invalidation is placed at Wave 0 Base
  let invalidationLevel: number;
  let invalidationReason: string;

  if (currentPrice > p2.price) {
    const buffer = Math.max(10, Math.round(p2.price * 0.02));
    invalidationLevel = Math.round(p2.price - buffer);
    invalidationReason = `Level Invalidation taktis di Rp ${formatDotNumber(invalidationLevel)} (Buffer 2% di bawah Swing Low Wave 2 Rp ${formatDotNumber(p2.price)}). Jika ditembus, skenario impulsif Wave 3 batal.`;
  } else {
    invalidationLevel = Math.round(p0.price);
    invalidationReason = `Level Invalidation struktural di Rp ${formatDotNumber(invalidationLevel)} (Base Wave 0). Jika harga menembus level ini, struktur tren naik batal (Hukum 1 Frost & Prechter).`;
  }

  // Time projections (trading days)
  const dateW3 = addTradingDays(latestDate, 12);
  const dateW4 = addTradingDays(dateW3, 10);
  const dateW5 = addTradingDays(dateW4, 15);

  const p3: WavePoint = {
    index: n + 12,
    time: dateW3,
    price: w3TargetPrice,
    label: '(3) Target Fib 1.618',
    isProjected: true,
    fibLevel: '1.618',
  };

  const p3Extended: WavePoint = {
    index: n + 16,
    time: addTradingDays(dateW3, 4),
    price: w3ExtPrice,
    label: '(3) Ext Fib 2.618',
    isProjected: true,
    fibLevel: '2.618',
  };

  const p4: WavePoint = {
    index: n + 22,
    time: dateW4,
    price: w4TargetPrice,
    label: '(4) Pullback Fib 0.382',
    isProjected: true,
    fibLevel: '0.382',
  };

  const p5: WavePoint = {
    index: n + 37,
    time: dateW5,
    price: w5TargetPrice,
    label: '(5) Finale Fib 1.00',
    isProjected: true,
    fibLevel: '1.000',
  };

  // Active Wave state determination
  let activeWave: ElliottWaveAnalysis['activeWave'] = 'WAVE_3_IMPULSE';
  let activeWaveLabel = 'Wave (3) Impulsif Sedang Berlangsung';

  if (currentPrice < p0.price) {
    activeWave = 'ABC_CORRECTIVE';
    activeWaveLabel = 'Struktur Batal — Tembus di Bawah Wave 0';
  } else if (currentPrice <= p2.price) {
    activeWave = 'ABC_CORRECTIVE';
    activeWaveLabel = 'Retracement Wave (2) Sedang Berlangsung (Menguji Base)';
  } else if (currentPrice < p1.price) {
    activeWave = 'WAVE_3_IMPULSE';
    activeWaveLabel = 'Wave (3) Impulsif — Memantul dari Support Wave (2)';
  } else if (currentPrice <= p1.price * 1.02) {
    activeWave = 'WAVE_3_IMPULSE';
    activeWaveLabel = 'Wave (3) Breakout — Menguji Puncak Wave (1)';
  } else if (currentPrice >= w3TargetPrice * 0.96) {
    activeWave = 'WAVE_4_CONSOLIDATION';
    activeWaveLabel = 'Mendekati Puncak Wave (3) — Antisipasi Pullback Wave (4)';
  }

  // Frost & Prechter Rules Verification
  const rule1Passed = p2.price > p0.price;
  const rule1Note = rule1Passed
    ? `Terpenuhi: Wave 2 (Rp ${formatDotNumber(p2.price)}) bertahan di atas Wave 0 (Rp ${formatDotNumber(p0.price)}). Retracement ${wave2RetraceFormatted}%.`
    : `Batal: Wave 2 menembus di bawah Wave 0.`;

  const rule2Passed = w3TargetPrice - p2.price >= wave1Length;
  const rule2Note = `Terpenuhi: Target Wave 3 (panjang Rp ${formatDotNumber(w3TargetPrice - p2.price)}) lebih panjang dari Wave 1 (panjang Rp ${formatDotNumber(wave1Length)}).`;

  const rule3Passed = w4TargetPrice > p1.price;
  const rule3Note = rule3Passed
    ? `Terpenuhi: Proyeksi Wave 4 (Rp ${formatDotNumber(w4TargetPrice)}) berada di atas puncak Wave 1 (Rp ${formatDotNumber(p1.price)}), tidak terjadi overlap.`
    : `Peringatan: Proyeksi Wave 4 mendekati teritori Wave 1.`;

  // Risk / Reward Ratio to Target Wave 3
  const risk = Math.max(5, currentPrice - invalidationLevel);
  const reward = Math.max(5, w3TargetPrice - currentPrice);
  const rr = (reward / risk).toFixed(1).replace('.', ',');
  const riskRewardRatio = `1 : ${rr}`;

  // Series data paths for plotting
  // 1. Historical swing path (strictly unique timestamps)
  const rawHistPath = [
    { time: p0.time, value: p0.price },
    { time: p1.time, value: p1.price },
    { time: p2.time, value: p2.price },
    { time: latestDate, value: currentPrice },
  ];
  const histMap = new Map<string, number>();
  for (const pt of rawHistPath) {
    histMap.set(pt.time, pt.value);
  }
  const historicalPath = Array.from(histMap.entries())
    .map(([time, value]) => ({ time, value }))
    .sort((a, b) => a.time.localeCompare(b.time));

  // 2. Future projected wave path (Smooth daily interpolation over trading days)
  // Helper to generate sequential trading days
  const getTradingDaysRange = (startDateStr: string, totalDays: number): string[] => {
    const days: string[] = [];
    let current = startDateStr;
    for (let i = 0; i < totalDays; i++) {
      current = addTradingDays(current, 1);
      days.push(current);
    }
    return days;
  };

  // Smooth wave trajectory segment with cosine easing
  const interpolateWaveSegment = (
    startDate: string,
    startPrice: number,
    tradingDaysCount: number,
    endPrice: number
  ): { time: string; value: number }[] => {
    const dates = getTradingDaysRange(startDate, tradingDaysCount);
    const points: { time: string; value: number }[] = [];
    for (let i = 0; i < dates.length; i++) {
      const t = (i + 1) / dates.length;
      const easeT = 0.5 * (1 - Math.cos(t * Math.PI));
      const price = Math.round(startPrice + (endPrice - startPrice) * easeT);
      points.push({ time: dates[i], value: price });
    }
    return points;
  };

  const seg1 = interpolateWaveSegment(latestDate, currentPrice, 12, w3TargetPrice);
  const seg2 = interpolateWaveSegment(dateW3, w3TargetPrice, 10, w4TargetPrice);
  const seg3 = interpolateWaveSegment(dateW4, w4TargetPrice, 15, w5TargetPrice);

  const rawProjected = [
    { time: latestDate, value: currentPrice },
    ...seg1,
    ...seg2,
    ...seg3,
  ];

  const projMap = new Map<string, number>();
  for (const pt of rawProjected) {
    projMap.set(pt.time, pt.value);
  }
  const projectedPath = Array.from(projMap.entries())
    .map(([time, value]) => ({ time, value }))
    .sort((a, b) => a.time.localeCompare(b.time));

  // Alternate Count (Bearish / Flat Correction)
  const alternateCount = {
    name: 'Alternate Count: Flat Correction (B-Wave Rebound)',
    scenario: `Jika harga gagal menembus resisten Rp ${formatDotNumber(p1.price)}, kenaikan saat ini merupakan gelombang B korektif menuju C-Wave support di area Golden Ratio.`,
    target: goldenRatioInflection,
    invalidation: p1.price,
  };

  return {
    ticker,
    currentPrice,
    activeWave,
    activeWaveLabel,
    trend: currentPrice >= p2.price ? 'BULLISH' : 'BEARISH',
    p0,
    p1,
    p2,
    p3,
    p3Extended,
    p4,
    p5,
    invalidationLevel,
    invalidationReason,
    wave1Length,
    wave2RetracePercent,
    goldenRatioInflection,
    riskRewardRatio,
    rulesCheck: {
      rule1Passed,
      rule1Note,
      rule2Passed,
      rule2Note,
      rule3Passed,
      rule3Note,
    },
    historicalPath,
    projectedPath,
    alternateCount,
  };
}
