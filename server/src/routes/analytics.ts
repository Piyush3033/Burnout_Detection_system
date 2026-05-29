import express, { Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import BurnoutScore from '../models/BurnoutScore.js';
import ActivityLog from '../models/ActivityLog.js';

const router = express.Router();

// GET /api/analytics/scores?range=7d|30d|90d
router.get('/scores', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const range = (req.query.range as string) || '7d';
    const days = range.endsWith('d') ? parseInt(range.slice(0, -1)) : parseInt(range) || 7;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const scores = await BurnoutScore.find({
      user_id: req.userId,
      timestamp: { $gte: startDate },
    })
      .sort({ timestamp: 1 })
      .limit(1000);

    // Build chart data: one entry per day in range (oldest first)
    const chartData: Array<{ date: string; score: number }> = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayKeyStart = new Date(d);
      const dayKeyEnd = new Date(d);
      dayKeyEnd.setHours(23, 59, 59, 999);

      const dayScores = scores.filter((s: any) => {
        const ts = new Date(s.timestamp);
        return ts >= dayKeyStart && ts <= dayKeyEnd;
      });

      if (dayScores.length) {
        // use latest score of the day
        const latest = dayScores[dayScores.length - 1];
        chartData.push({ date: d.toISOString().split('T')[0], score: Math.round(latest.score) });
      } else {
        chartData.push({ date: d.toISOString().split('T')[0], score: 0 });
      }
    }

    // Activity distribution (hourly) - simple aggregation from ActivityLog
    const activityData: Array<{ hour: number; activity: number }> = [];
    // initialize 24 hours
    for (let h = 0; h < 24; h++) activityData.push({ hour: h, activity: 0 });

    const activityLogs = await ActivityLog.find({
      user_id: req.userId,
      timestamp: { $gte: startDate },
    }).limit(2000);

    activityLogs.forEach((l: any) => {
      try {
        const ts = new Date(l.timestamp);
        const hour = ts.getHours();
        activityData[hour].activity += l.data?.screen_time_minutes ?? 0;
      } catch (e) {}
    });

    res.json({ chartData, activityData });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
