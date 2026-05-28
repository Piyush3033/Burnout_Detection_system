import express, { Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import ActivityLog from '../models/ActivityLog.js';
import BurnoutScore from '../models/BurnoutScore.js';
import { calculateBurnoutScore } from '../services/scoringService.js';

const router = express.Router();

const activityInputSchema = z.object({
  screen_time_minutes: z.number().min(0).optional(),
  total_screen_time_minutes: z.number().min(0).optional(),
  active_window: z.string().optional(),
  idle_time_minutes: z.number().min(0).optional(),
  idle_time_seconds: z.number().min(0).optional(),
  app_switches: z.number().min(0).optional(),
  is_late_night: z.boolean().optional(),
  break_taken: z.boolean().optional(),
  platform: z.enum(['desktop', 'android', 'web', 'ios']).optional(),
  app_usage: z
    .array(
      z.object({
        app_name: z.string(),
        duration_minutes: z.number().min(0).optional(),
        is_foreground: z.boolean().optional(),
        is_running: z.boolean().optional(),
        process_count: z.number().min(0).optional(),
      })
    )
    .optional(),
  running_apps: z
    .array(
      z.object({
        app_name: z.string(),
        duration_minutes: z.number().min(0).optional(),
        is_foreground: z.boolean().optional(),
        is_running: z.boolean().optional(),
        process_count: z.number().min(0).optional(),
      })
    )
    .optional(),
  activity: z
    .object({
      screen_time_minutes: z.number().min(0).optional(),
      active_window: z.string().optional(),
      idle_time_seconds: z.number().min(0).optional(),
      app_switches: z.number().min(0).optional(),
      is_late_night: z.boolean().optional(),
      break_taken: z.boolean().optional(),
      app_name: z.string().optional(),
      duration_minutes: z.number().min(0).optional(),
      total_activity_score: z.number().min(0).optional(),
    })
    .optional(),
  system: z
    .object({
      cpu_percent: z.number().min(0).optional(),
      memory_percent: z.number().min(0).optional(),
      memory_available_mb: z.number().optional(),
      disk_percent: z.number().min(0).optional(),
      disk_available_gb: z.number().optional(),
      cpu_uptime_seconds: z.number().min(0).optional(),
      active_window: z.string().optional(),
      active_window_changes: z.number().min(0).optional(),
    })
    .optional(),
  timestamp: z.string().optional(),
});

const batchSchema = z.object({
  entries: z.array(activityInputSchema).min(1),
});

function normalizeActivityPayload(data: z.infer<typeof activityInputSchema>) {
  const activity = data.activity || {};

  const screen_time_minutes = data.screen_time_minutes ?? activity.screen_time_minutes ?? 0;
  const idle_time_minutes =
    data.idle_time_minutes ??
    (activity.idle_time_seconds !== undefined
      ? Math.round(activity.idle_time_seconds / 60)
      : 0);
  const app_switches = data.app_switches ?? activity.app_switches ?? 0;
  const is_late_night = data.is_late_night ?? activity.is_late_night ?? false;
  const break_taken = data.break_taken ?? activity.break_taken ?? false;
  const active_window =
    data.active_window ?? activity.active_window ?? activity.app_name ?? 'unknown';
  const platform = data.platform ?? 'desktop';

  return {
    screen_time_minutes,
    active_window,
    idle_time_minutes,
    app_switches,
    is_late_night,
    break_taken,
    platform,
    app_name: activity.app_name ?? active_window,
    duration_minutes: activity.duration_minutes ?? screen_time_minutes,
    app_usage: data.app_usage ?? [],
    running_apps: data.running_apps ?? [],
  };
}

function normalizeSystemPayload(data: z.infer<typeof activityInputSchema>) {
  return data.system || {};
}

function parseTimestamp(value?: string): Date {
  return value ? new Date(value) : new Date();
}

async function getTodayBreakCount(userId: string): Promise<number> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);
  return ActivityLog.countDocuments({
    user_id: userId,
    timestamp: { $gte: startOfDay },
    'data.break_taken': true,
  });
}

