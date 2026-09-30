import { NextRequest, NextResponse } from 'next/server';
import { getLiveWeather, getLiveMarketQuotes, getLiveNews } from '@/lib/tools/realtimeData';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const location = searchParams.get('location') || 'Bangalore';
    const symbols = searchParams.get('symbols')?.split(',') || ['BTC', 'ETH', 'SOL', 'AAPL', 'NVDA', 'TSLA'];
    const newsTopic = searchParams.get('news') || 'all';

    const [weather, marketQuotes, news] = await Promise.all([
      getLiveWeather(location),
      getLiveMarketQuotes(symbols),
      getLiveNews(newsTopic),
    ]);

    return NextResponse.json({
      success: true,
      weather,
      marketQuotes,
      news,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch realtime data' },
      { status: 500 }
    );
  }
}
