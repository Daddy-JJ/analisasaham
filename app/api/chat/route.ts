import { NextRequest, NextResponse } from 'next/server';
import { getGeminiModel, buildContextPrompt } from '@/lib/gemini';
import { fetchStockData, normalizeTicker, StockQuoteData } from '@/lib/yahoo-finance';

export const dynamic = 'force-dynamic';

// Helper to extract 4-letter Indonesian stock ticker or IHSG from text
function detectTicker(text: string): string | null {
  if (/\b(ihsg|\^jkse|composite)\b/i.test(text)) {
    return '^JKSE';
  }
  const match = text.match(/\b([A-Za-z]{4})(\.jk)?\b/i);
  if (match) {
    const candidate = match[1].toUpperCase();
    // Exclude common Indonesian words with 4 letters that might conflict
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

    // Determine target ticker
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
    const model = getGeminiModel();

    // Setup chat or direct generation
    const chat = model.startChat({
      history: history.map((item: any) => ({
        role: item.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: item.content || '' }],
      })),
    });

    const result = await chat.sendMessageStream(enrichedPrompt);

    // Stream the response back to client using ReadableStream
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        // First, emit a metadata event if stockData is available
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
          for await (const chunk of result.stream) {
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
          console.error('Streaming error:', streamErr);
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
