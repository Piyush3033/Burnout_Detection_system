import express, { Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import ActivityLog from '../models/ActivityLog.js';
import BurnoutScore from '../models/BurnoutScore.js';

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
  activity: z.object({
    screen_time_minutes: z.number().min(0).optional(),
    active_window: z.string().optional(),
    idle_time_seconds: z.number().min(0).optional(),
    app_switches: z.number().min(0).optional(),
    is_late_night: z.boolean().optional(),
    break_taken: z.boolean().optional(),
    total_activity_score: z.number().min(0).optional()
  }).optional(),
  system: z.object({
    cpu_percent: z.number().min(0).optional(),
    memory_percent: z.number().min(0).optional(),
    memory_available_mb: z.number().optional(),
    disk_percent: z.number().min(0).optional(),
    disk_available_gb: z.number().optional(),
    cpu_uptime_seconds: z.number().min(0).optional(),
    active_window: z.string().optional(),
    active_window_changes: z.number().min(0).optional()
  }).optional(),
  timestamp: z.string().optional()
});

const batchSchema = z.object({
  entries: z.array(activityInputSchema).min(1)
});

function normalizeActivityPayload(data: z.infer<typeof activityInputSchema>) {
  const activity = data.activity || {};

  const screen_time_minutes = data.screen_time_minutes ?? activity.screen_time_minutes ?? 0;
  const idle_time_minutes = data.idle_time_minutes ?? (activity.idle_time_seconds !== undefined ? Math.round(activity.idle_time_seconds / 60) : 0);
  const app_switches = data.app_switches ?? activity.app_switches ?? 0;
  const is_late_night = data.is_late_night ?? activity.is_late_night ?? false;
  const break_taken = data.break_taken ?? activity.break_taken ?? false;
  const active_window = data.active_window ?? activity.active_window ?? 'unknown';

  return {
    screen_time_minutes,
    active_window,
    idle_time_minutes,
    app_switches,
    is_late_night,
    break_taken
  };
}

function normalizeSystemPayload(data: z.infer<typeof activityInputSchema>) {
  return data.system || {};
}

function parseTimestamp(value?: string): Date {
  return value ? new Date(value) : new Date();
}

function calculateBurnoutComponents(logData: ReturnType<typeof normalizeActivityPayload>) {
  const screenTimeScore = Math.min(100, (logData.screen_time_minutes / 600) * 100);
  const breakScore = logData.break_taken ? 100 : 50;
  const sleepScore = logData.is_late_night ? 30 : 80;
  const physicalActivityScore = Math.min(100, logData.app_switches * 8);
  const engagementScore = Math.max(0, 100 - logData.idle_time_minutes * 8);

  const score = Math.round(
    screenTimeScore * 0.28 +
    breakScore * 0.18 +
    sleepScore * 0.18 +
    physicalActivityScore * 0.18 +
    engagementScore * 0.18
  );

  const risk_level =
    score >= 75 ? 'critical' :
    score >= 50 ? 'high' :
    score >= 25 ? 'medium' :
    'low';

  return {
    score,
    risk_level,
    components: {
      screen_time: parseFloat(screenTimeScore.toFixed(2)),
      break_frequency: parseFloat(breakScore.toFixed(2)),
      sleep_quality: parseFloat(sleepScore.toFixed(2)),
      physical_activity: parseFloat(physicalActivityScore.toFixed(2)),
      engagement: parseFloat(engagementScore.toFixed(2))
    }
  };
}

async function saveBurnoutScoreInternal(userId: string, logData: ReturnType<typeof normalizeActivityPayload>, timestamp: any) {
  const result = calculateBurnoutComponents(logData);
  const scoreTimestamp = typeof timestamp === 'string' ? new Date(timestamp) : timestamp ?? new Date();

  const score = new BurnoutScore({
    user_id: userId,
    timestamp: scoreTimestamp,
    score: result.score,
    risk_level: result.risk_level,
    components: result.components
  });

  await score.save();
  return score;
}

