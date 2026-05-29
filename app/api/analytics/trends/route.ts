import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { BACKEND_URL } from '@/app/lib/backend';
import { ML_SERVICE_URL } from '@/app/lib/api';

export async function GET(req: NextRequest) {
  if (!BACKEND_URL) {
    return NextResponse.json(
      {
        error: 'Backend URL not configured',
        hint: 'Set BACKEND_URL or NEXT_PUBLIC_BACKEND_URL to your backend URL in Vercel/Render',
      },
      { status: 500 }
    );
  }

  try {
    const range = req.nextUrl.searchParams.get('range') || '7d';
    const days = range.endsWith('d') ? parseInt(range.slice(0, -1), 10) : 7;
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const historyResponse = await fetch(`${BACKEND_URL}/api/user/burnout-history?days=${days}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (!historyResponse.ok) {
      return NextResponse.json({ error: 'Failed to fetch history' }, { status: historyResponse.status });
    }

    const historyData = await historyResponse.json();
    const scores = Array.isArray(historyData.scores)
      ? historyData.scores.map((entry: any) => entry.score ?? 0).filter((score: any) => typeof score === 'number')
      : [];

    const latestScoreEntry = Array.isArray(historyData.scores) ? historyData.scores[0] : null;
    const factorData = latestScoreEntry?.components
      ? [
          { name: 'Screen Time', value: latestScoreEntry.components.screen_time ?? 0 },
          { name: 'Breaks', value: latestScoreEntry.components.break_frequency ?? 0 },
          { name: 'Sleep', value: latestScoreEntry.components.sleep_quality ?? 0 },
          { name: 'Activity', value: latestScoreEntry.components.physical_activity ?? 0 },
          { name: 'Engagement', value: latestScoreEntry.components.engagement ?? 0 },
        ]
      : [
          { name: 'Screen Time', value: 0 },
          { name: 'Breaks', value: 0 },
          { name: 'Sleep', value: 0 },
          { name: 'Activity', value: 0 },
          { name: 'Engagement', value: 0 },
        ];

    let trendResult: any = { trend: 'stable', change: 0, stats: {}, days };
    if (scores.length >= 2) {
      const trendResponse = await fetch(`${ML_SERVICE_URL}/api/analytics/trends?days=${days}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ scores }),
      });
      if (trendResponse.ok) {
        trendResult = await trendResponse.json();
      }
    }

    return NextResponse.json({
      ...trendResult,
      factorData,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
