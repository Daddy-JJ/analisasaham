/**
 * Client and normalizer for Public IDX Terminal API (https://idx.maxlong.my.id)
 * Provides automatic, zero-auth access to live EOD Broker Summary, Bandarmology Factors, and Volume Analysis.
 */

import { KOMPAS_100_UNIVERSE } from './kompas100';
import type { ScreenerItem, ScreenerResult } from './screener-engine';

export interface IdxBrokerRecord {
  code: string;
  name: string;
  avgPrice: number;
  value: number;
  volumeLot: number;
  netValue: number;
  netLot: number;
  isForeign: boolean;
  status?: string;
}

export interface IdxMultidayParticipant {
  code: string;
  name: string;
  net: number;
  days: number;
}

export interface IdxBandarmologyData {
  ticker: string;
  date: string;
  bandarSide: 'ACCUMULATION' | 'DISTRIBUTION' | 'NEUTRAL';
  bandarValue: number;
  brokerConcentrationPct: number;
  foreignBuyValue: number;
  foreignSellValue: number;
  netForeignValue: number;
  foreignStreakSide: string;
  foreignStreakLength: number;
  topBuyers: IdxBrokerRecord[];
  topSellers: IdxBrokerRecord[];
  volume: {
    latest: number;
    avg20d: number;
    ratio: number;
    signal: 'VOLUME_SURGE' | 'NORMAL' | 'DRY' | 'LOW' | string;
  };
  multiday?: {
    days: number;
    accumulators: IdxMultidayParticipant[];
    distributors: IdxMultidayParticipant[];
  };
}

const IDX_TERMINAL_BASE = process.env.IDX_TERMINAL_BASE_URL || 'https://idx.maxlong.my.id';

/**
 * Format currency number to compact IDR string (e.g. Rp +113,5 Miliar)
 */
