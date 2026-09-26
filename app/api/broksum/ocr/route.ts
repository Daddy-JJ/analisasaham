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

const OCR_SYSTEM_PROMPT = `You are an expert financial OCR assistant specialized in Indonesian stock market Broker Summary (Broksum) screenshots from apps like Stockbit, IPOT, Mirae Asset, RTI Business, and Neo HOTS.

Extract all data visible in the screenshot accurately:
1. Ticker / Emiten code (e.g. ANTM, BBCA, ASII)
2. Date or Date Range (e.g. 19 Sep 26 - 25 Sep 26 or 2026-03-25)
3. Total Traded Value / Turnover (e.g. 307.8B or Rp 145 Miliar)
4. Foreign Flow (if visible)
5. Broker Summary Table:
Format each row clearly as:
BUYER B.Lot B.Val B.Avg SELLER S.Lot S.Val S.Avg

Example format:
[Tanggal: 19 Sep 26 – 25 Sep 26]
Emiten: ANTM
Total Traded Value: 307.8B

BUYER B.Lot B.Val B.Avg SELLER S.Lot S.Val S.Avg
LG 236.8K 77.3B 3257 AK 280.2K 92.5B 3260
AZ 175K 57.7B 3280 BK 196.4K 63.9B 3242
CC 116.1K 37.3B 3255 SS 132K 42.4B 3214
OD 61.9K 20.3B 3264 BB 129.2K 41.7B 3230
GR 60.2K 19.9B 3268 SQ 40.6K 13.4B 3269

Ensure you preserve exact broker 2-letter codes, lots, values (in B/M/K), and average prices.
Output ONLY the clean extracted text without conversational fillers.`;

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
    const { image, ticker = '' } = body;

    if (!image || typeof image !== 'string') {
      return NextResponse.json(
        { ok: false, message: 'Data gambar (base64) tidak ditemukan.' },
        { status: 400 }
      );
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
          OCR_SYSTEM_PROMPT,
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
