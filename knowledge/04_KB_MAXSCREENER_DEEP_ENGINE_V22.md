# 04_KB_MAXSCREENER_DEEP_ENGINE_V22

## Routing
Aktif jika user menyebut MaxScreener/maxscrener/hasil screening/sinyal MaX atau sinyal seperti SMART SNIPER, SMART GAMMA, G ACC, BETA BREAKOUT, V-SHAPE, EARLY SWEEP.

## Endpoint awal
```json
{"filter":"signals","sort":"score_desc","limit":50,"format":"json"}
```

Jika ticker disebut:
```json
{"ticker":"<TICKER>","filter":"signals","sort":"score_desc","limit":50,"format":"json"}
```

Setelah ticker dipilih/terdeteksi:
```json
{"ticker":"<TICKER>","format":"file_url"}
```

## Field wajib dibaca
ticker, price, changePct, signal, signalGroup, activeSignal, activeSignals, regime, quadrant, rvol, ageDays, score, strategy, buy1-buy4, weight1-weight4 jika tersedia, lot1-lot4 jika tersedia, avgEntry, riskBuy1Pct, riskAvgPct, rewardRisk, rewardRiskBuy1, rewardRiskAvg, historyQuality.

## Signal anatomy
1. Trend: EMA21/50/200, supertrend/stop line.
2. Momentum: RSI, MACD, RSI cross 50, candle quality.
3. Location: demand, discount, premium, FVG/imbalance.
4. Volume/VPA: rvol, spike, churning, breakout/pullback.
5. Regime/quadrant: RISEN, LEADING/IMPROVING/WEAKENING/LAGGING.
6. Freshness: ageDays dan jarak harga dari buy area.
7. Risk/reward: buy grid, stop/invalidation, reward-risk.

## Definisi sinyal
- SMART SNIPER: Sniper Combo yang lolos proteksi RISEN.
- BETA BREAKOUT: trend flip + RSI ok + premium zone + volume + candle ok.
- V-SHAPE: reversal dari low dengan candle dan volume kuat.
- SMART GAMMA: Gamma momentum dikonfirmasi RISEN breakout/squeeze.
- G ACC: Gamma susulan dengan harga lebih tinggi dari gamma sebelumnya.
- EARLY SWEEP: sweep liquidity + RSI divergence + valid candle/location.
- HOLD: uptrend tanpa sinyal entry baru.
- AVOID/FILTERED: downtrend, lagging, atau gagal filter.

## Buy grid dan bobot
Jika endpoint memberi weight1-weight4, gunakan angka itu.
Jika tidak ada weight tapi ada strategy, infer:
- Full Grid: 10/20/30/40
- Extreme Dip: 0/0/40/60
- Sweet Spot: 0/40/60/0
- Mid-Reversal: 0/35/0/65
- Deep Value: 15/0/35/50
- The Gap: 15/25/0/60
- Sniper: 30/0/70/0
- Aggressive: 40/60/0/0
Jika strategy tidak tersedia, tulis bobot tidak tersedia.

## Grade
A+ ELITE, A HIGH QUALITY, B WATCHLIST VALID, C SPECULATIVE, D AVOID/LATE ENTRY.

## Output wajib
Snapshot screener, anatomi sinyal, validasi EOD, buy grid harga+bobot+lot/status, risk/reward, grade, keputusan.
