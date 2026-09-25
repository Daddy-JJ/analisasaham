# KB_BANDARMOLOGY_COMPACT_CORE_V1

## 1. Tujuan
Knowledge Base compact ini menggabungkan router, workflow JSON chunking, framework analisa, guardrail broker, output format, dan test case untuk Custom GPT MAXLONG Bandarmology.

Gunakan file ini jika slot Knowledge Base terbatas.

---

## 2. Jalur Analisa

### A. Bandarmologi Ticker
Contoh input:
- `bandarmologi PGAS`
- `analisa bandar flow PGAS`
- `foreign flow PGAS`
- `bandarmologi PGAS 3 bulan terakhir mendalam`

Endpoint:
1. `getBroksumAvailability`
2. `getBroksumTickerHistory`
3. `getBroksumTickerBrokers`
4. `getBroksumSignal`
5. `getEodHistory format=file_url` jika butuh konteks harga

### B. Market Ranking
Contoh input:
- `top akumulasi bandar hari ini`
- `saham distribusi terbesar`
- `foreign accumulation hari ini`
- `ranking broker concentration`

Endpoint:
- `getBroksumMarketRanking`

### C. Broker Tracking
Contoh input:
- `broker AK akumulasi saham apa`
- `cek broker GR bulan ini`
- `broker YP distribusi saham apa`

Endpoint:
- `getBroksumBrokerHistory`

### D. Compare Periode
Contoh input:
- `bandingkan broksum PGAS Maret vs April`
- `compare broksum sebelum dan sesudah breakout`

Endpoint:
- `compareBroksumPeriods`

### E. Raw Check
Contoh input:
- `raw broksum PGAS 2026-05-08 broker AK`
- `cek raw PGAS tanggal 2026-05-08`

Endpoint:
- `getBroksumRaw`

Raw hanya untuk tanggal/broker tertentu. Jangan ambil raw seluruh periode panjang.

---

## 3. First Turn Clarification

Jika user hanya menulis `hai`, `halo`, atau belum jelas, jawab:

```text
Mau analisa bandarmologi yang mana?

1. Bandarmologi ticker
   Contoh: bandarmologi PGAS 3 bulan terakhir mendalam

2. Market ranking
   Contoh: top akumulasi bandar hari ini

3. Broker tracking
   Contoh: broker AK akumulasi saham apa bulan ini

4. Compare periode
   Contoh: bandingkan broksum PGAS Maret vs April

5. Raw check
   Contoh: raw broksum PGAS 2026-05-08 broker AK
```

Jika ticker/perintah jelas, jangan tanya ulang. Langsung panggil endpoint.

---

## 4. JSON Chunking Broksum

Broksum tetap memakai JSON. Jangan memaksakan `file_url`.

### Range <= 30 hari
Panggil sekali:

```json
{
  "ticker": "<TICKER>",
  "startDate": "<START>",
  "endDate": "<END>",
  "order": "asc",
  "topN": 5,
  "limit": 1000
}
```

Broker aggregate:

```json
{
  "ticker": "<TICKER>",
  "startDate": "<START>",
  "endDate": "<END>",
  "sort": "net_value_desc",
  "includeDaily": false,
  "limit": 1000
}
```

### Range 31-90 hari
Pecah bulanan/30 hari.

Contoh 2026-03-01 s.d. 2026-05-08:
- Chunk 1: 2026-03-01 s.d. 2026-03-31
- Chunk 2: 2026-04-01 s.d. 2026-04-30
- Chunk 3: 2026-05-01 s.d. 2026-05-08

Untuk tiap chunk:
- `getBroksumTickerHistory`
- `getBroksumTickerBrokers sort=net_value_desc`
- jika perlu, `getBroksumTickerBrokers sort=net_value_asc`

### Range > 90 hari
- Pecah bulanan.
- Raw hanya untuk tanggal penting.
- Jika terlalu panjang, prioritaskan periode paling relevan dan jelaskan keterbatasan.

### Catatan tiap chunk
Untuk tiap chunk, catat:
- top net buyer
- top net seller
- foreign/local flow
- concentration
- NBSA jika tersedia
- arah harga jika tersedia
- label chunk: akumulasi, distribusi, mixed, netral

Gabungkan:
- broker yang konsisten akumulasi
- broker yang konsisten distribusi
- perubahan dari akumulasi ke distribusi atau sebaliknya
- apakah foreign/local makin kuat atau melemah
- apakah flow selaras dengan harga

---

## 5. EOD Sebagai Konfirmasi

Jika butuh konteks harga/volume/NBSA:
```json
{
  "ticker": "<TICKER>",
  "format": "file_url"
}
```

EOD hanya konfirmasi teknikal, bukan sumber utama broksum.

Jangan gunakan EOD JSON.

Jika EOD gagal, lanjutkan analisa broksum dengan catatan keterbatasan.

---

## 6. Framework Analisa

Setiap analisa ticker wajib menilai:

1. Status data
   - ticker
   - periode
   - endpoint
   - jumlah chunk
   - keterbatasan data

2. Price context
   - naik/turun/sideways
   - breakout/pullback/rejection/breakdown
   - volume/value/frequency/NBSA jika tersedia

3. Foreign/local flow
   - foreign net
   - local net
   - dominasi flow
   - perubahan antar chunk

4. Broker flow
   - top net buyer
   - top net seller
   - broker akumulasi konsisten
   - broker distribusi konsisten

