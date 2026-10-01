import { fetchStockData } from '../lib/yahoo-finance';
import { calculateElliottWaveProjections } from '../lib/elliott-wave';

async function testAll() {
  const tickers = ['ADMR', 'BBCA', 'TLKM', 'BMRI', 'ASII'];
  for (const t of tickers) {
    const d = await fetchStockData(t);
    if (!d?.bars) continue;
    const ew = calculateElliottWaveProjections(d.bars, t, d.price);
    if (!ew) continue;
    for (let i = 1; i < ew.historicalPath.length; i++) {
      if (ew.historicalPath[i].time <= ew.historicalPath[i - 1].time) {
        throw new Error(`${t} historicalPath not ascending at ${i}`);
      }
    }
    for (let i = 1; i < ew.projectedPath.length; i++) {
      if (ew.projectedPath[i].time <= ew.projectedPath[i - 1].time) {
        throw new Error(`${t} projectedPath not ascending at ${i}`);
      }
    }
    console.log(`Ticker ${t}: OK! P0=${ew.p0.price}, P1=${ew.p1.price}, P2=${ew.p2.price}, RR=${ew.riskRewardRatio}`);
  }
}
testAll();
