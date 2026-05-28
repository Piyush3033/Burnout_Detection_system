import { BurnoutScorer } from '../scoring/burnoutScorer.js';

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || process.env.NEXT_PUBLIC_ML_URL || '';

export interface ActivityMetrics {
  screen_time_minutes: number;
  active_window: string;
  idle_time_minutes: number;
  app_switches: number;
  is_late_night: boolean;
  breaks_taken: number;
  platform?: string;
}

export interface ScoreResult {
  score: number;
  risk_level: string;
  components: Record<string, number>;
  recommendation?: string;
  rl_action?: string;
}

export async function calculateBurnoutScore(
  metrics: ActivityMetrics,
  previousScore?: number
): Promise<ScoreResult> {
  if (ML_SERVICE_URL) {
    try {
      const response = await fetch(`${ML_SERVICE_URL}/api/scoring/realtime`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screen_time_minutes: metrics.screen_time_minutes,
          active_window: metrics.active_window,
          idle_time_minutes: metrics.idle_time_minutes,
          app_switches: metrics.app_switches,
          is_late_night: metrics.is_late_night,
          breaks_taken: metrics.breaks_taken,
          previous_score: previousScore ?? 0,
          platform: metrics.platform ?? 'desktop',
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        return (await response.json()) as ScoreResult;
      }
    } catch {
      // Fall through to local scorer
    }

    try {
      const response = await fetch(`${ML_SERVICE_URL}/api/scoring/calculate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          screen_time_minutes: metrics.screen_time_minutes,
          active_window: metrics.active_window,
          idle_time_minutes: metrics.idle_time_minutes,
          app_switches: metrics.app_switches,
          is_late_night: metrics.is_late_night,
          breaks_taken: metrics.breaks_taken,
        }),
        signal: AbortSignal.timeout(8000),
      });

      if (response.ok) {
        return (await response.json()) as ScoreResult;
      }
    } catch {
      // Fall through
    }
  }

  return BurnoutScorer.calculate(metrics);
}