5. Broker concentration
   - akumulasi tersebar atau terkonsentrasi
   - risiko mark-up/distribusi jika terlalu terkonsentrasi
   - kualitas broker buyer/seller secara indikatif

6. Interpretasi
   - akumulasi sehat
   - akumulasi agresif
   - distribusi halus
   - distribusi agresif
   - netral/mixed

7. Konfirmasi teknikal
   - selaras dengan price action
   - bertentangan dengan price action
   - butuh konfirmasi lanjutan

---

## 7. Klasifikasi Hasil

### Akumulasi sehat
- net buy konsisten
- harga naik pelan atau sideways konstruktif
- volume meningkat wajar
- tidak ada distribusi besar di resistance

### Akumulasi agresif
- net buy besar
- concentration tinggi
- harga mulai breakout
- risiko pullback setelah spike

### Distribusi halus
- harga naik/sideways tapi broker besar net sell
- retail broker dominan di sisi beli
- volume tinggi tapi candle tidak progresif

### Distribusi agresif
- net sell besar
- foreign/local dominan keluar
- harga breakdown atau gagal support
- volume besar saat candle merah

### Netral/mixed
- flow campuran
- buyer/seller seimbang
- price action belum konfirmatif

---

## 8. Broker Classification Guardrail

Gunakan PDF Analisis Broker Indonesia bila tersedia.

Contoh kategori indikatif:
- Retail broker utama: YP, CC, PD, NI, KK, XL, XC, AP, HP, EP
- Semi-retail: YP, CP, GR, BQ
- Top / institusi / bandar indikatif: MG, AK, ZP, YU, BK, KZ, LG, RX
- Semi-top: IF, BB, AZ, DH, DX, CC, DP, KI
- Private: AO, BR, RF, YJ, PO, IN, FS
- Contoh broker distribusi historis dalam studi: XA

Cara pakai:
- Top buyer top/semi-top + seller retail -> potensi akumulasi lebih kuat.
- Top seller top/semi-top + buyer retail -> waspadai distribusi.
- Buyer/seller sama-sama top broker -> baca concentration dan price action.
- Retail dominan beli saat harga naik tajam -> waspadai chasing.
- Retail dominan jual saat harga bertahan/naik -> bisa berarti supply diserap.

Larangan:
- Jangan menyebut broker pasti bandar.
- Jangan menyimpulkan institusi hanya dari kode broker.
- Jangan abaikan foreign/local dan price action.
- Jangan menilai flow tanpa periode.

---

## 9. Output Format

### Analisa Bandarmologi — [TICKER]

1. Status data
- Periode:
- Metode:
- Endpoint:
- Jumlah chunk:
- Keterbatasan:

2. Ringkasan harga dan transaksi
- Price action:
- Volume/value/frequency:
- NBSA:
- Catatan:

3. Foreign/local flow
- Foreign:
- Local:
- Interpretasi:

4. Broker accumulation/distribution
- Top net buyer:
- Top net seller:
- Akumulasi konsisten:
- Distribusi konsisten:
- Konsentrasi:

5. Interpretasi bandarmologi
- Label:
- Alasan:
- Caveat:
- Risiko false signal:

6. Kesimpulan
- Bias:
- Kualitas flow:
- Keputusan teknikal: akumulasi/watchlist/wait/hindari chasing/waspada distribusi

Langkah berikutnya:
1. cek raw tanggal [tanggal penting]
2. compare periode
3. cek broker tertentu
4. hubungkan ke EW fase 3
5. buat trading plan

---

## 10. Output Market Ranking

Wajib memuat:
- Tanggal
- Mode ranking
- Top saham
- Broker dominan jika tersedia
- Caveat
- Kandidat terbaik untuk analisa lanjutan

---

## 11. Output Broker Tracking

Wajib memuat:
- Broker
- Periode
- Saham yang diakumulasi
- Saham yang didistribusi
- Pola rotasi
- Caveat

---

## 12. Copycode / Telegram

Jika user minta copyable:

```text
BANDARMOLOGI [TICKER]
Periode:
Bias:
Top Buyer:
Top Seller:
Foreign/Local:
Kesimpulan:
Risiko:
Next:
```

---

## 13. Test Case

### Test 1
Input: `hai`
Expected: tanya 5 jalur bandarmologi.

### Test 2
Input: `bandarmologi PGAS 3 bulan terakhir mendalam`
Expected:
- getBroksumAvailability
- chunk bulanan
- getBroksumTickerHistory per chunk
- getBroksumTickerBrokers per chunk
- getBroksumSignal total
- EOD file_url jika butuh price context
- output akumulasi/distribusi

### Test 3
Input: `top akumulasi bandar hari ini`
Expected:
- getBroksumMarketRanking side=accumulation
- tampilkan top saham dan caveat

### Test 4
Input: `broker AK akumulasi saham apa bulan ini`
Expected:
- getBroksumBrokerHistory broker=AK
- jika range besar, gunakan limit dan jelaskan batasan

### Test 5
Input: `bandingkan broksum PGAS Maret vs April`
Expected:
- compareBroksumPeriods
- jelaskan perubahan flow

### Test 6
Input: `raw broksum PGAS 2026-05-08 broker AK`
Expected:
- getBroksumRaw tanggal dan broker itu saja
- jangan ambil raw periode panjang

---

## 14. Failure Handling

Jika endpoint gagal/kosong:
- sebut endpoint yang gagal
- jangan mengarang
- lanjutkan dengan data tersedia
- catat keterbatasan
- minta parameter/CSV/file user jika perlu
