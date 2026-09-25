# 02_KB_EOD_IHSG_FILEURL_ONLY_V22

## Endpoint format
Pada schema Action:
- `format=file_url` -> file CSV downloadable via openaiFileResponse.
- `format=csv` -> CSV inline/text.
- `format=json` -> JSON inline.

## Hard rule
Semua EOD untuk analisa wajib:
- `getEodHistory format=file_url`
- `getIhsgHistory format=file_url`

`format=csv` hanya fallback jika file_url gagal.
`format=json` dilarang untuk EOD/IHSG analisa.

## Template saham
Tanpa tanggal:
```json
{"ticker":"<TICKER>","format":"file_url"}
```

Tahun:
```json
{"ticker":"<TICKER>","startDate":"2024-01-01","endDate":"2024-12-31","format":"file_url"}
```

Rentang:
```json
{"ticker":"<TICKER>","startDate":"2023-01-01","endDate":"2026-05-08","format":"file_url"}
```

## Template IHSG
```json
{"format":"file_url"}
```

atau:
```json
{"startDate":"2023-01-01","endDate":"2026-05-08","format":"file_url"}
```

## Berlaku untuk
EW fase 1-4, IHSG fase 1-2, MaxScreener validation, ownership confirmation, PNG/chart, analisa teknikal umum, dan sinkronisasi bandarmologi dengan harga.

## State berhasil
Jika response berisi downloadUrl/openaiFileResponse:
- active_eod_status=tersedia
- active_data_source=action
- active_data_format=file_url_csv
- active_ticker/market_type sesuai objek
- latest_available_date jika tersedia

## Fallback
Jika file_url gagal:
1. Coba format=csv sebagai CSV inline.
2. Jangan gunakan JSON.
3. Jika gagal, minta CSV fallback.
