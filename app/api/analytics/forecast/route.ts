import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL } from '@/app/lib/backend';
import { ML_SERVICE_URL } from '@/app/lib/api';

export async function GET(req: NextRequest) {
  try {
    const daysAhead = parseInt(req.nextUrl.searchParams.get('days_ahead') || '30', 10);
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const historyResponse = await fetch(`${BACKEND_URL}/api/user/burnout-history?days=30`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!historyResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: historyResponse.status });
    }

    const historyData = await historyResponse.json();
    const scores = Array.isArray(historyData.scores)
      ? historyData.scores.map((entry: any) => entry.score ?? 0).filter((score: any) => typeof score === 'number')
      : [];

    let forecastData: Array<{ date: string; predicted: number; actual?: number | null }> = [];
    if (scores.length >= 1) {
      const today = new Date();
      const forecastResponse = await fetch(`${ML_SERVICE_URL}/api/analytics/forecast?days_ahead=${daysAhead}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scores }),
      });

      if (forecastResponse.ok) {
        const result = await forecastResponse.json();
        const previousScore = scores[scores.length - 1] ?? 0;
        forecastData = Array.isArray(result.forecast)
          ? result.forecast.map((predicted: number, index: number) => {
              const date = new Date();
              date.setDate(date.getDate() + index + 1);
              return {
                date: date.toISOString().split('T')[0],
                predicted,
                actual: index === 0 ? previousScore : null,
              };
            })
          : [];
      }
    }

    return NextResponse.json({ forecastData });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
