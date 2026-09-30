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

export interface OrderbookDepthItem {
  bidFreq?: number;
  bidLot?: number;
  bidPrice?: number;
  offerPrice?: number;
  offerLot?: number;
  offerFreq?: number;
}

export interface OrderbookStats {
  hasOrderbook: boolean;
  lastPrice?: number;
  change?: number;
  changePercent?: number;
  open?: number;
  high?: number;
  low?: number;
  prev?: number;
  avg?: number;
  totalLot?: number;
  totalValue?: number;
  totalFreq?: number;
  foreignBuy?: number;
  foreignSell?: number;
  netForeignIntraday?: number;
  totalBidLot?: number;
  totalOfferLot?: number;
  totalBidFreq?: number;
  totalOfferFreq?: number;
  bidOfferRatio?: number;
  orderbookPosture?: 'HEAVY_OFFER_SUPPRESSION' | 'STRONG_BID_CUSHION' | 'MODERATE_OFFER' | 'MODERATE_BID' | 'BALANCED';
  tapeReadingSignal?: string;
  depthLevels?: OrderbookDepthItem[];
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
  orderbook?: OrderbookStats;
  reasons: string[];
  openApiBroksum: Record<string, unknown>;
  openApiBandarmology: Record<string, unknown>;
}

export function getBrokerCategory(code: string): 'FOREIGN_INST' | 'LOCAL_INST' | 'RETAIL' | 'OTHER' {
  return getBrokerCategoryLegacy(code);
}

/**
 * Formats a number with dot (.) as thousand separator (Indonesian standard formatting)
 * Example: 12231 -> "12.231", 2029 -> "2.029"
 */
export function formatDotNumber(
  num: number | null | undefined,
  maxDecimals = 0,
  stripTrailingZeros = false
): string {
  if (num === null || num === undefined || isNaN(num)) return '0';
  const sign = num < 0 ? '-' : '';
  const abs = Math.abs(num);

  if (maxDecimals > 0) {
    let fixed = abs.toFixed(maxDecimals);
    if (stripTrailingZeros && fixed.includes('.')) {
      fixed = fixed.replace(/\.?0+$/, '');
    }
    const [intPart, decPart] = fixed.split('.');
    const formattedInt = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return decPart ? `${sign}${formattedInt},${decPart}` : `${sign}${formattedInt}`;
  }

  const rounded = Math.round(abs);
  return sign + rounded.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
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

  // Strip currency prefix, parentheses, and percent symbols
  s = s.replace(/(?:Rp|IDR)\.?/gi, '').replace(/[+()%]/g, '').trim();
  if (s.startsWith('-')) s = s.slice(1).trim();

  let multiplier = 1;
  if (/(?:t(?:riliun)?)$/i.test(s)) {
    multiplier = 1e12;
    s = s.replace(/(?:t(?:riliun)?)$/i, '').trim();
  } else if (/(?:miliar|milyar|b(?:illion)?)$/i.test(s)) {
    // 'B' or spelled-out 'miliar'/'milyar' is 1e9 (Billion / Miliar IDR)
    multiplier = 1e9;
    s = s.replace(/(?:miliar|milyar|b(?:illion)?)$/i, '').trim();
  } else if (/(?:juta|jt|mio|m(?:illion)?)$/i.test(s)) {
    // Solitary 'M' or 'mio'/'juta' is 1e6 (Million / Juta IDR)
    multiplier = 1e6;
    s = s.replace(/(?:juta|jt|mio|m(?:illion)?)$/i, '').trim();
  } else if (/(?:ribu|k)$/i.test(s)) {
    // 'K' or 'ribu' is 1e3 (Thousand / Ribu)
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
    const val = (abs / 1e12).toFixed(2).replace('.', ',');
    return `${sign}Rp ${val} T`;
  }
  if (abs >= 1e9) {
    const val = (abs / 1e9).toFixed(2).replace('.', ',');
    return `${sign}Rp ${val} M`;
  }
  if (abs >= 1e6) {
    const val = (abs / 1e6).toFixed(1).replace('.', ',');
    return `${sign}Rp ${val} Jt`;
  }
  return `${sign}Rp ${formatDotNumber(abs)}`;
}

