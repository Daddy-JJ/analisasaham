import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { parseBroksumText } from '@/lib/broksum-parser';

export const dynamic = 'force-dynamic';

const OCR_MODELS = [
  process.env.GEMINI_MODEL || 'gemini-3.8-flash',
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.1-flash-lite',
];

const AUTO_OCR_PROMPT = `You are an expert financial OCR assistant specialized in Indonesian stock market screenshots from apps like Stockbit, IPOT, Mirae Asset, RTI Business, and Neo HOTS.
The screenshot may contain a Broker Summary (Broksum), an Orderbook, or both.

Extract all data visible in the screenshot accurately:

1. Ticker / Emiten code (e.g. DSSA, ANTM, BBCA, ASII)
2. Date or Date Range (if visible)
3. If ORDERBOOK is visible:
   - Last Price, Change, and Percentage (e.g. 1,055 -35 (-3.21%))
   - Open, High, Low, Prev
   - Lot, Val, Avg, Freq (e.g. Lot 3.05M, Val 332.53B, Avg 1089, Freq 28047)
   - Foreign Buy and Foreign Sell (e.g. F Buy 65.6 B, F Sell 92.5 B)
   - Total Bid and Total Offer summary line (e.g. Total Bid: 571,744 | Total Offer: 1,759,762)
   - Summary footer row if visible (e.g. 3,428 571,744 1,759,762 9,146)
   - Top Bid & Offer depth rows:
     Freq BidLot Bid Offer OfferLot Freq
4. If BROKER SUMMARY is visible:
   - Total Traded Value / Turnover
   - Top 1, Top 3, Top 5 accumulation / distribution summary
   - Broker Summary Table rows:
     BUYER B.Lot B.Val B.Avg SELLER S.Lot S.Val S.Avg

Example Format:
[ORDERBOOK]
Emiten: DSSA
1,055 -35 (-3.21%)
Open: 1,095 High: 1,125 Low: 1,050 Prev: 1,090
Lot: 3.05M Val: 332.53B Avg: 1,089 Freq: 28,047
F Buy: 65.6 B F Sell: 92.5 B
Total Bid: 571,744 (Freq 3,428)
Total Offer: 1,759,762 (Freq 9,146)

[BROKER SUMMARY]
BUYER B.Lot B.Val B.Avg SELLER S.Lot S.Val S.Avg
LG 86.2K 9.7B 1095 TP 160.5K 17.1B 1069
AZ 87.1K 9.5B 1085 BK 95.9K 10.3B 1074
RF 80K 8.7B 1094 AI 85.8K 9.7B 1115
CC 50.3K 5.4B 1094 YJ 69.9K 7.4B 1059
PD 35.5K 3.9B 1089 AK 59.7K 7.1B 1101
YP 34.8K 3.8B 1090 GR 49.2K 5.3B 1078

Ensure you preserve exact broker 2-letter codes, lots, values (in B/M/K), and prices.
Output ONLY clean extracted text without conversational fillers.`;

const BROKSUM_OCR_PROMPT = `You are an expert financial OCR assistant specialized in Indonesian stock market screenshots (Stockbit, IPOT, Mirae Asset, Neo HOTS, RTI Business).
The screenshot contains a Broker Summary (Broksum) table.

Extract ONLY the Broker Summary data visible in the screenshot accurately:
1. Ticker / Emiten code (e.g. DSSA, ANTM, BBCA, ASII)
2. Date or Date Range (e.g. Tanggal: 25 Sep 26)
3. Total Traded Value / Turnover (e.g. Total Traded Value: 307.8B)
4. Accumulation / Distribution summary if visible (e.g. Top 1: -8.1B (Small Dist), Top 3: -9.7B, Top 5: -14.5B)
5. Broker Summary Table:
   BUYER B.Lot B.Val B.Avg SELLER S.Lot S.Val S.Avg
   LG 86.2K 9.7B 1095 TP 160.5K 17.1B 1069
   AZ 87.1K 9.5B 1085 BK 95.9K 10.3B 1074
   RF 80K 8.7B 1094 AI 85.8K 9.7B 1115
   CC 50.3K 5.4B 1094 YJ 69.9K 7.4B 1059
   PD 35.5K 3.9B 1089 AK 59.7K 7.1B 1101
   YP 34.8K 3.8B 1090 GR 49.2K 5.3B 1078

Ensure:
- Output begins with header:
[BROKER SUMMARY]
- Preserve exact 2-letter broker codes (e.g. AK, BK, LG, AZ, CC, TP, YP, PD, etc.), lots (in K/M), values (in B/M/K), and average prices.
- Output ONLY clean extracted data without conversational fillers.`;