// Log activity from desktop agent
router.post('/log', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const payload = activityInputSchema.parse(req.body);
    const normalized = normalizeActivityPayload(payload);
    const parsedTimestamp: Date = parseTimestamp(payload.timestamp as string | undefined);

    const systemPayload = normalizeSystemPayload(payload);
    const activityLog = new ActivityLog({
      user_id: req.userId,
      timestamp: parsedTimestamp,
      data: normalized,
      system: systemPayload
    });

    await activityLog.save();
    // @ts-ignore: parsedTimestamp is a Date via parseTimestamp helper
    const burnoutScore = await saveBurnoutScoreInternal(req.userId, normalized, parsedTimestamp);

    res.status(201).json({
      message: 'Activity logged successfully',
      activity: activityLog,
      burnout_score: burnoutScore
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
      const parsedTimestamp: Date = parseTimestamp(entry.timestamp as string | undefined);

      const systemPayload = normalizeSystemPayload(entry);
      const activityLog = new ActivityLog({
        user_id: req.userId,
        timestamp: parsedTimestamp,
        data: normalized,
        system: systemPayload
      });
      await activityLog.save();
      createdLogs.push(activityLog);

      // @ts-ignore: parsedTimestamp is a Date via parseTimestamp helper
      const burnoutScore = await saveBurnoutScoreInternal(req.userId, normalized, parsedTimestamp);
      createdScores.push(burnoutScore);
    }

    res.status(201).json({
      message: 'Batch activity logged successfully',
      count: createdLogs.length,
      activities: createdLogs,
      burnout_scores: createdScores
    });
  } catch (error: any) {
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Get activity logs (last N days)
router.get('/logs', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const logs = await ActivityLog.find({
      user_id: req.userId,
      timestamp: { $gte: startDate }
    })
      .sort({ timestamp: -1 })
      .limit(500);

    res.json({
      user_id: req.userId,
      days,
      count: logs.length,
      logs
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get daily summary
router.get('/daily-summary', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const date = req.query.date ? new Date(req.query.date as string) : new Date();
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    const logs = await ActivityLog.find({
      user_id: req.userId,
      timestamp: { $gte: startOfDay, $lte: endOfDay }
    });

    const appUsageMap: Record<string, number> = {};
    const totalCpuPercent = logs.reduce((sum, log) => sum + (log.system?.cpu_percent ?? 0), 0);
    const totalMemoryPercent = logs.reduce((sum, log) => sum + (log.system?.memory_percent ?? 0), 0);
    const totalSystemLogs = logs.filter((log) => log.system !== undefined).length;

    logs.forEach((log) => {
      const appName = log.system?.active_window || log.data.active_window || 'unknown';
      appUsageMap[appName] = (appUsageMap[appName] || 0) + 1;
    });

    const topApplication = Object.entries(appUsageMap).sort((a, b) => b[1] - a[1])[0]?.[0] || 'unknown';
    const maxCpuUptime = logs.reduce((max, log) => Math.max(max, log.system?.cpu_uptime_seconds ?? 0), 0);

    const summary = {
      date: date.toISOString().split('T')[0],
      total_screen_time: logs.reduce((sum, log) => sum + log.data.screen_time_minutes, 0),
      total_idle_time: logs.reduce((sum, log) => sum + log.data.idle_time_minutes, 0),
      total_app_switches: logs.reduce((sum, log) => sum + log.data.app_switches, 0),
      breaks_taken: logs.filter(log => log.data.break_taken).length,
      log_count: logs.length,
      late_night_usage: logs.filter(log => log.data.is_late_night).length > 0,
      avg_cpu_percent: totalSystemLogs ? parseFloat((totalCpuPercent / totalSystemLogs).toFixed(2)) : 0,
      avg_memory_percent: totalSystemLogs ? parseFloat((totalMemoryPercent / totalSystemLogs).toFixed(2)) : 0,
      cpu_uptime_seconds: maxCpuUptime,
      top_application: topApplication
    };

    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