export function formatNumberShort(num: number | null | undefined): string {
  return formatDotNumber(num);
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

    // Check unit suffixes (e.g. 77.3B is val, 236.8K is lot, 159.1M is val)
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
    const str0 = tokens[0].toLowerCase();
    const str1 = tokens[1].toLowerCase();

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

  // SANITY CHECK & SELF-HEALING AUTO-CORRECTION:
  // In IDX, 1 lot = 100 shares. Therefore: Expected Transaction Value = lot * 100 * avgPrice.
  let correctedVal = value;
  let correctedAvg = avgPrice;

  if (lot > 0 && avgPrice > 0) {
    const expectedVal = lot * 100 * avgPrice;
    if (correctedVal > 0) {
      const ratio = correctedVal / expectedVal;
      // If parsed value is ~1000x too large (e.g. M parsed as Miliar instead of Million)
      if (ratio >= 500 && ratio <= 1500) {
        correctedVal = Math.round(correctedVal / 1000);
      }
      // If parsed value is ~1000x too small (e.g. B parsed as Million instead of Billion)
      else if (ratio >= 0.0005 && ratio <= 0.002) {
        correctedVal = Math.round(correctedVal * 1000);
      }
    } else {
      correctedVal = expectedVal;
    }
  } else if (lot > 0 && correctedVal > 0 && !correctedAvg) {
    correctedAvg = Math.round(correctedVal / (lot * 100));
  }

  return {
    broker: upper,
    side,
    lot,
    value: correctedVal,
    avgPrice: correctedAvg,
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

  // Orderbook variables
  let obLastPrice: number | undefined;
  let obChange: number | undefined;
  let obChangePercent: number | undefined;
  let obOpen: number | undefined;
  let obHigh: number | undefined;
  let obLow: number | undefined;
  let obPrev: number | undefined;
  let obLot: number | undefined;
  let obVal: number | undefined;
  let obAvg: number | undefined;
  let obFreq: number | undefined;
  let obForeignBuy: number | undefined;
  let obForeignSell: number | undefined;
  let obTotalBidLot: number | undefined;
  let obTotalOfferLot: number | undefined;
  let obTotalBidFreq: number | undefined;
  let obTotalOfferFreq: number | undefined;
  const obDepthLevels: OrderbookDepthItem[] = [];

  // Summary and participation variables
  let explicitBuyerCount: number | undefined;
  let explicitSellerCount: number | undefined;

  let summaryTop1Val: number | undefined;
  let summaryTop3Val: number | undefined;
  let summaryTop5Val: number | undefined;
  let summaryBuyerConc1: number | undefined;
  let summaryBuyerConc3: number | undefined;
  let summaryBuyerConc5: number | undefined;
  let summarySellerConc1: number | undefined;
  let summarySellerConc3: number | undefined;
  let summarySellerConc5: number | undefined;
  const summaryLabels: Record<number, string> = {};

  // Extract Ticker from header if present (e.g. "Emiten: ANTM" or "+ ANTM" or "Ticker: ANTM" or "DSSA 1,055")
  const tickerMatch = cleanText.match(/(?:emiten|ticker|saham)\s*[:=]?\s*([A-Za-z]{4})/i) ||
                      cleanText.match(/^\s*\+\s*([A-Za-z]{4})\b/m) ||
                      cleanText.match(/^\s*([A-Za-z]{4})\s+[\d.,]+\s+[+\-]/m);
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

    // 2. Orderbook Price & Change (e.g. "DSSA 1,055 -35 (-3.21%)" or "1055 -35 (-3.21%)")
    const obPriceMatch = line.match(/(?:^|\s)([1-9][0-9.,]*)\s+([+\-][0-9.,]+)\s*\(([+\-]?[\d.,]+%?)\)/);
    if (obPriceMatch) {
      obLastPrice = parseIndoNumber(obPriceMatch[1]);
      obChange = parseIndoNumber(obPriceMatch[2]);
      obChangePercent = parseFloat(obPriceMatch[3].replace(/[%+]/g, '').replace(',', '.'));
      if (obPriceMatch[2].startsWith('-') && obChangePercent > 0) obChangePercent = -obChangePercent;
      continue;
    }

    // Open / High / Low / Prev
    const openMatch = line.match(/\bopen\s*[:=]?\s*([0-9.,]+)/i);
    if (openMatch) obOpen = parseIndoNumber(openMatch[1]);
    const highMatch = line.match(/\bhigh\s*[:=]?\s*([0-9.,]+)/i);
    if (highMatch) obHigh = parseIndoNumber(highMatch[1]);
    const lowMatch = line.match(/\blow\s*[:=]?\s*([0-9.,]+)/i);
    if (lowMatch) obLow = parseIndoNumber(lowMatch[1]);
    const prevMatch = line.match(/\bprev\s*[:=]?\s*([0-9.,]+)/i);
    if (prevMatch) obPrev = parseIndoNumber(prevMatch[1]);

    // Lot / Val / Avg / Freq in Orderbook Header
    const lotMatch = line.match(/\blot\s*[:=]?\s*([0-9.,]+[A-Za-z]*)/i);
    if (lotMatch && !line.toLowerCase().includes('bid') && !line.toLowerCase().includes('offer') && !line.toLowerCase().includes('b.lot') && !line.toLowerCase().includes('s.lot')) {
      obLot = parseIndoNumber(lotMatch[1]);
    }
    const valMatch = line.match(/\bval\s*[:=]?\s*([0-9.,]+[A-Za-z]*)/i);
    if (valMatch && !line.toLowerCase().includes('b.val') && !line.toLowerCase().includes('s.val')) {
      obVal = parseIndoNumber(valMatch[1]);
    }
    const avgMatch = line.match(/\bavg\s*[:=]?\s*([0-9.,]+)/i);
    if (avgMatch && !line.toLowerCase().includes('b.avg') && !line.toLowerCase().includes('s.avg')) {
      obAvg = parseIndoNumber(avgMatch[1]);
    }
    const freqMatch = line.match(/\bfreq\s*[:=]?\s*([0-9.,]+)/i);
    if (freqMatch && !line.toLowerCase().includes('lot')) {
      obFreq = parseIndoNumber(freqMatch[1]);
    }

    // Orderbook Foreign Buy & Foreign Sell (e.g. "F Buy 65.6 B F Sell 92.5 B")
    const fBuyMatch = line.match(/(?:f(?:oreign)?\.?\s*buy|f\s*buy|asing\s*beli)\s*[:=]?\s*([+\-]?\s*(?:Rp\.?\s*)?[\d.,]+\s*[A-Za-z]*)/i);
    if (fBuyMatch) {
      obForeignBuy = Math.abs(parseIndoNumber(fBuyMatch[1]));
    }
    const fSellMatch = line.match(/(?:f(?:oreign)?\.?\s*sell|f\s*sell|asing\s*jual)\s*[:=]?\s*([+\-]?\s*(?:Rp\.?\s*)?[\d.,]+\s*[A-Za-z]*)/i);
    if (fSellMatch) {
      obForeignSell = Math.abs(parseIndoNumber(fSellMatch[1]));
    }

    // Generic Foreign Flow extraction (for broksum text)
    const foreignMatch = line.match(
      /(?:foreign\s*(?:flow|net)?|asing\s*(?:net|flow)?)\s*[:=]?\s*(?:net\s*(?:buy|sell))?\s*([+\-]?\s*(?:Rp\.?\s*)?[+\-]?\s*[\d.,]+\s*(?:[A-Za-z]+)?)/i
    );
    if (foreignMatch && !line.toLowerCase().includes('f buy') && !line.toLowerCase().includes('f sell')) {
      let fRaw = foreignMatch[1].trim();
      if (/sell|jual/i.test(line) && !fRaw.includes('-')) {
        fRaw = '-' + fRaw;
      }
      foreignFlow = parseIndoNumber(fRaw);
      continue;
    }

    // Orderbook Total Bid & Total Offer lines
    const totalBidMatch = line.match(/(?:total\s*)?bid\s*(?:lot|vol)?\s*[:=]?\s*([\d.,]+[A-Za-z]*)/i);
    if (totalBidMatch && !line.toLowerCase().includes('offer') && !line.toLowerCase().includes('freq')) {
      obTotalBidLot = parseIndoNumber(totalBidMatch[1]);
    }
    const totalOfferMatch = line.match(/(?:total\s*)?offer\s*(?:lot|vol)?\s*[:=]?\s*([\d.,]+[A-Za-z]*)/i);
    if (totalOfferMatch && !line.toLowerCase().includes('bid') && !line.toLowerCase().includes('freq')) {
      obTotalOfferLot = parseIndoNumber(totalOfferMatch[1]);
    }

    // Orderbook Depth Row (6 tokens: FreqBid LotBid Bid Offer LotOffer FreqOffer)
    const depth6Match = line.match(/^\s*([\d.,]+)\s+([\d.,]+[A-Za-z]?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+[A-Za-z]?)\s+([\d.,]+)\s*$/);
    if (depth6Match && obDepthLevels.length < 10) {
      const bidFreq = parseIndoNumber(depth6Match[1]);
      const bidLot = parseIndoNumber(depth6Match[2]);
      const bidPrice = parseIndoNumber(depth6Match[3]);
      const offerPrice = parseIndoNumber(depth6Match[4]);
      const offerLot = parseIndoNumber(depth6Match[5]);
      const offerFreq = parseIndoNumber(depth6Match[6]);
      if (bidPrice > 0 && offerPrice > 0 && bidPrice <= offerPrice && (bidLot > 0 || offerLot > 0)) {
        obDepthLevels.push({ bidFreq, bidLot, bidPrice, offerPrice, offerLot, offerFreq });
        continue;
      }
    }

    // Orderbook 4-token row: Depth (LotBid PriceBid PriceOffer LotOffer) OR Summary Footer (FreqBid LotBid LotOffer FreqOffer)
    const ob4Match = line.match(/^\s*([\d.,]+[A-Za-z]?)\s+([\d.,]+)\s+([\d.,]+)\s+([\d.,]+[A-Za-z]?)\s*$/);
    if (ob4Match) {
      const v1 = parseIndoNumber(ob4Match[1]);
      const v2 = parseIndoNumber(ob4Match[2]);
      const v3 = parseIndoNumber(ob4Match[3]);
      const v4 = parseIndoNumber(ob4Match[4]);

      // If middle two tokens look like Bid Price & Offer Price (v2 <= v3 and spread <= 10%)
      if (v2 > 0 && v3 > 0 && v2 <= v3 && ((v3 - v2) / v2) <= 0.10) {
        if (obDepthLevels.length < 10) {
          obDepthLevels.push({ bidLot: v1, bidPrice: v2, offerPrice: v3, offerLot: v4 });
        }
        continue;
      }

      // Otherwise, if outer two are Freq and inner two are Total Lots:
      if (v2 >= 500 && v3 >= 500 && !obTotalBidLot && !obTotalOfferLot) {
        obTotalBidFreq = v1;
        obTotalBidLot = v2;
        obTotalOfferLot = v3;
        obTotalOfferFreq = v4;
        continue;
      }
    }

    // Total Traded Value / Turnover
    const totalValMatch = line.match(
      /(?:total\s*(?:traded\s*value|turnover|transaksi)|turnover|nilai\s*transaksi|net\s*value)\s*[:=]?\s*(?:Rp\.?\s*)?([\d.,]+\s*(?:[A-Za-z]+)?)/i
    );
    if (totalValMatch && !line.toLowerCase().includes('f buy') && !line.toLowerCase().includes('f sell')) {
      totalTradedValue = parseIndoNumber(totalValMatch[1]);
      continue;
    }

    // Section Headers
    if (/^(?:top\s*(?:net\s*)?buyers?|buyers?|pembeli)/i.test(line) && !/sellers?|penjual/i.test(line)) {
      currentSection = 'BUY';
      continue;
    }
    if (/^(?:top\s*(?:net\s*)?sellers?|sellers?|penjual)/i.test(line) && !/buyers?|pembeli/i.test(line)) {
      currentSection = 'SELL';
      continue;
    }

    // Broker Count Line (e.g. "6 BUYER 22 SELLER" or "Total Buyer: 6, Total Seller: 22")
    const brokerCountMatch = line.match(/(\d+)\s*(?:buyers?|pembeli)\s*[:,\s|/]+\s*(\d+)\s*(?:sellers?|penjual)/i) ||
                             line.match(/(?:buyers?|pembeli)\s*[:=]?\s*(\d+)\s*[:,\s|/]+\s*(?:sellers?|penjual)\s*[:=]?\s*(\d+)/i) ||
                             line.match(/total\s*(?:buyers?|pembeli)\s*[:=]\s*(\d+).*?total\s*(?:sellers?|penjual)\s*[:=]\s*(\d+)/i);
    if (brokerCountMatch) {
      explicitBuyerCount = parseInt(brokerCountMatch[1]);
      explicitSellerCount = parseInt(brokerCountMatch[2]);
      continue;
    }

    // Summary Rows: Top 1, Top 3, Top 5
    // Format A (Stockbit Dual side): "TOP 1: 0.1B (52.2%) / 0.1B (34.5%)"
    // Format B (Net Val + Label): "Top 1: -8.1B (Small Dist)" or "Top 3: +0.6B (Acc)"
    // Format C (Label only): "Top 1: Small Acc"
    const topSummaryMatch = line.match(/^top\s*([135])\s*[:=]\s*(.+)$/i);
    if (topSummaryMatch) {
      const n = parseInt(topSummaryMatch[1]) as 1 | 3 | 5;
      const rest = topSummaryMatch[2].trim();

      const dualMatch = rest.match(/([+\-]?[\d.,]+[A-Za-z]*)\s*\(([\d.,]+)%\)\s*[/|]\s*([+\-]?[\d.,]+[A-Za-z]*)\s*\(([\d.,]+)%\)/i);
      if (dualMatch) {
        const bVal = parseIndoNumber(dualMatch[1]);
        const bConc = parseFloat(dualMatch[2].replace(',', '.'));
        const sVal = parseIndoNumber(dualMatch[3]);
        const sConc = parseFloat(dualMatch[4].replace(',', '.'));
        const netVal = bVal - sVal;

        if (n === 1) {
          summaryTop1Val = netVal;
          summaryBuyerConc1 = bConc;
          summarySellerConc1 = sConc;
        } else if (n === 3) {
          summaryTop3Val = netVal;
          summaryBuyerConc3 = bConc;
          summarySellerConc3 = sConc;
        } else if (n === 5) {
          summaryTop5Val = netVal;
          summaryBuyerConc5 = bConc;
          summarySellerConc5 = sConc;
        }
        continue;
      }

      const valLabelMatch = rest.match(/^([+\-]?[\d.,]+[A-Za-z]*)\s*(?:\(([^)]+)\))?$/);
      if (valLabelMatch) {
        const val = parseIndoNumber(valLabelMatch[1]);
        const lbl = valLabelMatch[2]?.trim();
        if (n === 1) {
          summaryTop1Val = val;
          if (lbl) summaryLabels[1] = lbl;
        } else if (n === 3) {
          summaryTop3Val = val;
          if (lbl) summaryLabels[3] = lbl;
        } else if (n === 5) {
          summaryTop5Val = val;
          if (lbl) summaryLabels[5] = lbl;
        }
        continue;
      }

      if (/^(?:big\s*acc(?:umulation)?|normal\s*acc(?:umulation)?|small\s*acc(?:umulation)?|acc(?:umulation)?|neutral|small\s*dist(?:ribution)?|normal\s*dist(?:ribution)?|big\s*dist(?:ribution)?|dist(?:ribution)?)$/i.test(rest)) {
        summaryLabels[n] = rest;
        continue;
      }
    }

    // Ignore tabular headers
    const tokens = line.split(/[\t\s]+/).filter(Boolean);
    if (tokens.some((t) => /^(?:BUYER|SELLER|B\.LOT|S\.LOT|B\.VAL|S\.VAL|B\.AVG|S\.AVG|BROKER|BY|SL|BID|OFFER)$/i.test(t))) {
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

  const hasOrderbook = Boolean(
    (obTotalBidLot && obTotalOfferLot) ||
    obForeignBuy !== undefined ||
    obForeignSell !== undefined ||
    obLastPrice !== undefined
  );

  const hasSummary =
    summaryTop1Val !== undefined ||
    summaryTop3Val !== undefined ||
    summaryTop5Val !== undefined ||
    Boolean(summaryLabels[1] || summaryLabels[3] || summaryLabels[5]);

  if (aggBuyers.length === 0 && aggSellers.length === 0 && !hasOrderbook && !hasSummary) {
    return createEmptyBroksumResult(ticker);
  }

  // Calculate Orderbook & Tape Reading Stats
  let bidOfferRatio = (obTotalBidLot && obTotalOfferLot && obTotalOfferLot > 0)
    ? Math.round((obTotalBidLot / obTotalOfferLot) * 100) / 100
    : undefined;
  let netForeignIntraday = (obForeignBuy !== undefined && obForeignSell !== undefined)
    ? obForeignBuy - obForeignSell
    : undefined;
  let orderbookPosture: OrderbookStats['orderbookPosture'] = 'BALANCED';
  let tapeReadingSignal = '';

  if (bidOfferRatio !== undefined) {
    if (bidOfferRatio <= 0.45) {
      orderbookPosture = 'HEAVY_OFFER_SUPPRESSION';
      tapeReadingSignal = `Heavy Offer Wall Pressure: Total antrean Offer (${formatDotNumber(obTotalOfferLot)} lot) lebih dari 2.2x lipat Bid (${formatDotNumber(obTotalBidLot)} lot, Rasio ${bidOfferRatio}x). Mengindikasikan penekanan harga jual / pasokan melimpah di atas.`;
    } else if (bidOfferRatio <= 0.8) {
      orderbookPosture = 'MODERATE_OFFER';
      tapeReadingSignal = `Moderate Offer Dominance: Sisi penawaran (Offer) lebih tebal dari sisi permintaan (Bid, Rasio ${bidOfferRatio}x).`;
    } else if (bidOfferRatio >= 2.2) {
      orderbookPosture = 'STRONG_BID_CUSHION';
      tapeReadingSignal = `Strong Bid Cushion: Antrean beli Bid (${formatDotNumber(obTotalBidLot)} lot) mendominasi lebih dari 2.2x lipat Offer (${formatDotNumber(obTotalOfferLot)} lot, Rasio ${bidOfferRatio}x). Mengindikasikan bantalan penahan harga kuat atau penyerapan agresif.`;
    } else if (bidOfferRatio >= 1.25) {
      orderbookPosture = 'MODERATE_BID';
      tapeReadingSignal = `Moderate Bid Support: Pembeli menyusun antrean penahan di sisi Bid lebih banyak dari Offer (Rasio ${bidOfferRatio}x).`;
    } else {
      orderbookPosture = 'BALANCED';
      tapeReadingSignal = `Balanced Orderbook: Kedalaman antrean Bid dan Offer relatif seimbang (Rasio ${bidOfferRatio}x).`;
    }
  }

  // Tape reading depth walls detection
  if (obDepthLevels.length > 0 && obTotalBidLot && obTotalOfferLot) {
    const maxBidLevel = obDepthLevels.reduce((max, d) => (d.bidLot && d.bidLot > (max.bidLot || 0) ? d : max), obDepthLevels[0]);
    const maxOfferLevel = obDepthLevels.reduce((max, d) => (d.offerLot && d.offerLot > (max.offerLot || 0) ? d : max), obDepthLevels[0]);
    if (maxBidLevel.bidLot && maxBidLevel.bidLot / obTotalBidLot >= 0.35 && maxBidLevel.bidPrice) {
      tapeReadingSignal += ` Tembok Penahan (Bid Wall): Antrean tebal di Rp ${formatDotNumber(maxBidLevel.bidPrice)} (${formatDotNumber(maxBidLevel.bidLot)} lot, ${Math.round((maxBidLevel.bidLot / obTotalBidLot) * 100)}% dari total Bid).`;
    }
    if (maxOfferLevel.offerLot && maxOfferLevel.offerLot / obTotalOfferLot >= 0.35 && maxOfferLevel.offerPrice) {
      tapeReadingSignal += ` Tembok Pasokan (Offer Wall): Antrean tebal di Rp ${formatDotNumber(maxOfferLevel.offerPrice)} (${formatDotNumber(maxOfferLevel.offerLot)} lot, ${Math.round((maxOfferLevel.offerLot / obTotalOfferLot) * 100)}% dari total Offer).`;
    }
  }

  const orderbookStats: OrderbookStats | undefined = hasOrderbook
    ? {
        hasOrderbook: true,
        lastPrice: obLastPrice,
        change: obChange,
        changePercent: obChangePercent,
        open: obOpen,
        high: obHigh,
        low: obLow,
        prev: obPrev,
        avg: obAvg,
        totalLot: obLot,
        totalValue: obVal,
        totalFreq: obFreq,
        foreignBuy: obForeignBuy,
        foreignSell: obForeignSell,
        netForeignIntraday,
        totalBidLot: obTotalBidLot,
        totalOfferLot: obTotalOfferLot,
        totalBidFreq: obTotalBidFreq,
        totalOfferFreq: obTotalOfferFreq,
        bidOfferRatio,
        orderbookPosture,
        tapeReadingSignal,
        depthLevels: obDepthLevels,
      }
    : undefined;

  // Calculate Totals & Concentrations
  const totalBuyerVal = aggBuyers.reduce((sum, b) => sum + b.value, 0);
  const totalSellerVal = aggSellers.reduce((sum, s) => sum + s.value, 0);

  const calcConc = (arr: BrokerItem[], total: number, n: number): number => {
    if (!total || total === 0) return 0;
    const topNVal = arr.slice(0, n).reduce((sum, item) => sum + item.value, 0);
    return Math.round((topNVal / total) * 1000) / 10;
  };

  const buyerConc: ConcentrationStats = {
    top1: summaryBuyerConc1 ?? calcConc(aggBuyers, totalBuyerVal, 1),
    top3: summaryBuyerConc3 ?? calcConc(aggBuyers, totalBuyerVal, 3),
    top5: summaryBuyerConc5 ?? calcConc(aggBuyers, totalBuyerVal, 5),
  };

  const sellerConc: ConcentrationStats = {
    top1: summarySellerConc1 ?? calcConc(aggSellers, totalSellerVal, 1),
    top3: summarySellerConc3 ?? calcConc(aggSellers, totalSellerVal, 3),
    top5: summarySellerConc5 ?? calcConc(aggSellers, totalSellerVal, 5),
  };

  // Bandar Value (Top 3 & Top 5)
  const top3BuyerVal = aggBuyers.slice(0, 3).reduce((s, b) => s + b.value, 0);
  const top3SellerVal = aggSellers.slice(0, 3).reduce((s, b) => s + b.value, 0);
  const calculatedBv3 = top3BuyerVal - top3SellerVal;
  const bandarValue3 = summaryTop3Val ?? (calculatedBv3 !== 0 ? calculatedBv3 : (summaryTop5Val ?? summaryTop1Val ?? 0));

  const top5BuyerVal = aggBuyers.slice(0, 5).reduce((s, b) => s + b.value, 0);
  const top5SellerVal = aggSellers.slice(0, 5).reduce((s, b) => s + b.value, 0);
  const calculatedBv5 = top5BuyerVal - top5SellerVal;
  const bandarValue5 = summaryTop5Val ?? (calculatedBv5 !== 0 ? calculatedBv5 : bandarValue3);

  // Retail vs Smart Money (Institusi / Asing / BUMN)
  const retailBuyers = aggBuyers.filter((b) => isBrokerRetailHeavy(b.broker));
  const retailSellers = aggSellers.filter((s) => isBrokerRetailHeavy(s.broker));
  const retailNetBuyVal = retailBuyers.reduce((s, b) => s + b.value, 0) - retailSellers.reduce((s, b) => s + b.value, 0);

  const instBuyers = aggBuyers.filter((b) => isBrokerInstitutional(b.broker));
  const instSellers = aggSellers.filter((s) => isBrokerInstitutional(s.broker));
  const instNetBuyVal = instBuyers.reduce((s, b) => s + b.value, 0) - instSellers.reduce((s, b) => s + b.value, 0);

  // Scoring (-100 to +100)
  let score = 0;
  const maxTopVal = Math.max(top3BuyerVal, top3SellerVal, Math.abs(bandarValue3), 1);
  const bvRatio = bandarValue3 / maxTopVal;
  score += Math.max(-40, Math.min(40, Math.round(bvRatio * 40)));

  const concDelta = buyerConc.top3 - sellerConc.top3;
  score += Math.max(-30, Math.min(30, Math.round(concDelta * 0.75)));

  if (instNetBuyVal > 0 && retailNetBuyVal < 0) score += 20;
  else if (instNetBuyVal < 0 && retailNetBuyVal > 0) score -= 20;
  else if (instNetBuyVal > 0) score += 10;
  else if (instNetBuyVal < 0) score -= 10;

  // Fallback foreign flow from intraday orderbook if not explicitly stated in broksum text
  if (foreignFlow === null && netForeignIntraday !== undefined) {
    foreignFlow = netForeignIntraday;
  }

  if (foreignFlow !== null) {
    if (foreignFlow > 0) score += 10;
    else if (foreignFlow < 0) score -= 10;
  }

  // Orderbook Posture Factor (Real-time Tape Reading confirmation)
  if (orderbookPosture === 'STRONG_BID_CUSHION') {
    score += 10;
  } else if (orderbookPosture === 'HEAVY_OFFER_SUPPRESSION') {
    score -= 10;
  }

  // Participation Asymmetry Factor (Few buyers accumulating from many sellers = Accumulation)
  const effectiveBuyerCount = explicitBuyerCount ?? (aggBuyers.length > 0 ? aggBuyers.length : undefined);
  const effectiveSellerCount = explicitSellerCount ?? (aggSellers.length > 0 ? aggSellers.length : undefined);
  if (effectiveBuyerCount !== undefined && effectiveSellerCount !== undefined && effectiveBuyerCount > 0 && effectiveSellerCount > 0) {
    const pRatio = effectiveBuyerCount / effectiveSellerCount;
    if (pRatio <= 0.5) score += 10;
    else if (pRatio >= 2.0) score -= 10;
  }

  // If only summary rows were provided (no individual broker items)
  if (aggBuyers.length === 0 && aggSellers.length === 0 && hasSummary) {
    const summaryRefLabel = summaryLabels[3] || summaryLabels[5] || summaryLabels[1] || '';
    if (/big\s*acc/i.test(summaryRefLabel)) score = 65;
    else if (/normal\s*acc|^acc/i.test(summaryRefLabel)) score = 35;
    else if (/small\s*acc/i.test(summaryRefLabel)) score = 25;
    else if (/neutral/i.test(summaryRefLabel)) score = 0;
    else if (/small\s*dist/i.test(summaryRefLabel)) score = -25;
    else if (/normal\s*dist|^dist/i.test(summaryRefLabel)) score = -35;
    else if (/big\s*dist/i.test(summaryRefLabel)) score = -65;
    else if (bandarValue3 > 0) score = 30;
    else if (bandarValue3 < 0) score = -30;
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
  if (totalBuyerVal === 0 && totalSellerVal === 0 && hasSummary) confidence = 0.75;
  else if (totalBuyerVal === 0 && totalSellerVal === 0) confidence = 0.1;

  // Analytical Reasons
  const reasons: string[] = [];
  if (bandarValue3 !== 0) {
    const bvFormatted = formatRupiahShort(bandarValue3);
    reasons.push(
      `Bandar Value (Top 3) bernilai ${bvFormatted} (${
        bandarValue3 > 0 ? 'Net Buyer lebih dominan daripada Seller' : 'Net Seller lebih dominan daripada Buyer'
      }).`
    );
  }
  if (buyerConc.top3 > 0 || sellerConc.top3 > 0) {
    reasons.push(
      `Konsentrasi Buyer Top 3 sebesar ${buyerConc.top3}% vs Seller Top 3 sebesar ${sellerConc.top3}% (delta ${
        concDelta > 0 ? '+' : ''
      }${concDelta.toFixed(1).replace('.', ',')}%).`
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

  // Participation Asymmetry Reason
  if (effectiveBuyerCount !== undefined && effectiveSellerCount !== undefined && effectiveBuyerCount > 0 && effectiveSellerCount > 0) {
    const pRatio = effectiveBuyerCount / effectiveSellerCount;
    if (pRatio <= 0.5) {
      reasons.push(
        `Partisipasi Asimetris: Terdeteksi konsentrasi beli tinggi (${effectiveBuyerCount} Buyer menyerap pasokan dari ${effectiveSellerCount} Seller, rasio ${formatDotNumber(pRatio, 2)}x). Mengindikasikan akumulasi ke tangan yang lebih sedikit.`
      );
    } else if (pRatio >= 2.0) {
      reasons.push(
        `Partisipasi Asimetris: Terdeteksi dispersi jual (${effectiveBuyerCount} Buyer menampung barang dari hanya ${effectiveSellerCount} Seller, rasio ${formatDotNumber(pRatio, 2)}x). Mengindikasikan distribusi ke publik.`
      );
    } else {
      reasons.push(
        `Partisipasi Broker: Terdata ${effectiveBuyerCount} Buyer berhadapan dengan ${effectiveSellerCount} Seller.`
      );
    }
  }

  // Summary Row Reason if broker items were empty
  if (aggBuyers.length === 0 && aggSellers.length === 0 && hasSummary) {
    reasons.push(
      `Ringkasan Bandarmology (Top N): Bandar Value Top 3 tercatat ${formatRupiahShort(bandarValue3)} dengan status ${label}.`
    );
  }

  if (foreignFlow !== null && foreignFlow !== 0) {
    reasons.push(`Net Foreign Flow tercatat ${formatRupiahShort(foreignFlow)}.`);
  }

  if (orderbookStats && orderbookStats.tapeReadingSignal) {
    reasons.push(orderbookStats.tapeReadingSignal);
  }
  if (netForeignIntraday !== undefined) {
    reasons.push(
      `Intraday Foreign Flow: Foreign Buy ${formatRupiahShort(obForeignBuy || 0)} vs Foreign Sell ${formatRupiahShort(obForeignSell || 0)} (Net Asing: ${formatRupiahShort(netForeignIntraday)}).`
    );
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
    orderbook: orderbookStats,
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
    orderbook: undefined,
    reasons: [],
    openApiBroksum: {},
    openApiBandarmology: {},
  };
}
