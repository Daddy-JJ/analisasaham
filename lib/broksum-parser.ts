/**
 * IDX Broker Summary (Broksum) & Bandarmology Smart Parser
 * Conforms to OpenAPI 3.1.0 schemas: BroksumGenericResponse & BandarmologyGenericResponse
 */

import {
  BrokerPracticalClass,
  getBrokerInfo,
  getBrokerClassification,
  isBrokerRetailHeavy,
  isBrokerInstitutional,
  getBrokerCategoryLegacy,
} from './broker-reference';

export interface BrokerItem {
  broker: string;
  side: 'BUY' | 'SELL';
  lot: number;
  value: number; // In Rupiah (IDR)
  avgPrice: number;
  category: 'FOREIGN_INST' | 'LOCAL_INST' | 'RETAIL' | 'OTHER';
  brokerName?: string;
  classification?: BrokerPracticalClass;
  classificationLabel?: string;
  character?: string;
}

export interface ConcentrationStats {
  top1: number;
  top3: number;
  top5: number;
}

export interface ParsedBroksumResult {
  hasData: boolean;
  ticker: string;
  date: string;
  startDate: string | null;
  endDate: string | null;
  side: 'accumulation' | 'distribution' | 'neutral';
  label: 'BIG ACCUMULATION' | 'NORMAL ACCUMULATION' | 'NEUTRAL' | 'NORMAL DISTRIBUTION' | 'BIG DISTRIBUTION';
  score: number; // -100 to +100
  confidence: number; // 0.0 to 1.0
  topBuyers: BrokerItem[];
  topSellers: BrokerItem[];
  totalBuyerValue: number;
  totalSellerValue: number;
  buyerConcentration: ConcentrationStats;
  sellerConcentration: ConcentrationStats;
  bandarValue3: number; // Top 3 Buyer Value - Top 3 Seller Absolute Value
  bandarValue5: number; // Top 5 Buyer Value - Top 5 Seller Absolute Value
  foreignFlow: number | null;
  totalTradedValue: number | null;
  detectedTicker?: string;
  reasons: string[];
  openApiBroksum: Record<string, unknown>;
  openApiBandarmology: Record<string, unknown>;
}

export function getBrokerCategory(code: string): 'FOREIGN_INST' | 'LOCAL_INST' | 'RETAIL' | 'OTHER' {
  return getBrokerCategoryLegacy(code);
}

export function parseIndoNumber(raw: string | number | undefined | null): number {
  if (raw === undefined || raw === null || raw === '') return 0;
  if (typeof raw === 'number') return raw;

  let s = raw.toString().trim();

  // Detect sign
  let sign = 1;
  if (/^-/.test(s) || /-\s*(?:Rp|IDR)/i.test(s) || /(?:Rp|IDR)\s*-/i.test(s)) {
    sign = -1;
  }

  // Strip currency prefix and parentheses
  s = s.replace(/(?:Rp|IDR)\.?/gi, '').replace(/[+()]/g, '').trim();
  if (s.startsWith('-')) s = s.slice(1).trim();

  let multiplier = 1;
  if (/(?:t(?:riliun)?)$/i.test(s)) {
    multiplier = 1e12;
    s = s.replace(/(?:t(?:riliun)?)$/i, '').trim();
  } else if (/(?:m(?:iliar|ilyar)?|b(?:illion)?)$/i.test(s)) {
    multiplier = 1e9;
    s = s.replace(/(?:m(?:iliar|ilyar)?|b(?:illion)?)$/i, '').trim();
  } else if (/(?:juta|jt|mio)$/i.test(s)) {
    multiplier = 1e6;
    s = s.replace(/(?:juta|jt|mio)$/i, '').trim();
  } else if (/(?:ribu|k)$/i.test(s)) {
    multiplier = 1e3;
    s = s.replace(/(?:ribu|k)$/i, '').trim();
  }

  if (multiplier > 1) {
    s = s.replace(',', '.');
    const n = parseFloat(s);
    return isNaN(n) ? 0 : sign * n * multiplier;
  }

  // Standard thousands vs decimal separators
  if (/^\d{1,3}(?:\.\d{3})+(?:,\d+)?$/.test(s)) {
    s = s.replace(/\./g, '').replace(',', '.');
  } else if (/^\d{1,3}(?:,\d{3})+(?:\.\d+)?$/.test(s)) {
    s = s.replace(/,/g, '');
  } else {
    s = s.replace(',', '.');
  }

  const n = parseFloat(s);
  return isNaN(n) ? 0 : sign * n;
}

