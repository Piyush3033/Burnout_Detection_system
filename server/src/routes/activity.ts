import express, { Response } from 'express';
import { z } from 'zod';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import ActivityLog from '../models/ActivityLog.js';

const router = express.Router();

const activitySchema = z.object({
  screen_time_minutes: z.number().min(0),
  active_window: z.string(),
  idle_time_minutes: z.number().min(0),
  app_switches: z.number().min(0),
  is_late_night: z.boolean(),
  break_taken: z.boolean()
});

// Log activity from desktop agent
router.post('/log', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const data = activitySchema.parse(req.body);

    const activityLog = new ActivityLog({
      user_id: req.userId,
      timestamp: new Date(),
      data
    });

    await activityLog.save();

    res.status(201).json({
      message: 'Activity logged successfully',
      activity: activityLog
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

    const summary = {
      date: date.toISOString().split('T')[0],
      total_screen_time: logs.reduce((sum, log) => sum + log.data.screen_time_minutes, 0),
      total_idle_time: logs.reduce((sum, log) => sum + log.data.idle_time_minutes, 0),
      total_app_switches: logs.reduce((sum, log) => sum + log.data.app_switches, 0),
      breaks_taken: logs.filter(log => log.data.break_taken).length,
      log_count: logs.length,
      late_night_usage: logs.filter(log => log.data.is_late_night).length > 0
    };

    res.json(summary);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
