/**
 * Client and normalizer for Public IDX Terminal API (https://idx.maxlong.my.id)
 * Provides automatic, zero-auth access to live EOD Broker Summary, Bandarmology Factors, and Volume Analysis.
 */

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