export function formatRupiahShort(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return 'N/A';
  const sign = amount < 0 ? '-' : amount > 0 ? '+' : '';
  const abs = Math.abs(amount);

  if (abs >= 1e12) {
    return `${sign}Rp ${(abs / 1e12).toFixed(2)} T`;
  }
  if (abs >= 1e9) {
    return `${sign}Rp ${(abs / 1e9).toFixed(2)} M`;
  }
  if (abs >= 1e6) {
    return `${sign}Rp ${(abs / 1e6).toFixed(1)} Jt`;
  }
  return `${sign}Rp ${abs.toLocaleString('id-ID')}`;
}

export function formatNumberShort(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';

  if (abs >= 1e6) {
    return `${sign}${(abs / 1e6).toFixed(1)}M`;
  }
  if (abs >= 1e3) {
    return `${sign}${(abs / 1e3).toFixed(1)}K`;
  }
  return `${sign}${abs.toLocaleString('id-ID')}`;
}

/**
 * Helper to dynamically determine which token is Lot and which is Val (supports both Stockbit and IPOT order)
 */
function resolveTokensToMetrics(tokens: string[]): { lot: number; val: number; avg: number } {
  if (tokens.length === 0) return { lot: 0, val: 0, avg: 0 };
  if (tokens.length === 1) {
    const n = parseIndoNumber(tokens[0]);
    return { lot: 0, val: n, avg: 0 };
  }

  let lot = 0;
  let val = 0;
  let avg = 0;

  if (tokens.length >= 3) {
    avg = parseIndoNumber(tokens[2]);
    const num0 = parseIndoNumber(tokens[0]);
    const num1 = parseIndoNumber(tokens[1]);

    const str0 = tokens[0].toLowerCase();
    const str1 = tokens[1].toLowerCase();

    // Check unit suffixes (e.g. 77.3B is val, 236.8K is lot)
    const isVal0 = /[bmt]|miliar|milyar|triliun/i.test(str0) || num0 > 1e8;
    const isLot0 = /[k]|ribu|lot/i.test(str0);

    const isVal1 = /[bmt]|miliar|milyar|triliun/i.test(str1) || num1 > 1e8;
    const isLot1 = /[k]|ribu|lot/i.test(str1);

    if (isVal0 && !isLot0 && (isLot1 || !isVal1)) {
      val = num0;
      lot = num1;
    } else if (isVal1 && !isLot1 && (isLot0 || !isVal0)) {
      val = num1;
      lot = num0;
    } else if (num0 > num1 * 100) {
      val = num0;
      lot = num1;
    } else {
      lot = num0;
      val = num1;
    }

    if (!avg && lot > 0 && val > 0) {
      avg = Math.round(val / (lot * 100));
    }
  } else if (tokens.length === 2) {
    const num0 = parseIndoNumber(tokens[0]);
    const num1 = parseIndoNumber(tokens[1]);
    if (num0 > num1 * 100) {
      val = num0;
      lot = num1;
    } else {
      lot = num0;
      val = num1;
    }
    if (lot > 0 && val > 0) {
      avg = Math.round(val / (lot * 100));
    }
  }

  return { lot, val, avg };
}

