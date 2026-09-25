# Panduan Deployment ke Vercel (Gemini IDX Pro)

Aplikasi ini adalah **1-Halaman Front End Analisa Saham Indonesia** berbasis Next.js 14 yang siap dideploy ke **Vercel** hanya dalam beberapa klik.

---

## 1. Persiapan Lokal

1. Buat berkas `.env.local` di folder utama (salin dari `.env.example`):
   ```bash
   cp .env.example .env.local
   ```
2. Isi kunci API Gemini Anda:
   ```env
   GEMINI_API_KEY=AIzaSy... (dapatkan gratis di https://aistudio.google.com/)
   GEMINI_MODEL=gemini-1.5-pro
   ```
3. Jalankan aplikasi di komputer lokal:
   ```bash
   npm run dev
   ```
4. Buka browser di [http://localhost:3010](http://localhost:3010).

---

## 2. Cara Deploy ke Vercel (Otomatis via GitHub)

### Langkah A: Upload ke GitHub
1. Inisialisasi Git di folder ini (jika belum):
   ```bash
   git init
   git add .
   git commit -m "feat: IDX Pro 1-Page Dashboard for Vercel"
   ```
2. Buat repositori baru di [GitHub](https://github.com/new).
3. Hubungkan dan push kode Anda ke GitHub:
   ```bash
   git remote add origin https://github.com/USERNAME/REPO_NAME.git
   git branch -M main
   git push -u origin main
   ```

### Langkah B: Deploy di Vercel Dashboard
1. Buka [Vercel](https://vercel.com/) dan login menggunakan akun GitHub Anda.
2. Klik **"Add New..."** -> **"Project"**.
3. Pilih repositori GitHub Anda lalu klik **"Import"**.
4. Di bagian **Environment Variables**, tambahkan:
   - `GEMINI_API_KEY` : *Kunci API Gemini Anda dari Google AI Studio*
   - `GEMINI_MODEL` : `gemini-1.5-pro` (atau `gemini-2.5-pro`)
5. Klik **"Deploy"**!
6. Dalam waktu ~60 detik, Vercel akan memberikan link domain live (contoh: `https://analisa-saham-idx.vercel.app`).

---

## 3. Fitur Utama yang Sudah Terpasang

- **100% Otomatis Data Saham & IHSG**: Mengambil data live OHLCV, moving averages (MA20/50/200), RSI 14, dan volume ratio langsung dari feed Yahoo Finance tanpa butuh API key pihak ketiga.
- **Fase 1: Elliott Wave**: Perhitungan Wave count, invalidation rules, dan status wave aktif.
- **Fase 2: Fibonacci Targets**: Retracement 0.382, 0.5, 0.618, Golden ratio, dan confluence S/R.
- **Fase 3: Bandarmology & Broksum Drawer**: Panel untuk menempel teks atau tabel Broker Summary dari sekuritas (Stockbit, IPOT, Mirae, dll) agar dianalisa oleh Gemini Pro.
- **Fase 4: Complete Trading Plan**: Entry zone, Stop Loss (SL), Target Price 1 & 2, serta Risk/Reward ratio.
- **Responsive Dark Terminal UI**: Desain layar tunggal yang cepat, bersih, dan nyaman digunakan di desktop maupun smartphone.