export function formatIdrCompact(val: number): string {
  if (val === 0 || isNaN(val)) return 'Rp 0';
  const abs = Math.abs(val);
  const sign = val > 0 ? '+' : '-';
  if (abs >= 1e12) {
    return `${sign}Rp ${(abs / 1e12).toFixed(2).replace('.', ',')} Triliun`;
  }
  if (abs >= 1e9) {
    return `${sign}Rp ${(abs / 1e9).toFixed(1).replace('.', ',')} Miliar`;
  }
  if (abs >= 1e6) {
    return `${sign}Rp ${(abs / 1e6).toFixed(1).replace('.', ',')} Juta`;
  }
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`;
}

/**
 * Fetch and normalize live EOD broker summary, bandarmology, and volume analysis
 * from public IDX Terminal without requiring auth token.
 */
export async function fetchIdxTickerData(tickerInput: string): Promise<IdxBandarmologyData | null> {
  const cleanTicker = tickerInput.trim().toUpperCase().replace(/\.JK$/, '').replace(/^\^/, '');
  if (!cleanTicker || cleanTicker === 'JKSE' || cleanTicker === 'IHSG') {
    return null;
  }

  const url = `${IDX_TERMINAL_BASE}/api/ticker/${cleanTicker}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 6000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'IDX-Pro-AnalisaSaham/1.0',
      },
      next: { revalidate: 300 }, // Cache 5 minutes in Next.js
    });

    clearTimeout(timeoutId);

    if (!res.ok) {
      return null;
    }

    const json = await res.json();
    if (!json || json.status === 'error') {
      return null;
    }

    const bfLatest = json.bandarmology_factors?.latest || {};
    const techVol = json.technicals?.volume || {};
    const date = bfLatest.date || json.technicals?.latest?.date || new Date().toISOString().slice(0, 10);

    const topBuyers: IdxBrokerRecord[] = (json.top_buyers || []).map((b: any) => ({
      code: b.code || '',
      name: b.name || b.code || '',
      avgPrice: Math.round(b.buyAvgPrice || 0),
      value: Number(b.buyValue || 0),
      volumeLot: Math.round(Number(b.buyVolume || 0)),
      netValue: Number(b.netValue || 0),
      netLot: Math.round(Number(b.netVolume || 0)),
      isForeign: Array.isArray(b.investorGroups) && b.investorGroups.includes('FOREIGN'),
      status: b.status,
    }));

    const topSellers: IdxBrokerRecord[] = (json.top_sellers || []).map((s: any) => ({
      code: s.code || '',
      name: s.name || s.code || '',
      avgPrice: Math.round(s.sellAvgPrice || 0),
      value: Number(s.sellValue || 0),
      volumeLot: Math.round(Number(s.sellVolume || 0)),
      netValue: Number(s.netValue || 0),
      netLot: Math.round(Number(s.netVolume || 0)),
      isForeign: Array.isArray(s.investorGroups) && s.investorGroups.includes('FOREIGN'),
      status: s.status,
    }));

    const multiday = json.broker_multiday
      ? {
          days: Number(json.broker_multiday.days || 5),
          accumulators: (json.broker_multiday.accumulators || []).map((a: any) => ({
            code: a.code,
            name: a.name,
            net: Number(a.net || 0),
            days: Number(a.days || 0),
          })),
          distributors: (json.broker_multiday.distributors || []).map((d: any) => ({
            code: d.code,
            name: d.name,
            net: Number(d.net || 0),
            days: Number(d.days || 0),
          })),
        }
      : undefined;

    return {
      ticker: cleanTicker,
      date,
      bandarSide: (bfLatest.bandarSide as any) || 'NEUTRAL',
      bandarValue: Number(bfLatest.bandarValue || 0),
      brokerConcentrationPct: Number(bfLatest.brokerConcentrationPct || 0),
      foreignBuyValue: Number(bfLatest.foreignBuyValue || 0),
      foreignSellValue: Number(bfLatest.foreignSellValue || 0),
      netForeignValue: Number(bfLatest.netForeignValue || 0),
      foreignStreakSide: bfLatest.netForeignStreakSide || 'NEUTRAL',
      foreignStreakLength: Number(bfLatest.netForeignStreakLength || 0),
      topBuyers,
      topSellers,
      volume: {
        latest: Number(techVol.latest || 0),
        avg20d: Number(techVol.avg_20d || 0),
        ratio: Number(techVol.ratio || 1),
        signal: techVol.signal || 'NORMAL',
      },
      multiday,
    };
  } catch (err: any) {
    clearTimeout(timeoutId);
    console.warn(`[IDX-Terminal] Gagal fetch data ticker ${cleanTicker}:`, err.message);
    return null;
  }
}

/**
 * Convert structured IdxBandarmologyData into standard text format
 * compatible with existing broksum parser and AI context prompt.
 */
