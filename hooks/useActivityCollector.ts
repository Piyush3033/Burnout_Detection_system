'use client';

import { useEffect, useRef } from 'react';
import { activityAPI } from '@/app/lib/api';

/**
 * Web/PWA activity collector for mobile browsers (Android/iOS).
 * Tracks tab visibility and posts usage snapshots to the backend.
 */
export function useActivityCollector(enabled: boolean = true) {
  const sessionStart = useRef(Date.now());
  const lastApp = useRef<string>('browser');
  const switches = useRef(0);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;
    const token = localStorage.getItem('token');
    if (!token) return;

    const detectPlatform = (): 'android' | 'ios' | 'web' => {
      const ua = navigator.userAgent.toLowerCase();
      if (/android/.test(ua)) return 'android';
      if (/iphone|ipad|ipod/.test(ua)) return 'ios';
      return 'web';
    };

    const postSnapshot = async () => {
      const elapsedMinutes = Math.max(0.1, (Date.now() - sessionStart.current) / 60000);
      const isVisible = document.visibilityState === 'visible';
      const appName = document.title || 'Browser';
      if (lastApp.current !== appName) {
        switches.current += 1;
        lastApp.current = appName;
      }

      const hour = new Date().getHours();
      const isLateNight = hour >= 22 || hour < 6;

      try {
        await activityAPI.logActivity({
          platform: detectPlatform(),
          activity: {
            screen_time_minutes: isVisible ? Math.min(elapsedMinutes, 5) : 0,
            active_window: appName,
            app_name: appName,
            idle_time_seconds: isVisible ? 0 : 300,
            app_switches: switches.current,
            is_late_night: isLateNight,
            break_taken: !isVisible,
          },
          app_usage: [{ app_name: appName, duration_minutes: isVisible ? 1 : 0 }],
        });
      } catch {
        // Retry on next interval
      }
    };

    postSnapshot();
    const interval = setInterval(postSnapshot, 5000);
    return () => clearInterval(interval);
  }, [enabled]);
}
