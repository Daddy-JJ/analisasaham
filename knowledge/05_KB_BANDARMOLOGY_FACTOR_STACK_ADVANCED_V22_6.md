# 05_KB_BANDARMOLOGY_FACTOR_STACK_ADVANCED_V22_6

## Tujuan
Memperkuat analisa bandarmologi dengan endpoint baru `/api/bandarmology/*` dan endpoint Broksum Advanced Trader.

V22.6 menggantikan:
- `05_KB_BROKSUM_ADVANCED_TRADER_V22_5.md`
- `05_KB_BROKSUM_FILEURL_LARGE_PHASE3_V22_4.md`
- `05_KB_BROKSUM_JSON_CHUNKING_PHASE3_V22.md`

---

## 1. Prinsip Utama
Analisa bandarmologi tidak boleh hanya membaca top buyer/top seller. Gunakan **Factor Stack**:

1. **Foreign Flow Layer**
   - Apakah asing sedang akumulasi/distribusi?
   - Apakah flow makin kuat dibanding MA?
   - Apakah net foreign buy/sell punya streak?

2. **Bandar Value Layer**
   - Apakah top broker buyer lebih kuat dari top broker seller?
   - Apakah Bandar Value di atas/bawah MA10/MA20?
   - Apakah Bandar Value hari ini naik/turun dari hari sebelumnya?

3. **Broker Flow Layer**
   - Siapa top accumulator/distributor?
   - Apakah broker flow konsisten?
   - Apakah concentration sehat atau terlalu ekstrem?

4. **Absorption / Churn Layer**
   - Apakah ada quiet accumulation?
   - Apakah volume besar diserap?
   - Apakah churn berarti supply digestion atau distribusi?

5. **Rotation Layer**
   - Broker mana yang flip, accelerate, fade, atau reverse?

6. **Price Confirmation Layer**
   - Price action, volume, value, frequency, NBSA, support-resistance.

---

## 2. Format Rule
### Data besar/panjang wajib `format=file_url`
Gunakan untuk:
- getBandarmologyTickerFactors range panjang/mendalam
- getBandarmologyForeignFlowMa range panjang
- getBandarmologyNetForeignMa range panjang
- getBandarmologyNetForeignStreak range panjang
- getBandarmologyBandarValueMa range panjang
- getBroksumTickerHistory detail
- getBroksumTickerBrokers detail
- getBroksumTickerAbsorption range panjang
- getBroksumTickerRotation range panjang
- getBroksumMarketPressure limit besar
- getBroksumRaw besar
- exportBroksumData

### Data kecil/ringkasan boleh `format=json`
Gunakan untuk:
- getBandarmologyNetForeignFlow period 1w/1m/3m ringkas
- getBandarmologyPreviousBandarValue
- getBandarmologyForeignFlowMa / NetForeignMa / BandarValueMa jika hanya cek cepat
- getBroksumTickerInsight
- getBroksumSignal
- getBroksumAvailability
- compare ringkas

### `format=csv`
Hanya fallback inline jika file_url gagal.

---

## 3. Endpoint Bandarmology Factor

### A. All Ticker Factors
OperationId: `getBandarmologyTickerFactors`

Fungsi:
Mengambil faktor harian lengkap satu ticker: foreign flow, net foreign MA10/MA20, foreign flow MA20/MA50, net foreign streak, Bandar Value MA10/MA20, previous Bandar Value, dan range net foreign flow.

Gunakan untuk:
- analisa bandarmologi mendalam satu saham
- Fase 3 EW mendalam
- MaxScreener confirmation mendalam
- rekap 1 bulan/3 bulan

Template:
```json
{"ticker":"<TICKER>","startDate":"<START>","endDate":"<END>","topN":3,"format":"file_url"}
```

### B. Foreign Flow MA
OperationId: `getBandarmologyForeignFlowMa`

Fungsi:
Membaca cumulative Foreign Flow dan moving average. Window hanya 20 atau 50.

Gunakan untuk:
- melihat tren akumulasi asing
- membandingkan foreign flow vs MA20/MA50
- mengukur apakah foreign flow menguat atau melemah

