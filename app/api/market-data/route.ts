import { NextRequest, NextResponse } from 'next/server';
import { fetchStockData } from '@/lib/yahoo-finance';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ticker = searchParams.get('ticker');

  if (!ticker) {
    return NextResponse.json(
      { ok: false, message: 'Parameter ticker diperlukan.' },
      { status: 400 }
    );
  }

  try {
    const data = await fetchStockData(ticker);
    return NextResponse.json({
      ok: true,
      data,
    });
  } catch (error: any) {
    console.error('Market data error:', error);
    return NextResponse.json(
      {
        ok: false,
        message: error.message || 'Gagal mengambil data dari Yahoo Finance.',
      },
      { status: 500 }
    );
  }
}
