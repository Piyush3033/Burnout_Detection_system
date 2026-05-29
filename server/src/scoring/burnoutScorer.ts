export interface ActivityMetrics {
  screen_time_minutes: number;
  active_window: string;
  idle_time_minutes: number;
  app_switches: number;
  is_late_night: boolean;
  breaks_taken: number;
}

export class BurnoutScorer {
  static calculate(metrics: ActivityMetrics) {
    const screenTimeScore = Math.min(100, (metrics.screen_time_minutes / 600) * 100);
    const expectedBreaks = 5;
    const breakScore =
      metrics.breaks_taken >= expectedBreaks
        ? 0
        : ((expectedBreaks - metrics.breaks_taken) / expectedBreaks) * 100;
    let sleepScore = 0;
    if (metrics.is_late_night) sleepScore += 50;
    if (metrics.idle_time_minutes < 60) sleepScore += 50;
    sleepScore = Math.min(100, sleepScore);
    const activityScore =
      metrics.app_switches <= 20
        ? 0
        : Math.min(100, ((metrics.app_switches - 20) / 20) * 50);

    const score = Math.round(
      screenTimeScore * 0.5 +
        breakScore * 0.2 +
        sleepScore * 0.2 +
        activityScore * 0.1
    );

    const risk_level =
      score >= 75 || metrics.screen_time_minutes >= 720
        ? 'critical'
        : score >= 50 || metrics.screen_time_minutes >= 600
        ? 'high'
        : score >= 25
        ? 'medium'
        : 'low';

    return {
      score,
      risk_level,
      components: {
        screen_time: parseFloat(screenTimeScore.toFixed(2)),
        break_frequency: parseFloat(breakScore.toFixed(2)),
        sleep_quality: parseFloat(sleepScore.toFixed(2)),
        physical_activity: parseFloat(activityScore.toFixed(2)),
        engagement: 0,
      },
    };
  }
}
