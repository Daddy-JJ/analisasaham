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

const latestDate = '2026-10-01';
const currentPrice = 1445;
const w3TargetPrice = 2280;
const w4TargetPrice = 1950;
const w5TargetPrice = 2470;

const p3Time = addTradingDays(latestDate, 12);
const p4Time = addTradingDays(p3Time, 10);
const p5Time = addTradingDays(p4Time, 15);

const seg1 = interpolateWaveSegment(latestDate, currentPrice, 12, w3TargetPrice);
const seg2 = interpolateWaveSegment(p3Time, w3TargetPrice, 10, w4TargetPrice);
const seg3 = interpolateWaveSegment(p4Time, w4TargetPrice, 15, w5TargetPrice);

const projectedPath = [
  { time: latestDate, value: currentPrice },
  ...seg1,
  ...seg2,
  ...seg3,
];

console.log('Total points:', projectedPath.length);
let isAscending = true;
for (let i = 1; i < projectedPath.length; i++) {
  if (projectedPath[i].time <= projectedPath[i - 1].time) {
    console.error('NOT ASCENDING AT:', i, projectedPath[i - 1].time, projectedPath[i].time);
    isAscending = false;
  }
}
console.log('Is strictly ascending without duplicates?', isAscending);
console.log('P3 target matches?', seg1[seg1.length - 1].time === p3Time, seg1[seg1.length - 1].value === w3TargetPrice);
console.log('P4 target matches?', seg2[seg2.length - 1].time === p4Time, seg2[seg2.length - 1].value === w4TargetPrice);
console.log('P5 target matches?', seg3[seg3.length - 1].time === p5Time, seg3[seg3.length - 1].value === w5TargetPrice);
