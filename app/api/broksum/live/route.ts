import { NextRequest, NextResponse } from 'next/server';
import { fetchIdxTickerData, formatIdxBroksumToText } from '@/lib/idx-terminal';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const ticker = request.nextUrl.searchParams.get('ticker');
  if (!ticker || typeof ticker !== 'string') {
    return NextResponse.json(
      { ok: false, message: 'Parameter ticker diperlukan (contoh: ?ticker=BBCA).' },
      { status: 400 }
    );
  }

  try {
    const data = await fetchIdxTickerData(ticker);
    if (!data) {
      return NextResponse.json(
        { ok: false, message: `Data Broker Summary / Bandarmologi untuk ${ticker.toUpperCase()} tidak ditemukan atau server IDX sedang offline.` },
        { status: 404 }
      );
    }

    const broksumText = formatIdxBroksumToText(data);

    return NextResponse.json({
      ok: true,
      ticker: data.ticker,
      data,
      broksumText,
    });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, message: error.message || 'Gagal mengambil data live broker summary.' },
      { status: 500 }
    );
  }
}