export function formatIdxBroksumToText(data: IdxBandarmologyData): string {
  const lines: string[] = [];
  lines.push(`[BROKER SUMMARY EOD - ${data.ticker}]`);
  lines.push(`Tanggal: ${data.date}`);
  lines.push(`Status Bandar: ${data.bandarSide} (Net Nilai: ${formatIdrCompact(data.bandarValue)})`);
  lines.push(`Konsentrasi Bandar (Top 3/5): ${data.brokerConcentrationPct.toFixed(1).replace('.', ',')}%`);
  
  const streakText = data.foreignStreakLength > 1 
    ? ` (Streak: ${data.foreignStreakLength} hari berturut-turut ${data.foreignStreakSide})` 
    : '';
  lines.push(`Foreign Flow: Net ${data.netForeignValue >= 0 ? 'Buy' : 'Sell'} ${formatIdrCompact(data.netForeignValue)}${streakText}`);

  const volRatioFormatted = data.volume.ratio.toFixed(2).replace('.', ',');
  lines.push(`Analisis Volume: ${(data.volume.latest / 100).toLocaleString('id-ID')} lot (${volRatioFormatted}x rata-rata 20 hari - ${data.volume.signal})`);

  lines.push('');
  lines.push('Top Net Buyer:');
  const buyersToShow = data.topBuyers.slice(0, 5);
  if (buyersToShow.length > 0) {
    buyersToShow.forEach((b, idx) => {
      const netLotStr = Math.abs(b.netLot || b.volumeLot).toLocaleString('id-ID');
      const avgStr = b.avgPrice.toLocaleString('id-ID');
      const valStr = formatIdrCompact(Math.abs(b.netValue || b.value));
      const groupTag = b.isForeign ? ' [ASING]' : '';
      lines.push(`${idx + 1}. ${b.code}: Net Buy ${netLotStr} lot @ Avg ${avgStr} (Value: ${valStr})${groupTag}`);
    });
  } else {
    lines.push('- Tidak ada data pembeli signifikan');
  }

  lines.push('');
  lines.push('Top Net Seller:');
  const sellersToShow = data.topSellers.slice(0, 5);
  if (sellersToShow.length > 0) {
    sellersToShow.forEach((s, idx) => {
      const netLotStr = Math.abs(s.netLot || s.volumeLot).toLocaleString('id-ID');
      const avgStr = s.avgPrice.toLocaleString('id-ID');
      const valStr = formatIdrCompact(-Math.abs(s.netValue || s.value));
      const groupTag = s.isForeign ? ' [ASING]' : '';
      lines.push(`${idx + 1}. ${s.code}: Net Sell ${netLotStr} lot @ Avg ${avgStr} (Value: ${valStr})${groupTag}`);
    });
  } else {
    lines.push('- Tidak ada data penjual signifikan');
  }

  if (data.multiday && (data.multiday.accumulators.length > 0 || data.multiday.distributors.length > 0)) {
    lines.push('');
    lines.push(`Akumulasi Multi-Day (${data.multiday.days} Hari Terakhir):`);
    const topAcc = data.multiday.accumulators.slice(0, 3).map((a) => `${a.code} (${formatIdrCompact(a.net)})`).join(', ');
    const topDist = data.multiday.distributors.slice(0, 3).map((d) => `${d.code} (${formatIdrCompact(d.net)})`).join(', ');
    if (topAcc) lines.push(`- Top Akumulator: ${topAcc}`);
    if (topDist) lines.push(`- Top Distributor: ${topDist}`);
  }

  return lines.join('\n');
}

/**
 * Fetch live official MaX V7.30 Screener from IDX Terminal API.
 * Covers full 962 IDX stocks with official signals (G ACC, SMART SNIPER, BETA BREAKOUT, etc.)
 */
