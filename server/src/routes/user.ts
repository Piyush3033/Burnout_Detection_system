import express, { Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';
import BurnoutScore from '../models/BurnoutScore.js';
import ActivityLog from '../models/ActivityLog.js';

const router = express.Router();

function formatUser(user: any) {
  return {
    id: user._id?.toString(),
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    status: user.status,
    timezone: user.timezone,
    settings: user.settings,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}

router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password_hash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(formatUser(user));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { full_name, timezone, settings } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        ...(full_name && { full_name }),
        ...(timezone && { timezone }),
        ...(settings && { settings }),
        updated_at: new Date(),
      },
      { new: true }
    ).select('-password_hash');

    res.json(formatUser(user));
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/preferences', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('settings');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({
      emailAlerts: user.settings?.email_notifications ?? true,
      dailySummary: true,
      desktopNotifications: user.settings?.alerts_enabled ?? true,
      breakReminderInterval: user.settings?.break_reminder_interval ?? 60,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.put('/preferences', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { emailAlerts, desktopNotifications, breakReminderInterval } = req.body;
    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        settings: {
          alerts_enabled: desktopNotifications ?? true,
          email_notifications: emailAlerts ?? true,
          break_reminder_interval: breakReminderInterval ?? 60,
        },
        updated_at: new Date(),
      },
      { new: true }
    ).select('settings');

    res.json({
      emailAlerts: user?.settings?.email_notifications,
      desktopNotifications: user?.settings?.alerts_enabled,
      breakReminderInterval: user?.settings?.break_reminder_interval,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/agent-status', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
    const latestLog = await ActivityLog.findOne({ user_id: req.userId })
      .sort({ timestamp: -1 })
      .limit(1);

    const active = !!latestLog && latestLog.timestamp >= fiveMinutesAgo;

    res.json({
      active,
      lastSync: latestLog?.timestamp?.toISOString() ?? null,
      platform: latestLog?.platform ?? 'none',
      version: '1.0.0',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/burnout-score', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const latestScore = await BurnoutScore.findOne({ user_id: req.userId })
      .sort({ timestamp: -1 })
      .limit(1);

    if (!latestScore) {
      return res.json({
        score: 0,
        risk_level: 'low',
        timestamp: null,
        message: 'No data available yet. Install the desktop agent or enable mobile tracking.',
        components: {
          screen_time: 0,
          break_frequency: 0,
          sleep_quality: 0,
          physical_activity: 0,
          engagement: 0,
        },
      });
    }

    res.json(latestScore);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/burnout-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Fetch any existing scores in the requested range
    const rawScores = await BurnoutScore.find({
      user_id: req.userId,
      timestamp: { $gte: startDate },
    })
      .sort({ timestamp: -1 })
      .limit(1000);

    // Map existing scores by date (YYYY-MM-DD)
    const scoreMap: Record<string, any> = {};
    rawScores.forEach((s: any) => {
      const day = new Date(s.timestamp).toISOString().split('T')[0];
      // keep the most recent score for the day (rawScores already sorted desc)
      if (!scoreMap[day]) scoreMap[day] = s;
    });

    // Build a daily series for the requested range (newest first)
    const scores: any[] = [];
    for (let i = 0; i < days; i++) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dayKey = d.toISOString().split('T')[0];

      if (scoreMap[dayKey]) {
        scores.push(scoreMap[dayKey]);
      } else {
        // default entry when no recorded score exists for that day
        scores.push({
          user_id: req.userId,
          timestamp: new Date(d).toISOString(),
          score: 0,
          risk_level: 'low',
          components: {
            screen_time: 0,
            break_frequency: 0,
            sleep_quality: 0,
            physical_activity: 0,
            engagement: 0,
          },
          // marker to indicate this was generated as a default
          generated: true,
        });
      }
    }

    res.json({
      user_id: req.userId,
      days,
      count: rawScores.length,
      scores,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/recommendations', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const latestScore = await BurnoutScore.findOne({ user_id: req.userId }).sort({ timestamp: -1 });
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const logs = await ActivityLog.find({
      user_id: req.userId,
      timestamp: { $gte: startOfDay },
    });

    const totalScreen = logs.reduce((s, l) => s + l.data.screen_time_minutes, 0);
    const breaks = logs.filter((l) => l.data.break_taken).length;
    const lateNight = logs.some((l) => l.data.is_late_night);

    const recommendations: Array<{
      category: string;
      priority: string;
      action: string;
      reason: string;
      impact: string;
    }> = [];

    if (totalScreen > 480) {
      recommendations.push({
        category: 'screen_time',
        priority: 'high',
        action: 'Reduce continuous screen time — stand up every 45 minutes',
        reason: `Today's screen time is ${Math.round(totalScreen / 60)}h+`,
        impact: 'May lower burnout score by 10–15%',
      });
    }

    if (breaks < 3) {
      recommendations.push({
        category: 'breaks',
        priority: 'high',
        action: 'Take a 5-minute break now',
        reason: `Only ${breaks} breaks logged today`,
        impact: 'May lower burnout score by 15–20%',
      });
    }

    if (lateNight) {
      recommendations.push({
        category: 'sleep',
        priority: 'critical',
        action: 'Stop screen use and prepare for sleep',
        reason: 'Late-night usage detected',
        impact: 'Protects sleep quality and recovery',
      });
    }

    if (latestScore && latestScore.score >= 50) {
      recommendations.unshift({
        category: 'rest',
        priority: latestScore.score >= 75 ? 'critical' : 'high',
        action: latestScore.rl_action
          ? latestScore.rl_action.replace(/_/g, ' ')
          : 'Take a 10–15 minute rest break',
        reason: `Burnout score is ${Math.round(latestScore.score)} (${latestScore.risk_level} risk)`,
        impact: 'Immediate stress reduction',
      });
    }

    if (!recommendations.length) {
      recommendations.push({
        category: 'wellness',
        priority: 'low',
        action: 'Keep your current rhythm — you are in a healthy range',
        reason: 'Metrics look balanced today',
        impact: 'Maintain stable burnout levels',
      });
    }

    res.json({
      score: latestScore?.score ?? 0,
      risk_level: latestScore?.risk_level ?? 'low',
      recommendations,
      generated_at: new Date().toISOString(),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/alerts', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const alerts = await BurnoutScore.find({
      user_id: req.userId,
      timestamp: { $gte: since },
      risk_level: { $in: ['high', 'critical'] },
    })
      .sort({ timestamp: -1 })
      .limit(20);

    res.json({
      alerts: alerts.map((a) => ({
        id: a._id,
        score: a.score,
        risk_level: a.risk_level,
        message:
          a.risk_level === 'critical'
            ? 'Critical burnout level — take a rest break immediately'
            : 'High stress detected — consider a short break',
        recommendation: a.recommendation,
        timestamp: a.timestamp,
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
