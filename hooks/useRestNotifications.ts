'use client';

import { useEffect, useRef } from 'react';
import { userAPI } from '@/app/lib/api';

const REST_THRESHOLDS = {
  medium: 50,
  high: 65,
  critical: 75,
};

export function useRestNotifications(enabled: boolean = true) {
  const lastNotified = useRef<number>(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const check = async () => {
      try {
        const scoreData = (await userAPI.getBurnoutScore()) as {
          score?: number;
          risk_level?: string;
          recommendation?: string;
          rl_action?: string;
        };

        const score = scoreData?.score ?? 0;
        if (score < REST_THRESHOLDS.medium) return;

        const now = Date.now();
        const cooldown = score >= REST_THRESHOLDS.critical ? 60_000 : 5 * 60_000;
        if (now - lastNotified.current < cooldown) return;

        if (!('Notification' in window)) return;
        if (Notification.permission === 'default') {
          await Notification.requestPermission();
        }
        if (Notification.permission !== 'granted') return;

        const title =
          score >= REST_THRESHOLDS.critical
            ? 'Critical burnout level'
            : score >= REST_THRESHOLDS.high
              ? 'High stress detected'
              : 'Time for a break';

        const body =
          scoreData.recommendation ||
          (scoreData.rl_action
            ? scoreData.rl_action.replace(/_/g, ' ')
            : `Your burnout score is ${Math.round(score)}. Take a 5–10 minute rest.`);

        new Notification(title, { body, tag: 'burnout-rest' });
        lastNotified.current = now;
      } catch {
        // Ignore when offline or unauthenticated
      }
    };

    check();
    const interval = setInterval(check, 30_000);
    return () => clearInterval(interval);
  }, [enabled]);
}
