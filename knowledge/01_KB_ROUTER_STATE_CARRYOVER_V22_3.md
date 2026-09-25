# 01_KB_ROUTER_STATE_CARRYOVER_V22_3

## Tujuan
Router utama untuk 4 jalur: Elliott Wave, MaxScreener, Ownership, dan Bandarmologi.

## Routing awal
1. **EW / teknikal saham**
   - Input: `BBCA fase 1`, `analisa saham PGAS`, `PGAS fase 3 mendalam`
   - Action awal: `getEodHistory format=file_url`

2. **IHSG**
   - Input: `IHSG fase 1`, `analisa IHSG`
   - Action awal: `getIhsgHistory format=file_url`
   - IHSG hanya fase 1 dan fase 2.

3. **MaxScreener**
   - Input: `maxscrener`, `maxscrener PGAS`, `analisa sinyal MaX`
   - Action awal: `getScreenerMaxResults format=json`
   - Setelah ticker jelas: `getEodHistory format=file_url`

4. **Bandarmologi / Broksum**
   - Input: `bandarmologi PGAS`, `top akumulasi bandar hari ini`, `broker AK akumulasi saham apa`
   - Action: endpoint broksum JSON sesuai workflow.
   - Jika perlu price context: `getEodHistory format=file_url`

## Jika user hanya salam
Tampilkan 4 jalur:
1. Elliott Wave saham/IHSG
2. MaxScreener MaX
3. Ownership / Kepemilikan
4. Bandarmologi / Broker Flow

Gunakan KB UX V22.3.

## State wajib
- active_ticker
- active_market_type: saham / IHSG
- active_workflow: EW / IHSG / MaxScreener / Ownership / Bandarmology / PNG
- active_eod_status: belum ada / tersedia / gagal
- active_data_source: action / CSV fallback
- active_data_format: file_url_csv / csv_inline / fallback_csv
- active_phase
- active_mode
- active_lookback
- active_style
- active_risk_profile
- active_analysis_result
- active_broksum_period
- latest_available_date

## Carry-over parameter
Jika user sudah menyebut ticker/fase/mode/lookback/style/risk/periode, jangan tanya ulang.
Contoh: `PGAS fase 1 step mendalam get csv file` -> ambil EOD file_url PGAS, lalu langsung fase 1 STEP mendalam.

## Follow-up
- `lanjut fase 2` -> gunakan state EW aktif.
- `lanjut` -> lanjut fase berikutnya dari active_phase.
- `render fase 1` -> gunakan state aktif; jika EOD belum ada, ambil file_url dulu.
- `validasi 1/2` -> gunakan hasil fase aktif.
- `cek bandarmologi` -> gunakan ticker aktif; ambil broksum JSON.
- `compare periode` -> gunakan ticker aktif dan minta/ambil periode jika belum jelas.

## Reset state
Reset hanya jika user menyebut ticker/objek baru, workflow baru yang bertentangan, atau eksplisit minta analisa baru.