export async function fetchLiveMaxlongScreener(): Promise<ScreenerResult | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 7000);

    const res = await fetch(`${IDX_TERMINAL_BASE}/api/screener?limit=1000`, {
      signal: controller.signal,
      headers: {
        'Accept': 'application/json',
        'User-Agent': 'AntiGravity-Terminal/2.0',
      },
      next: { revalidate: 180 },
    });

    clearTimeout(timeout);

    if (!res.ok) {
      console.warn(`[Maxlong Screener] Status ${res.status}`);
      return null;
    }

    const json = await res.json();
    if (!json || !Array.isArray(json.records)) {
      return null;
    }

    const kompasMap = new Map(KOMPAS_100_UNIVERSE.map((k) => [k.ticker, k]));

    // 1. Map all items with multi-scanner check and confluence calculation
    const mappedItems: ScreenerItem[] = json.records.map((r: any) => {
      const kompas = kompasMap.get(r.ticker);
      const changePct = typeof r.changePct === 'number' ? r.changePct : 0;
      const price = typeof r.price === 'number' ? r.price : 0;
      const change = price * (changePct / 100);
      const rrRatio = r.rewardRiskBuy1 ? `${Number(r.rewardRiskBuy1).toFixed(1)}:1` : '2.5:1';

      // Detect which of the 3 target scanners qualify strictly based on authentic scanner signals:
      const matchedScanners: string[] = [];
      const sigUpper = (r.signal || '').toUpperCase();
      const activeSigUpper = (r.activeSignals || '').toUpperCase();

      // Scanner 1: G ACC (Gamma Accumulation)
      const isGAcc = sigUpper === 'G ACC' || activeSigUpper.includes('G ACC');
      if (isGAcc) {
        matchedScanners.push('G ACC');
      }

      // Scanner 2: Breakout (Beta Breakout)
      const isBreakout = sigUpper === 'BETA BREAKOUT' || activeSigUpper.includes('BETA BREAKOUT');
      if (isBreakout) {
        matchedScanners.push('BETA BREAKOUT');
      }

      // Scanner 3: Gamma (Smart Gamma)
      const isGamma = sigUpper === 'SMART GAMMA' || activeSigUpper.includes('SMART GAMMA');
      if (isGamma) {
        matchedScanners.push('SMART GAMMA');
      }

      const count = matchedScanners.length;
      const isConfluence = count >= 2;
      const confluenceLabel = isConfluence ? `${count}x CONFLUENCE` : 'SINGLE';

      return {
        ticker: r.ticker,
        name: kompas?.name || `${r.ticker} Tbk`,
        sector: kompas?.sector || r.structure || 'IDX Equity',
        price,
        change,
        changePercent: changePct,
        volume: r.volume || 0,
        rvol: r.rvol || 1,
        rsi14: r.rsi || 50,
        ma20: r.ema21 || 0,
        ma50: r.ema50 || 0,
        trend: r.trend === 'UPTREND' ? 'UPTREND' : r.trend === 'DOWNTREND' ? 'DOWNTREND' : 'SIDEWAYS',
        signal: (r.signal || 'WATCHLIST') as any,
        grade: (r.score || 0) >= 5200 ? 'A+ ELITE' : (r.score || 0) >= 4500 ? 'A HIGH QUALITY' : 'B WATCHLIST',
        score: r.score || 0,
        buyGrid: {
          buy1: r.buy1 || price,
          buy2: r.buy2 || Math.round(price * 0.96),
          stopLoss: r.stopLoss || Math.round(price * 0.90),
          target1: r.tp1 || Math.round(price * 1.15),
          target2: r.tp2 || Math.round(price * 1.30),
          rewardRisk: rrRatio,
        },
        confluence: {
          count,
          isConfluence,
          scanners: matchedScanners,
          label: confluenceLabel,
        },
      };
    });

    // 2. Filter ONLY stocks that belong to the 3 target scanners (G ACC, BETA BREAKOUT, SMART GAMMA)
    // and exclude stocks that only belong to Sniper, V-Shape, or Early Sweep.
    const targetSignalSet = new Set(['G ACC', 'BETA BREAKOUT', 'SMART GAMMA']);

    const targetActiveItems = mappedItems.filter((item) => {
      const orig = json.records.find((rec: any) => rec.ticker === item.ticker);
      if (!orig || orig.activeSignal !== true) return false;

      const primary = (orig.signal || '').toUpperCase();
      const activeSig = (orig.activeSignals || '').toUpperCase();
      return (
        targetSignalSet.has(primary) ||
        activeSig.includes('G ACC') ||
        activeSig.includes('BETA BREAKOUT') ||
        activeSig.includes('SMART GAMMA')
      );
    });

    // Sort: Confluence count descending (3x -> 2x -> 1x), then score descending
    const sortedActiveSignals = targetActiveItems.sort((a, b) => {
      const confDiff = (b.confluence?.count || 0) - (a.confluence?.count || 0);
      if (confDiff !== 0) return confDiff;
      return b.score - a.score;
    });

    return {
      scanDate: json.snapshotDate || new Date().toISOString().split('T')[0],
      totalScreened: json.totalRecords || json.records.length,
      totalSignals: sortedActiveSignals.length,
      signals: sortedActiveSignals,
      allResults: mappedItems,
      isCached: false,
      cachedAt: new Date().toLocaleTimeString('id-ID'),
    };
  } catch (err: any) {
    console.warn('[Maxlong Screener] Error fetching live screener:', err.message);
    return null;
  }
}

