import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel, buildContextPrompt, SUPPORTED_MODELS } from '@/lib/gemini';
import { fetchStockData, normalizeTicker, StockQuoteData } from '@/lib/yahoo-finance';

export const dynamic = 'force-dynamic';

function detectTicker(text: string): string | null {
  if (/\b(ihsg|\^jkse|composite)\b/i.test(text)) {
    return '^JKSE';
  }
  const match = text.match(/\b([A-Za-z]{4})(\.jk)?\b/i);
  if (match) {
    const candidate = match[1].toUpperCase();
    const excluded = ['FASE', 'STEP', 'AUTO', 'DARI', 'PADA', 'AKAN', 'BISA', 'YANG', 'IKUT', 'BUAT', 'USER', 'APSS', 'CHAT', 'DATA', 'VIEW', 'CEK'];
    if (!excluded.includes(candidate)) {
      return candidate;
    }
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { prompt, ticker: inputTicker, broksumText, history = [] } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ ok: false, message: 'Prompt tidak boleh kosong.' }, { status: 400 });
    }

    const resolvedTicker = inputTicker ? inputTicker.trim() : detectTicker(prompt);
    let stockData: StockQuoteData | null = null;

    if (resolvedTicker) {
      try {
        stockData = await fetchStockData(resolvedTicker);
      } catch (err: any) {
        console.warn(`Could not fetch data for ticker ${resolvedTicker}:`, err.message);
      }
    }

    const enrichedPrompt = buildContextPrompt(prompt, stockData, broksumText);

    // Filter unique models to try in order
    const candidateModels = Array.from(new Set(SUPPORTED_MODELS));
    let lastError: any = null;
    let streamResult: any = null;

    for (const modelCandidate of candidateModels) {
      try {
        const model = getGeminiModel(modelCandidate);
        const chat = model.startChat({
          history: history.map((item: any) => ({
            role: item.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: item.content || '' }],
          })),
        });

        streamResult = await chat.sendMessageStream(enrichedPrompt);
        break; // Successfully started stream
      } catch (err: any) {
        console.warn(`Model ${modelCandidate} failed:`, err.message);
        lastError = err;
        // Continue to next candidate model
      }
    }

    if (!streamResult) {
      throw lastError || new Error('Semua model Gemini sedang sibuk. Silakan coba kembali sesaat lagi.');
    }

    // Stream the response back to client
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        if (stockData) {
          const metaPayload = JSON.stringify({
            type: 'meta',
            stockData: {
              symbol: stockData.symbol,
              tickerClean: stockData.tickerClean,
              name: stockData.name,
              price: stockData.price,
              change: stockData.change,
              changePercent: stockData.changePercent,
              volume: stockData.volume,
              ma20: stockData.ma20,
              ma50: stockData.ma50,
              ma200: stockData.ma200,
              rsi14: stockData.rsi14,
              volumeRatio: stockData.volumeRatio,
              fiftyTwoWeekHigh: stockData.fiftyTwoWeekHigh,
              fiftyTwoWeekLow: stockData.fiftyTwoWeekLow,
              latestDate: stockData.latestDate,
            },
          });
          controller.enqueue(encoder.encode(`event: meta\ndata: ${metaPayload}\n\n`));
        }

        try {
          for await (const chunk of streamResult.stream) {
            const chunkText = chunk.text();
            if (chunkText) {
              const dataPayload = JSON.stringify({
                type: 'text',
                content: chunkText,
              });
              controller.enqueue(encoder.encode(`event: text\ndata: ${dataPayload}\n\n`));
            }
          }
          controller.enqueue(encoder.encode(`event: done\ndata: {}\n\n`));
        } catch (streamErr: any) {
          console.error('Streaming error during iteration:', streamErr);
          const errPayload = JSON.stringify({
            type: 'error',
            message: streamErr.message || 'Stream generation failed.',
          });
          controller.enqueue(encoder.encode(`event: error\ndata: ${errPayload}\n\n`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache, no-transform',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('Chat endpoint error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error.message || 'Terjadi kesalahan saat memproses permintaan.',
      },
      { status: 500 }
    );
  }
}
