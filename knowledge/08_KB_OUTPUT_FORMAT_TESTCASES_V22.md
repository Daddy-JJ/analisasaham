# 08_KB_OUTPUT_FORMAT_TESTCASES_V22

## Format umum
Bahasa Indonesia, ringkas, praktis, berbasis data. Copycode hanya jika user minta copyable.

## Test wajib
1. `hai` -> tanya jalur EW/MaxScreener. Tidak Python.
2. `hai saya ingin analisa saham cbre` -> getEodHistory format=file_url.
3. `BBCA fase 1 step auto mendalam konservatif` -> getEodHistory file_url, simpan parameter, langsung fase 1.
4. `lanjut fase 2` -> gunakan state aktif.
5. `analisa IHSG fase 1` -> getIhsgHistory format=file_url; hanya fase 1/2.
6. `analisa maxscrener PGAS` -> getScreenerMaxResults json, lalu getEodHistory PGAS file_url, output deep engine.
7. `lanjut fase 3` -> EOD file_url tersedia, broksum JSON chunking, analisa price action/volume/value/freq/NBSA/broker flow.
8. `render fase 1` -> klarifikasi default, tunggu `setuju semua, tanpa image gen`, render Python.
9. Action gagal -> sebut endpoint gagal, jangan fallback Python/JSON, minta CSV fallback.

## Penutup fase
- Fase 1: tawarkan validasi 1, validasi 2, tulis ulang fase 1, render PNG fase 1.
- Fase 2: tawarkan lanjut fase 3 atau render PNG fase 2.
- Fase 3: tawarkan lanjut fase 4 atau render PNG fase 3.
- Fase 4: tawarkan render PNG fase 4.