async function saveBurnoutScoreInternal(
  userId: string,
  logData: ReturnType<typeof normalizeActivityPayload>,
  timestamp: Date
) {
  const previous = await BurnoutScore.findOne({ user_id: userId }).sort({ timestamp: -1 });
  const breaksToday = await getTodayBreakCount(userId);

  const result = await calculateBurnoutScore(
    {
      screen_time_minutes: logData.screen_time_minutes,
      active_window: logData.active_window,
      idle_time_minutes: logData.idle_time_minutes,
      app_switches: logData.app_switches,
      is_late_night: logData.is_late_night,
      breaks_taken: breaksToday + (logData.break_taken ? 1 : 0),
      platform: logData.platform,
    },
    previous?.score
  );

  const score = new BurnoutScore({
    user_id: userId,
    timestamp,
    score: result.score,
    risk_level: result.risk_level,
    components: result.components,
    recommendation: result.recommendation,
    rl_action: result.rl_action,
  });

  await score.save();
  return { score, result };
}

router.post('/log', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const payload = activityInputSchema.parse(req.body);
    const normalized = normalizeActivityPayload(payload);
    const parsedTimestamp = parseTimestamp(payload.timestamp);
    const systemPayload = normalizeSystemPayload(payload);

    const activityLog = new ActivityLog({
      user_id: req.userId,
      timestamp: parsedTimestamp,
      platform: normalized.platform,
      data: {
        screen_time_minutes: normalized.screen_time_minutes,
        active_window: normalized.active_window,
        idle_time_minutes: normalized.idle_time_minutes,
        app_switches: normalized.app_switches,
        is_late_night: normalized.is_late_night,
        break_taken: normalized.break_taken,
        app_name: normalized.app_name,
        duration_minutes: normalized.duration_minutes,
      },
      app_usage: normalized.app_usage,
      running_apps: normalized.running_apps,
      system: systemPayload,
    });

    await activityLog.save();
    const { score: burnoutScore } = await saveBurnoutScoreInternal(
      req.userId!,
      normalized,
      parsedTimestamp
    );

    res.status(201).json({
      message: 'Activity logged successfully',
      activity: activityLog,
      burnout_score: burnoutScore,
    });
  } catch (error: any) {
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

router.post('/batch', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const payload = batchSchema.parse(req.body);
    const createdLogs = [];
    const createdScores = [];

    for (const entry of payload.entries) {
      const normalized = normalizeActivityPayload(entry);
      const parsedTimestamp = parseTimestamp(entry.timestamp);
      const systemPayload = normalizeSystemPayload(entry);

      const activityLog = new ActivityLog({
        user_id: req.userId,
        timestamp: parsedTimestamp,
        platform: normalized.platform,
        data: {
          screen_time_minutes: normalized.screen_time_minutes,
          active_window: normalized.active_window,
          idle_time_minutes: normalized.idle_time_minutes,
          app_switches: normalized.app_switches,
          is_late_night: normalized.is_late_night,
          break_taken: normalized.break_taken,
          app_name: normalized.app_name,
          duration_minutes: normalized.duration_minutes,
        },
        app_usage: normalized.app_usage,
        running_apps: normalized.running_apps,
        system: systemPayload,
      });
      await activityLog.save();
      createdLogs.push(activityLog);

      const { score: burnoutScore } = await saveBurnoutScoreInternal(
        req.userId!,
        normalized,
        parsedTimestamp
      );
      createdScores.push(burnoutScore);
    }

    res.status(201).json({
      message: 'Batch activity logged successfully',
      count: createdLogs.length,
      activities: createdLogs,
      burnout_scores: createdScores,
    });
  } catch (error: any) {
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

router.get('/logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await ActivityLog.find({
      user_id: req.userId,
      timestamp: { $gte: startDate },
    })
      .sort({ timestamp: -1 })
      .limit(500);

    res.json({
      user_id: req.userId,
      days,
      count: logs.length,
      logs,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/app-usage', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await ActivityLog.find({
      user_id: req.userId,
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    });

    const usageMap: Record<
      string,
      {
        app_name: string;
        duration_minutes: number;
        platform: string;
        sessions: number;
        is_running: boolean;
        is_foreground: boolean;
        process_count: number;
      }
    > = {};

    const mergeApp = (
      appName: string,
      platform: string,
      duration: number,
      extras?: { is_running?: boolean; is_foreground?: boolean; process_count?: number }
    ) => {
      const key = `${appName}:${platform}`;
      if (!usageMap[key]) {
        usageMap[key] = {
          app_name: appName,
          duration_minutes: 0,
          platform,
          sessions: 0,
          is_running: false,
          is_foreground: false,
          process_count: 0,
        };
      }
      usageMap[key].duration_minutes += duration;
      if (duration > 0) usageMap[key].sessions += 1;
      if (extras?.is_running) usageMap[key].is_running = true;
      if (extras?.is_foreground) usageMap[key].is_foreground = true;
      if (extras?.process_count) {
        usageMap[key].process_count = Math.max(usageMap[key].process_count, extras.process_count);
      }
    };

    for (const log of logs) {
      if (log.app_usage?.length) {
        for (const entry of log.app_usage) {
          mergeApp(entry.app_name, log.platform, entry.duration_minutes ?? 0, {
            is_running: entry.is_running,
            is_foreground: entry.is_foreground,
            process_count: entry.process_count,
          });
        }
      }

      for (const entry of log.running_apps ?? []) {
        mergeApp(entry.app_name, log.platform, entry.duration_minutes ?? 0, {
          is_running: true,
          is_foreground: entry.is_foreground,
          process_count: entry.process_count,
        });
      }

      const appName = log.data.app_name || log.data.active_window || 'unknown';
      mergeApp(
        appName,
        log.platform,
        log.data.duration_minutes ?? log.data.screen_time_minutes ?? 0
      );
    }

    const apps = Object.values(usageMap).sort((a, b) => b.duration_minutes - a.duration_minutes);
    const latestLog = await ActivityLog.findOne({
      user_id: req.userId,
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    }).sort({ timestamp: -1 });

    res.json({
      date: date.toISOString().split('T')[0],
      total_apps: apps.length,
      apps,
      running_apps_now: latestLog?.running_apps ?? [],
      by_platform: {
        desktop: apps.filter((a) => a.platform === 'desktop'),
        android: apps.filter((a) => a.platform === 'android'),
        web: apps.filter((a) => a.platform === 'web'),
        ios: apps.filter((a) => a.platform === 'ios'),
      },
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/daily-summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await ActivityLog.find({
      user_id: req.userId,
      timestamp: { $gte: startOfDay, $lte: endOfDay },
    });

    const appUsageMap: Record<string, number> = {};
    const totalCpuPercent = logs.reduce((sum, log) => sum + (log.system?.cpu_percent ?? 0), 0);
    const totalMemoryPercent = logs.reduce((sum, log) => sum + (log.system?.memory_percent ?? 0), 0);
    const totalSystemLogs = logs.filter((log) => log.system !== undefined).length;

    logs.forEach((log) => {
      if (log.app_usage?.length) {
        for (const entry of log.app_usage) {
          appUsageMap[entry.app_name] =
            (appUsageMap[entry.app_name] || 0) + (entry.duration_minutes ?? 0);
        }
      }
      const appName = log.data.app_name || log.system?.active_window || log.data.active_window || 'unknown';
      appUsageMap[appName] =
        (appUsageMap[appName] || 0) + (log.data.duration_minutes ?? log.data.screen_time_minutes);
    });

    const topApplication =
      Object.entries(appUsageMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    const maxCpuUptime = logs.reduce((max, log) => Math.max(max, log.system?.cpu_uptime_seconds ?? 0), 0);
    const latestLog = logs.length
      ? logs.reduce((a, b) => (a.timestamp > b.timestamp ? a : b))
      : null;

    const summary = {
      date: date.toISOString().split('T')[0],
      total_screen_time: logs.reduce((sum, log) => sum + log.data.screen_time_minutes, 0),
      total_idle_time: logs.reduce((sum, log) => sum + log.data.idle_time_minutes, 0),
      total_app_switches: logs.reduce((sum, log) => sum + log.data.app_switches, 0),
      breaks_taken: logs.filter((log) => log.data.break_taken).length,
      log_count: logs.length,
      late_night_usage: logs.some((log) => log.data.is_late_night),
      avg_cpu_percent: totalSystemLogs ? parseFloat((totalCpuPercent / totalSystemLogs).toFixed(2)) : 0,
      avg_memory_percent: totalSystemLogs
        ? parseFloat((totalMemoryPercent / totalSystemLogs).toFixed(2))
        : 0,
      cpu_uptime_seconds: maxCpuUptime,
      top_application: topApplication,
      app_usage: Object.entries(appUsageMap)
        .map(([app_name, duration_minutes]) => ({ app_name, duration_minutes }))
        .sort((a, b) => b.duration_minutes - a.duration_minutes)
        .slice(0, 15),
      running_apps_now: latestLog?.running_apps ?? [],
      running_app_count: latestLog?.running_apps?.length ?? 0,
      platforms: {
        desktop: logs.filter((l) => l.platform === 'desktop').length,
        android: logs.filter((l) => l.platform === 'android').length,
        web: logs.filter((l) => l.platform === 'web').length,
        ios: logs.filter((l) => l.platform === 'ios').length,
      },
    };

    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