const ORDERBOOK_OCR_PROMPT = `You are an expert financial OCR assistant specialized in Indonesian stock market screenshots (Stockbit, IPOT, Mirae Asset, Neo HOTS, RTI Business).
The screenshot contains an Orderbook (Bid/Offer depth and trade statistics).

Extract ONLY the Orderbook and microstructure data visible in the screenshot accurately:
1. Ticker / Emiten code (e.g. DSSA, ANTM, BBCA, ASII)
2. Last Price, Change, and Percentage (e.g. 1,055 -35 (-3.21%))
3. Open, High, Low, Prev (e.g. Open: 1,095 High: 1,125 Low: 1,050 Prev: 1,090)
4. Volume & Value stats: Lot, Val, Avg, Freq (e.g. Lot: 3.05M Val: 332.53B Avg: 1,089 Freq: 28,047)
5. Foreign flow if visible: Foreign Buy (F Buy) and Foreign Sell (F Sell) (e.g. F Buy: 65.6 B F Sell: 92.5 B)
6. Total Bid and Total Offer summary line:
   Total Bid: 571,744 (Freq 3,428)
   Total Offer: 1,759,762 (Freq 9,146)
7. Summary footer row if visible (e.g. 3,428 571,744 1,759,762 9,146)
8. Bid & Offer depth rows (if visible):
   Freq BidLot Bid Offer OfferLot Freq

Ensure:
- Output begins with header:
[ORDERBOOK]
- Preserve exact numbers, units (B/M/K), prices, lot sizes, and bid-offer queues.
- Output ONLY clean extracted data without conversational fillers.`;

export async function POST(request: NextRequest) {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { ok: false, message: 'GEMINI_API_KEY belum dikonfigurasi di Environment Variables.' },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { image, ticker = '', mode = 'auto' } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { ok: false, message: 'Data gambar (base64) tidak ditemukan.' },
        { status: 400 }
      );
    }

    // Select specialized system prompt according to mode
    let selectedPrompt = AUTO_OCR_PROMPT;
    if (mode === 'broksum') {
      selectedPrompt = BROKSUM_OCR_PROMPT;
    } else if (mode === 'orderbook') {
      selectedPrompt = ORDERBOOK_OCR_PROMPT;
    }

    // Extract mime type and pure base64 data
    let mimeType = 'image/png';
    let base64Data = image;

    if (image.startsWith('data:')) {
      const match = image.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        mimeType = match[1];
        base64Data = match[2];
      }
    }

    const genAI = new GoogleGenerativeAI(apiKey);
    const candidateModels = Array.from(new Set(OCR_MODELS));
    let extractedText = '';
    let lastError: any = null;

    for (const modelCandidate of candidateModels) {
      try {
        const model = genAI.getGenerativeModel({ model: modelCandidate });
        const result = await model.generateContent([
          selectedPrompt,
          {
            inlineData: {
              mimeType,
              data: base64Data,
            },
          },
        ]);
        const responseText = result.response.text();
        if (responseText && responseText.trim().length > 0) {
          extractedText = responseText.trim();
          break;
        }
      } catch (err: any) {
        console.warn(`Vision OCR model ${modelCandidate} failed:`, err.message);
        lastError = err;
      }
    }

    if (!extractedText) {
      throw lastError || new Error('Gagal mengekstrak data dari gambar screenshot. Pastikan gambar jelas dan coba lagi.');
    }

    // Parse the extracted text into OpenAPI schema and Bandarmology metrics
    const parsed = parseBroksumText(extractedText, ticker);

    return NextResponse.json({
      ok: true,
      text: extractedText,
      detectedTicker: parsed.detectedTicker || ticker,
      mode,
      parsed,
    });
  } catch (error: any) {
    console.error('Error in /api/broksum/ocr:', error);
    return NextResponse.json(
      { ok: false, message: error.message || 'Terjadi kesalahan saat memproses gambar.' },
      { status: 500 }
    );
  }
}
