import { fetchStockData } from '../lib/yahoo-finance';
import { calculateElliottWaveProjections } from '../lib/elliott-wave';

async function test() {
  const d = await fetchStockData('ADRO');
  console.log('ADRO bars:', d?.bars?.length);
  if (d?.bars) {
    const ew = calculateElliottWaveProjections(d.bars, 'ADRO', d.price);
    console.log('P0:', ew?.p0);
    console.log('P1:', ew?.p1);
    console.log('P2:', ew?.p2);
    console.log('Historical Path:', ew?.historicalPath);
    console.log('Projected Path length:', ew?.projectedPath.length);
    console.log('Projected Path first 3:', ew?.projectedPath.slice(0, 3));
    console.log('Projected Path last 3:', ew?.projectedPath.slice(-3));

    // Verify historical path strict ascending
    if (ew?.historicalPath) {
      for (let i = 1; i < ew.historicalPath.length; i++) {
        if (ew.historicalPath[i].time <= ew.historicalPath[i - 1].time) {
          console.error('ERROR: historicalPath not ascending at', i, ew.historicalPath[i - 1].time, ew.historicalPath[i].time);
        }
      }
      console.log('historicalPath check PASSED!');
    }

    // Verify projected path strict ascending
    if (ew?.projectedPath) {
      for (let i = 1; i < ew.projectedPath.length; i++) {
        if (ew.projectedPath[i].time <= ew.projectedPath[i - 1].time) {
          console.error('ERROR: projectedPath not ascending at', i, ew.projectedPath[i - 1].time, ew.projectedPath[i].time);
        }
      }
      console.log('projectedPath check PASSED!');
    }
  }
}
test();
