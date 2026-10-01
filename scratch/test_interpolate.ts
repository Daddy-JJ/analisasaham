import { addTradingDays } from '../lib/elliott-wave';

// Helper to generate all trading days between startDate and endDate
function getTradingDaysRange(startDateStr: string, totalDays: number): string[] {
  const days: string[] = [];
  let current = startDateStr;
  for (let i = 0; i < totalDays; i++) {
    current = addTradingDays(current, 1);
    days.push(current);
  }
  return days;
}

// Generate smooth trajectory between two points
function interpolateWaveSegment(
  startDate: string,
  startPrice: number,
  endDate: string,
  endPrice: number,
  tradingDaysCount: number
): { time: string; value: number }[] {
  const dates = getTradingDaysRange(startDate, tradingDaysCount);
  const points: { time: string; value: number }[] = [];
  
  for (let i = 0; i < dates.length; i++) {
    const t = (i + 1) / dates.length;
    // Smooth cosine or linear interpolation
    const easeT = 0.5 * (1 - Math.cos(t * Math.PI));
    const price = Math.round(startPrice + (endPrice - startPrice) * easeT);
    points.push({ time: dates[i], value: price });
  }
  return points;
}

const latestDate = '2026-10-01';
const currentPrice = 1445;
const p3Price = 2280;
const p4Price = 1950;
const p5Price = 2470;

const seg1 = interpolateWaveSegment(latestDate, currentPrice, '', p3Price, 12);
const lastDate1 = seg1[seg1.length - 1].time;
const seg2 = interpolateWaveSegment(lastDate1, p3Price, '', p4Price, 10);
const lastDate2 = seg2[seg2.length - 1].time;
const seg3 = interpolateWaveSegment(lastDate2, p4Price, '', p5Price, 15);

const fullProjected = [
  { time: latestDate, value: currentPrice },
  ...seg1,
  ...seg2,
  ...seg3,
];

console.log('Total projected points:', fullProjected.length);
console.log('First point:', fullProjected[0]);
console.log('P3 point (day 12):', seg1[seg1.length - 1]);
console.log('P4 point (day 22):', seg2[seg2.length - 1]);
console.log('P5 point (day 37):', seg3[seg3.length - 1]);
