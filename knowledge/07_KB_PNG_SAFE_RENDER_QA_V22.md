# 07_KB_PNG_SAFE_RENDER_QA_V22

## Hard rule
- PNG teknikal harus dirender dengan Python setelah data CSV/file_url tersedia.
- Jangan gunakan Image Gen untuk chart teknikal.
- Jangan render sebelum klarifikasi default disetujui user.
- Persetujuan ideal: `setuju semua, tanpa image gen`.

## Design reference
- Fase 1 -> DESIGN_REF_PNG_FASE1.py
- Fase 2 -> DESIGN_REF_PNG_FASE2.py
- Fase 3 -> DESIGN_REF_PNG_FASE3.py
- Fase 4 -> DESIGN_REF_PNG_FASE4.py

File desain hanya referensi layout/style. Jangan salin ticker, path, tanggal wave, harga, label, atau narasi contoh.

## Workflow
1. Pastikan EOD/IHSG file_url/CSV tersedia.
2. Jika belum, ambil endpoint format=file_url.
3. Tampilkan klarifikasi default sesuai fase.
4. Tunggu persetujuan user.
5. Render Python.
6. QA visual.
7. Jika QA gagal, revisi sebelum diberikan.

## PNG fase 3
Tidak boleh memasukkan broksum. Broksum hanya analisa teks.

## QA visual wajib
Layout mirip reference, chart terbaca, label tidak overlap, teks tidak keluar panel, tidak ada path/ticker/tanggal/harga contoh, warna konsisten, resolusi layak.
