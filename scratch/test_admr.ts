import { fetchStockData } from '../lib/yahoo-finance';
import { addTradingDays } from '../lib/elliott-wave';

function getTradingDaysRange(startDateStr: string, totalDays: number): string[] {
  const days: string[] = [];
  let current = startDateStr;
  for (let i = 0; i < totalDays; i++) {
    current = addTradingDays(current, 1);
    days.push(current);
  }
  return days;
}

function interpolateWaveSegment(
  startDate: string,
  startPrice: number,
  tradingDaysCount: number,
  endPrice: number
): { time: string; value: number }[] {
  const dates = getTradingDaysRange(startDate, tradingDaysCount);
  const points: { time: string; value: number }[] = [];
  for (let i = 0; i < dates.length; i++) {
    const t = (i + 1) / dates.length;
    const easeT = 0.5 * (1 - Math.cos(t * Math.PI));
    const price = Math.round(startPrice + (endPrice - startPrice) * easeT);
    points.push({ time: dates[i], value: price });
  }
  return points;
}

async function run() {
  const data = await fetchStockData('ADMR');
  if (!data?.bars) return;
  const validBars = data.bars.slice(-180);
  const n = validBars.length;
  const currentPrice = data.price || validBars[n - 1].close;
  const latestDate = validBars[n - 1].time;

  // Swings
  const window = Math.max(5, Math.min(10, Math.floor(n / 20)));
  const swingLows: { index: number; time: string; price: number }[] = [];
  const swingHighs: { index: number; time: string; price: number }[] = [];

  for (let i = window; i < n - window; i++) {
    const isLow = validBars.slice(i - window, i + window + 1).every((b) => b.low >= validBars[i].low);
    const isHigh = validBars.slice(i - window, i + window + 1).every((b) => b.high <= validBars[i].high);
    if (isLow) swingLows.push({ index: i, time: validBars[i].time, price: validBars[i].low });
    if (isHigh) swingHighs.push({ index: i, time: validBars[i].time, price: validBars[i].high });
  }

  const overallMin = validBars.reduce((min, b, idx) => (b.low < min.price ? { index: idx, time: b.time, price: b.low } : min), { index: 0, time: validBars[0].time, price: validBars[0].low });
  const overallMax = validBars.reduce((max, b, idx) => (b.high > max.price ? { index: idx, time: b.time, price: b.high } : max), { index: 0, time: validBars[0].time, price: validBars[0].high });

  let p0Candidate = swingLows.length > 0
    ? swingLows.slice(0, Math.max(1, Math.floor(swingLows.length * 0.6))).reduce((min, s) => (s.price < min.price ? s : min), swingLows[0])
    : overallMin;

  const highsAfterP0 = swingHighs.filter((h) => h.index > p0Candidate.index);
  let p1Candidate = highsAfterP0.length > 0
    ? highsAfterP0.reduce((max, s) => (s.price > max.price ? s : max), highsAfterP0[0])
    : overallMax;

  // New P2 logic: lowest low of ALL bars after P1!
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

  console.log('P0 Candidate:', p0Candidate);
  console.log('P1 Candidate:', p1Candidate);
  console.log('P2 Candidate (lowest after P1):', p2Candidate);

  const wave1Length = Math.max(1, p1Candidate.price - p0Candidate.price);
  const wave2Drop = p1Candidate.price - p2Candidate.price;
  const wave2RetracePercent = Number(((wave2Drop / wave1Length) * 100).toFixed(1));
  const w3TargetPrice = Math.round(p2Candidate.price + 1.618 * wave1Length);

  let invalidationLevel: number;
  if (currentPrice > p2Candidate.price) {
    const buffer = Math.max(10, Math.round(p2Candidate.price * 0.02));
    invalidationLevel = Math.round(p2Candidate.price - buffer);
  } else {
    invalidationLevel = Math.round(p0Candidate.price);
  }

  const risk = Math.max(5, currentPrice - invalidationLevel);
  const reward = Math.max(5, w3TargetPrice - currentPrice);
  const rr = (reward / risk).toFixed(1).replace('.', ',');

  console.log('Wave 2 Retrace %:', wave2RetracePercent);
  console.log('Target W3:', w3TargetPrice);
  console.log('Invalidation Level:', invalidationLevel);
  console.log('Risk:', risk, 'Reward:', reward);
  console.log('R:R Ratio:', `1 : ${rr}`);
}
run();