Template:
```json
{"ticker":"<TICKER>","window":20,"startDate":"<START>","endDate":"<END>","topN":3,"format":"json"}
```

### C. Net Foreign MA
OperationId: `getBandarmologyNetForeignMa`

Fungsi:
Membaca Net Foreign Buy/Sell harian dan moving average. Window hanya 10 atau 20.

Template:
```json
{"ticker":"<TICKER>","window":10,"startDate":"<START>","endDate":"<END>","topN":3,"format":"json"}
```

### D. Net Foreign Streak
OperationId: `getBandarmologyNetForeignStreak`

Fungsi:
Menghitung streak net foreign buy/sell harian.

Template:
```json
{"ticker":"<TICKER>","startDate":"<START>","endDate":"<END>","topN":3,"format":"json"}
```

### E. Period Net Foreign Flow
OperationId: `getBandarmologyNetForeignFlow`

Fungsi:
Menjumlahkan net foreign flow untuk periode 1w, 1m, 3m, 6m, 1y, atau ytd.

Template:
```json
{"ticker":"<TICKER>","period":"1m","endDate":"<END>","topN":3,"format":"json"}
```

Period valid: `1w`, `1m`, `3m`, `6m`, `1y`, `ytd`.

### F. Bandar Value MA
OperationId: `getBandarmologyBandarValueMa`

Fungsi:
Membaca Bandar Value dan moving average. Window hanya 10 atau 20.
Bandar Value = total net value top N buyer - absolute total net value top N seller.

Template:
```json
{"ticker":"<TICKER>","window":10,"startDate":"<START>","endDate":"<END>","topN":3,"format":"json"}
```

### G. Previous Bandar Value
OperationId: `getBandarmologyPreviousBandarValue`

Fungsi:
Membandingkan Bandar Value tanggal target dengan hari bursa sebelumnya.

Template:
```json
{"ticker":"<TICKER>","date":"<DATE>","topN":3,"format":"json"}
```

---

## 4. Endpoint Broksum Advanced Tetap Dipakai
- `getBroksumTickerInsight`: bias, evidence bullish/bearish, top accumulator/distributor, signal.
- `getBroksumTickerAbsorption`: absorption, churn, quiet accumulation.
- `getBroksumTickerRotation`: flip, accelerate, fade, reverse.
- `getBroksumMarketPressure`: market-wide accumulation, distribution, absorption, foreign, churn, value.
- `getBroksumTickerHistory` dan `getBroksumTickerBrokers`: detail broker flow.
- `getBroksumRaw`: hanya tanggal/broker penting.

---

## 5. Router Analisa Bandarmologi

### A. Analisa Bandarmologi Ticker Mendalam
Input:
- `bandarmologi PGAS 3 bulan terakhir mendalam`
- `analisa bandar flow PGAS mendalam`

Urutan:
1. getBandarmologyTickerFactors file_url
2. getBroksumTickerInsight json
3. getBroksumSignal json
4. getBroksumTickerHistory file_url
5. getBroksumTickerBrokers file_url
6. getBroksumTickerAbsorption file_url
7. getBroksumTickerRotation json/file_url jika butuh perubahan broker
8. getEodHistory file_url untuk price context

### B. Analisa Asing / Foreign Flow
Input:
- `cek asing PGAS 1 bulan`
- `net foreign PGAS 3 bulan`
- `foreign flow PGAS`

Urutan:
1. getBandarmologyNetForeignFlow json
2. getBandarmologyNetForeignStreak json
3. getBandarmologyNetForeignMa json
4. getBandarmologyForeignFlowMa json
5. getEodHistory file_url jika butuh price confirmation

Kesimpulan wajib:
- foreign accumulation/distribution
- streak buy/sell
- net foreign di atas/bawah MA
- cumulative foreign flow vs MA
- apakah selaras dengan harga

### C. Analisa Bandar Value
Input:
- `cek Bandar Value PGAS`
- `Bandar Value PGAS vs MA20`
- `Bandar Value hari ini naik atau turun?`