function buildBrokerItem(
  code: string,
  side: 'BUY' | 'SELL',
  lot: number,
  value: number,
  avgPrice: number
): BrokerItem {
  const upper = code.replace(/[^A-Za-z]/g, '').toUpperCase();
  const info = getBrokerInfo(upper);
  return {
    broker: upper,
    side,
    lot,
    value,
    avgPrice,
    category: getBrokerCategoryLegacy(upper),
    brokerName: info?.name,
    classification: info?.classification,
    classificationLabel: info?.classificationLabel,
    character: info?.character,
  };
}

/**
 * Main parser function: takes raw user input and returns structured Broker Summary & Bandarmology data.
 */
export function parseBroksumText(text: string, ticker = ''): ParsedBroksumResult {
  const cleanText = (text || '').trim();
  if (!cleanText) {
    return createEmptyBroksumResult(ticker);
  }

  // Pre-process lines: if markdown table line, replace pipes '|' with spaces/tabs
  // and filter out markdown header separators like | :--- | :--- |
  const lines = cleanText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^\|?[:\-\s\t|]+\|?$/.test(l))
    .map((l) => l.replace(/\|/g, ' \t ').trim());

  const buyers: BrokerItem[] = [];
  const sellers: BrokerItem[] = [];
  let foreignFlow: number | null = null;
  let totalTradedValue: number | null = null;
  let dateStr: string | null = null;
  let detectedTicker = ticker || '';

  // Extract Ticker from header if present (e.g. "Emiten: ANTM" or "+ ANTM" or "Ticker: ANTM")
  const tickerMatch = cleanText.match(/(?:emiten|ticker|saham)\s*[:=]?\s*([A-Za-z]{4})/i) ||
                      cleanText.match(/^\s*\+\s*([A-Za-z]{4})\b/m);
  if (tickerMatch) {
    detectedTicker = tickerMatch[1].toUpperCase();
  }

  let currentSection: 'BUY' | 'SELL' | null = null;

  for (const line of lines) {
    // 1. Date extraction
    const dateMatch = line.match(/(?:tanggal|date)\s*[:=]\s*([^\]\)\n]+)/i);
    if (dateMatch && !dateStr) {
      dateStr = dateMatch[1].trim();
      continue;
    }

    // 2. Foreign Flow extraction
    const foreignMatch = line.match(
      /(?:foreign\s*(?:flow|net)?|asing\s*(?:net|flow)?)\s*[:=]?\s*(?:net\s*(?:buy|sell))?\s*([+\-]?\s*(?:Rp\.?\s*)?[+\-]?\s*[\d.,]+\s*(?:[A-Za-z]+)?)/i
    );
    if (foreignMatch) {
      let fRaw = foreignMatch[1].trim();
      if (/sell|jual/i.test(line) && !fRaw.includes('-')) {
        fRaw = '-' + fRaw;
      }
      foreignFlow = parseIndoNumber(fRaw);
      continue;
    }

    // 3. Total Traded Value / Turnover
    const totalValMatch = line.match(
      /(?:total\s*(?:traded\s*value|turnover|transaksi)|turnover|nilai\s*transaksi|net\s*value)\s*[:=]?\s*(?:Rp\.?\s*)?([\d.,]+\s*(?:[A-Za-z]+)?)/i
    );
    if (totalValMatch) {
      totalTradedValue = parseIndoNumber(totalValMatch[1]);
      continue;
    }

    // 4. Section Headers
    if (/^(?:top\s*(?:net\s*)?buyers?|buyers?|pembeli)/i.test(line) && !/sellers?|penjual/i.test(line)) {
      currentSection = 'BUY';
      continue;
    }
    if (/^(?:top\s*(?:net\s*)?sellers?|sellers?|penjual)/i.test(line) && !/buyers?|pembeli/i.test(line)) {
      currentSection = 'SELL';
      continue;
    }

    // 5. Two-column tabular copy-paste (Stockbit / IPOT / Mirae table)
    const tokens = line.split(/[\t\s]+/).filter(Boolean);
    if (tokens.some((t) => /^(?:BUYER|SELLER|B\.LOT|S\.LOT|B\.VAL|S\.VAL|B\.AVG|S\.AVG|BROKER|BY|SL)$/i.test(t))) {
      continue;
    }

    if (tokens.length >= 6) {
      const broker1 = tokens[0].replace(/[^A-Za-z]/g, '').toUpperCase();
      let secondBrokerIdx = -1;
      for (let i = 3; i < tokens.length; i++) {
        const potential = tokens[i].replace(/[^A-Za-z]/g, '').toUpperCase();
        if (potential.length === 2 && /^[A-Z]{2}$/.test(potential)) {
          secondBrokerIdx = i;
          break;
        }
      }

      if (broker1.length === 2 && secondBrokerIdx > 0) {
        const side1 = tokens.slice(0, secondBrokerIdx);
        const side2 = tokens.slice(secondBrokerIdx);

        const bCode = side1[0].toUpperCase();
        const bMetrics = resolveTokensToMetrics(side1.slice(1));
        buyers.push(buildBrokerItem(bCode, 'BUY', bMetrics.lot, bMetrics.val, bMetrics.avg));

        const sCode = side2[0].toUpperCase();
        const sMetrics = resolveTokensToMetrics(side2.slice(1));
        sellers.push(buildBrokerItem(sCode, 'SELL', sMetrics.lot, sMetrics.val, sMetrics.avg));
        continue;
      }
    }

    // 6. Bullet / Numbered format: "1. AK: Net Buy 45.200 lot @ Avg 6.225 (Value: Rp 28,1 Miliar)"
    const bulletMatch = line.match(
      /(?:^\d+\.?\s*)?([A-Za-z]{2})\s*[:\-\s]\s*(?:Net\s*(Buy|Sell))?\s*([+\-]?[\d.,]+[A-Za-z]*)\s*lot(?:.*?avg\s*([0-9.,]+))?(?:.*?value\s*[:=]?\s*([+\-]?\s*(?:Rp\.?\s*)?[+\-]?\s*[\d.,]+\s*(?:[A-Za-z]+)?))?/i
    );
    if (bulletMatch) {
      const code = bulletMatch[1].toUpperCase();
      const explicitSide = bulletMatch[2] ? bulletMatch[2].toUpperCase() : null;
      const lotRaw = bulletMatch[3];
      const avgRaw = bulletMatch[4];
      const valRaw = bulletMatch[5];

      const side: 'BUY' | 'SELL' = explicitSide === 'SELL' || currentSection === 'SELL' || /sell|jual/i.test(line) ? 'SELL' : 'BUY';
      const lot = Math.abs(parseIndoNumber(lotRaw));
      let val = valRaw ? Math.abs(parseIndoNumber(valRaw)) : 0;
      let avg = avgRaw ? parseIndoNumber(avgRaw) : 0;

      if (!val && lot > 0 && avg > 0) {
        val = lot * 100 * avg;
      }
      if (!avg && lot > 0 && val > 0) {
        avg = Math.round(val / (lot * 100));
      }

      const item = buildBrokerItem(code, side, lot, val, avg);
      if (side === 'BUY') {
        buyers.push(item);
      } else {
        sellers.push(item);
      }
      continue;
    }

    // 7. Single broker line format: e.g. "AK 45.200 28.1B 6225"
    if (tokens.length >= 2) {
      const code = tokens[0].replace(/[^A-Za-z]/g, '').toUpperCase();
      if (code.length === 2 && /^[A-Z]{2}$/.test(code)) {
        const side: 'BUY' | 'SELL' = currentSection === 'SELL' || /sell|jual/i.test(line) ? 'SELL' : 'BUY';
        const metrics = resolveTokensToMetrics(tokens.slice(1));

        const item = buildBrokerItem(code, side, metrics.lot, metrics.val, metrics.avg);
        if (side === 'BUY') buyers.push(item);
        else sellers.push(item);
      }
    }
  }

  // Deduplicate and aggregate brokers if listed multiple times
  const aggregateBrokers = (list: BrokerItem[]): BrokerItem[] => {
    const map = new Map<string, BrokerItem>();
    for (const item of list) {
      if (map.has(item.broker)) {
        const prev = map.get(item.broker)!;
        const totalLot = prev.lot + item.lot;
        const totalVal = prev.value + item.value;
        const avg = totalLot > 0 ? Math.round(totalVal / (totalLot * 100)) : prev.avgPrice;
        map.set(item.broker, { ...prev, lot: totalLot, value: totalVal, avgPrice: avg });
      } else {
        const info = getBrokerInfo(item.broker);
        map.set(item.broker, {
          ...item,
          brokerName: info?.name || item.brokerName,
          classification: info?.classification || item.classification,
          classificationLabel: info?.classificationLabel || item.classificationLabel,
          character: info?.character || item.character,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  };

  const aggBuyers = aggregateBrokers(buyers);
  const aggSellers = aggregateBrokers(sellers);

  if (aggBuyers.length === 0 && aggSellers.length === 0) {
    return createEmptyBroksumResult(ticker);
  }

  // Calculate Totals & Concentrations
  const totalBuyerVal = aggBuyers.reduce((sum, b) => sum + b.value, 0);
  const totalSellerVal = aggSellers.reduce((sum, s) => sum + s.value, 0);

  const calcConc = (arr: BrokerItem[], total: number, n: number): number => {
    if (!total || total === 0) return 0;
    const topNVal = arr.slice(0, n).reduce((sum, item) => sum + item.value, 0);
    return Math.round((topNVal / total) * 1000) / 10;
  };

  const buyerConc: ConcentrationStats = {
    top1: calcConc(aggBuyers, totalBuyerVal, 1),
    top3: calcConc(aggBuyers, totalBuyerVal, 3),
    top5: calcConc(aggBuyers, totalBuyerVal, 5),
  };

  const sellerConc: ConcentrationStats = {
    top1: calcConc(aggSellers, totalSellerVal, 1),
    top3: calcConc(aggSellers, totalSellerVal, 3),
    top5: calcConc(aggSellers, totalSellerVal, 5),
  };

  // Bandar Value (Top 3 & Top 5)
  const top3BuyerVal = aggBuyers.slice(0, 3).reduce((s, b) => s + b.value, 0);
  const top3SellerVal = aggSellers.slice(0, 3).reduce((s, b) => s + b.value, 0);
  const bandarValue3 = top3BuyerVal - top3SellerVal;

  const top5BuyerVal = aggBuyers.slice(0, 5).reduce((s, b) => s + b.value, 0);
  const top5SellerVal = aggSellers.slice(0, 5).reduce((s, b) => s + b.value, 0);
  const bandarValue5 = top5BuyerVal - top5SellerVal;

  // Retail vs Smart Money (Institusi / Asing / BUMN)
  const retailBuyers = aggBuyers.filter((b) => isBrokerRetailHeavy(b.broker));
  const retailSellers = aggSellers.filter((s) => isBrokerRetailHeavy(s.broker));
  const retailNetBuyVal = retailBuyers.reduce((s, b) => s + b.value, 0) - retailSellers.reduce((s, b) => s + b.value, 0);

  const instBuyers = aggBuyers.filter((b) => isBrokerInstitutional(b.broker));
  const instSellers = aggSellers.filter((s) => isBrokerInstitutional(s.broker));
  const instNetBuyVal = instBuyers.reduce((s, b) => s + b.value, 0) - instSellers.reduce((s, b) => s + b.value, 0);

  // Scoring (-100 to +100)
  let score = 0;
  const maxTopVal = Math.max(top3BuyerVal, top3SellerVal, 1);
  const bvRatio = bandarValue3 / maxTopVal;
  score += Math.max(-40, Math.min(40, Math.round(bvRatio * 40)));

  const concDelta = buyerConc.top3 - sellerConc.top3;
  score += Math.max(-30, Math.min(30, Math.round(concDelta * 0.75)));

  if (instNetBuyVal > 0 && retailNetBuyVal < 0) score += 20;
  else if (instNetBuyVal < 0 && retailNetBuyVal > 0) score -= 20;
  else if (instNetBuyVal > 0) score += 10;
  else if (instNetBuyVal < 0) score -= 10;

  if (foreignFlow !== null) {
    if (foreignFlow > 0) score += 10;
    else if (foreignFlow < 0) score -= 10;
  }

  score = Math.max(-100, Math.min(100, score));

  // Classification Label & Side
  let label: ParsedBroksumResult['label'] = 'NEUTRAL';
  let side: ParsedBroksumResult['side'] = 'neutral';
  if (score >= 40) {
    label = 'BIG ACCUMULATION';
    side = 'accumulation';
  } else if (score >= 15) {
    label = 'NORMAL ACCUMULATION';
    side = 'accumulation';
  } else if (score <= -40) {
    label = 'BIG DISTRIBUTION';
    side = 'distribution';
  } else if (score <= -15) {
    label = 'NORMAL DISTRIBUTION';
    side = 'distribution';
  }

  const totalBrokers = aggBuyers.length + aggSellers.length;
  let confidence = Math.min(0.95, 0.5 + totalBrokers * 0.05);
  if (totalBuyerVal === 0 && totalSellerVal === 0) confidence = 0.1;

  // Analytical Reasons
  const reasons: string[] = [];
  if (bandarValue3 !== 0) {
    const bvSign = bandarValue3 > 0 ? '+' : '';
    const bvFormatted = (bandarValue3 / 1e9).toFixed(2);
    reasons.push(
      `Bandar Value (Top 3) bernilai ${bvSign}Rp ${bvFormatted} Miliar (${
        bandarValue3 > 0 ? 'Net Buyer lebih dominan daripada Seller' : 'Net Seller lebih dominan daripada Buyer'
      }).`
    );
  }
  if (buyerConc.top3 > 0 || sellerConc.top3 > 0) {
    reasons.push(
      `Konsentrasi Buyer Top 3 sebesar ${buyerConc.top3}% vs Seller Top 3 sebesar ${sellerConc.top3}% (delta ${
        concDelta > 0 ? '+' : ''
      }${concDelta.toFixed(1)}%).`
    );
  }
  if (instNetBuyVal > 0 && retailNetBuyVal < 0) {
    const instNames = instBuyers.map((b) => b.brokerName ? `${b.broker} (${b.brokerName})` : b.broker).join(', ');
    const retailNames = retailSellers.map((s) => s.brokerName ? `${s.broker} (${s.brokerName})` : s.broker).join(', ');
    reasons.push(
      `Pola Smart Money Absorption: Broker institusi/asing/BUMN (${instNames}) menampung barang dari broker ritel (${retailNames}).`
    );
  } else if (instNetBuyVal < 0 && retailNetBuyVal > 0) {
    const instNames = instSellers.map((s) => s.brokerName ? `${s.broker} (${s.brokerName})` : s.broker).join(', ');
    const retailNames = retailBuyers.map((b) => b.brokerName ? `${b.broker} (${b.brokerName})` : b.broker).join(', ');
    reasons.push(
      `Pola Retail Trap/Distribusi: Broker institusi/asing melakukan aksi jual (${instNames}) yang ditampung oleh broker ritel (${retailNames}).`
    );
  }
  if (foreignFlow !== null && foreignFlow !== 0) {
    const ffSign = foreignFlow > 0 ? '+' : '';
    reasons.push(`Net Foreign Flow tercatat ${ffSign}Rp ${(foreignFlow / 1e9).toFixed(2)} Miliar.`);
  }

  // OpenAPI schema objects
  const openApiBroksum = {
    ticker: ticker || null,
    date: dateStr || new Date().toISOString().split('T')[0],
    startDate: dateStr || null,
    endDate: dateStr || null,
    side,
    label,
    score,
    confidence,
    totalDates: 1,
    totalMatches: aggBuyers.length + aggSellers.length,
    returned: aggBuyers.length + aggSellers.length,
    summary: {
      totalBuyerValue: totalBuyerVal,
      totalSellerValue: totalSellerVal,
      bandarValueTop3: bandarValue3,
      bandarValueTop5: bandarValue5,
      buyerConcentration: buyerConc,
      sellerConcentration: sellerConc,
      foreignFlow,
      totalTradedValue,
      topBuyers: aggBuyers.slice(0, 5),
      topSellers: aggSellers.slice(0, 5),
    },
    records: [
      ...aggBuyers.map((b) => ({
        broker: b.broker,
        brokerName: b.brokerName,
        classification: b.classification,
        classificationLabel: b.classificationLabel,
        character: b.character,
        type: 'BUY',
        lot: b.lot,
        value: b.value,
        avgPrice: b.avgPrice,
        category: b.category,
      })),
      ...aggSellers.map((s) => ({
        broker: s.broker,
        brokerName: s.brokerName,
        classification: s.classification,
        classificationLabel: s.classificationLabel,
        character: s.character,
        type: 'SELL',
        lot: s.lot,
        value: s.value,
        avgPrice: s.avgPrice,
        category: s.category,
      })),
    ],
    reasons,
  };

  const openApiBandarmology = {
    ticker: ticker || null,
    date: dateStr || new Date().toISOString().split('T')[0],
    topN: 3,
    netForeignFlow: foreignFlow,
    isComplete: true,
    latest: {
      bandarValue: bandarValue3,
      foreignFlow,
      concentrationTop1: buyerConc.top1,
      concentrationTop3: buyerConc.top3,
      concentrationTop5: buyerConc.top5,
      retailDominance: retailNetBuyVal > 0 ? 'BUY' : retailNetBuyVal < 0 ? 'SELL' : 'NEUTRAL',
      institutionalDominance: instNetBuyVal > 0 ? 'BUY' : instNetBuyVal < 0 ? 'SELL' : 'NEUTRAL',
      bandarStatus: label,
      score,
    },
    records: openApiBroksum.records,
  };

  return {
    hasData: true,
    ticker: detectedTicker || ticker || '',
    detectedTicker: detectedTicker || ticker || '',
    date: dateStr || new Date().toISOString().split('T')[0],
    startDate: dateStr || null,
    endDate: dateStr || null,
    side,
    label,
    score,
    confidence,
    topBuyers: aggBuyers.slice(0, 5),
    topSellers: aggSellers.slice(0, 5),
    totalBuyerValue: totalBuyerVal,
    totalSellerValue: totalSellerVal,
    buyerConcentration: buyerConc,
    sellerConcentration: sellerConc,
    bandarValue3,
    bandarValue5,
    foreignFlow,
    totalTradedValue,
    reasons,
    openApiBroksum,
    openApiBandarmology,
  };
}

function createEmptyBroksumResult(ticker: string): ParsedBroksumResult {
  return {
    hasData: false,
    ticker,
    detectedTicker: ticker,
    date: new Date().toISOString().split('T')[0],
    startDate: null,
    endDate: null,
    side: 'neutral',
    label: 'NEUTRAL',
    score: 0,
    confidence: 0,
    topBuyers: [],
    topSellers: [],
    totalBuyerValue: 0,
    totalSellerValue: 0,
    buyerConcentration: { top1: 0, top3: 0, top5: 0 },
    sellerConcentration: { top1: 0, top3: 0, top5: 0 },
    bandarValue3: 0,
    bandarValue5: 0,
    foreignFlow: null,
    totalTradedValue: null,
    reasons: [],
    openApiBroksum: {},
    openApiBandarmology: {},
  };
}