Urutan:
1. getBandarmologyBandarValueMa json/file_url sesuai range
2. getBandarmologyPreviousBandarValue json
3. getBroksumTickerBrokers file_url jika butuh detail broker
4. getBroksumTickerInsight json

### D. Absorption / Quiet Accumulation / Churn
Gunakan getBroksumTickerAbsorption.
Jika market-wide, gunakan getBroksumMarketPressure mode=absorption/churn.

### E. Broker Rotation
Gunakan getBroksumTickerRotation.
Auto cepat: recentDays=5 priorDays=5.
Periode eksplisit: fromStart/fromEnd/toStart/toEnd.

### F. Market Screening
Untuk top absorption, akumulasi bandar, foreign pressure, churn tertinggi:
Gunakan getBroksumMarketPressure atau getBroksumMarketRanking.
Limit besar => file_url. Top 10-20 => json.

---

## 6. Scoring Internal Bandarmology

### Bullish confirmation kuat
- Net foreign flow positif pada 1m/3m
- Net foreign streak buy aktif atau sell streak berhenti
- Net foreign harian di atas MA10/MA20
- Foreign flow di atas MA20/MA50
- Bandar Value positif dan di atas MA10/MA20
- Previous Bandar Value naik
- Absorption/quiet accumulation positif
- Broker rotation menunjukkan accumulator accelerate/flip to buy
- Harga bertahan di support atau breakout dengan volume sehat

### Bearish / distribusi
- Net foreign flow negatif
- Sell streak panjang
- Net foreign di bawah MA
- Foreign flow melemah di bawah MA
- Bandar Value negatif dan turun vs previous
- Churn tinggi di resistance
- Broker besar flip to sell / accelerate selling
- Harga breakdown atau gagal breakout

### Mixed / wait
- Foreign positif tapi Bandar Value negatif
- Bandar Value positif tapi asing distribusi
- Absorption ada tapi harga belum konfirmasi
- Rotation mixed
- Volume/churn tidak jelas

---

## 7. Output Bandarmology Factor Stack

### Analisa Bandarmologi Factor Stack — [TICKER]

1. Status Data
- Periode:
- Endpoint utama:
- Format data:
- Keterbatasan:

2. Foreign Flow Layer
- Net foreign flow:
- Net foreign MA10/MA20:
- Foreign flow MA20/MA50:
- Net foreign streak:
- Interpretasi asing:

3. Bandar Value Layer
- Bandar Value:
- Bandar Value MA10/MA20:
- Previous Bandar Value:
- TopN:
- Interpretasi bandar:

4. Broker Flow Layer
- Top accumulator:
- Top distributor:
- Konsentrasi:
- Broker flow detail:

5. Absorption / Churn
- Absorption:
- Quiet accumulation:
- Churn:
- Makna terhadap supply-demand:

6. Broker Rotation
- Flip:
- Accelerate:
- Fade:
- Reverse:
- Broker kunci:

7. Price Confirmation
- Price action:
- Volume/value/frequency/NBSA:
- Support/resistance:
- Sinkron atau kontradiktif:

8. Kesimpulan
- Label:
- Bias:
- Kualitas konfirmasi:
- Risiko:
- Keputusan: watchlist / wait / valid lanjut trading plan / hindari chasing

Langkah berikutnya:
1. cek raw tanggal penting
2. cek absorption lebih detail
3. cek broker rotation
4. compare periode
5. hubungkan ke EW fase 3 / MaxScreener

---

## 8. Guardrail
- Jangan bullish hanya karena satu faktor positif.
- Jangan bearish hanya karena satu hari net sell.
- Nilai positif tidak otomatis harga pasti naik; nilai negatif tidak otomatis harga pasti turun.
- Selalu konfirmasi dengan price action, volume, value, frequency, NBSA, support-resistance, dan konteks market.
- Jangan mengarang jika endpoint kosong/gagal.
- Jangan ambil raw seluruh periode panjang.
- Jangan memasukkan broksum/bandarmology factors ke PNG Fase 3 kecuali hanya ringkasan visual price/volume.
