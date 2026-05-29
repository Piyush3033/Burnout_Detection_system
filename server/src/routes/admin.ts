import express, { Response } from 'express';
import { authMiddleware, adminMiddleware, AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';
import BurnoutScore from '../models/BurnoutScore.js';
import ActivityLog from '../models/ActivityLog.js';

const router = express.Router();

// Get all users
router.get('/users', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 20;
    const skip = (page - 1) * limit;

    const users = await User.find()
      .select('-password_hash')
      .skip(skip)
      .limit(limit)
      .sort({ created_at: -1 });

    const total = await User.countDocuments();

    res.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit),
      users
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user details (admin)
router.get('/users/:userId', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.params.userId).select('-password_hash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const latestScore = await BurnoutScore.findOne({ user_id: req.params.userId })
      .sort({ timestamp: -1 })
      .limit(1);

    res.json({
      user,
      latest_burnout_score: latestScore
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get system analytics
router.get('/analytics', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const activeUsers = await User.countDocuments({ status: 'active' });
    const adminUsers = await User.countDocuments({ role: 'admin' });

    // High risk users (burnout score > 70)
    const highRiskUsers = await BurnoutScore.aggregate([
      { $match: { score: { $gte: 70 } } },
      { $sort: { timestamp: -1 } },
      {
        $group: {
          _id: '$user_id',
          latest_score: { $first: '$score' },
          latest_timestamp: { $first: '$timestamp' }
        }
      },
      { $limit: 100 }
    ]);

    const avgBurnoutScore = await BurnoutScore.aggregate([
      { $group: { _id: null, avg: { $avg: '$score' } } }
    ]);

    res.json({
      total_users: totalUsers,
      active_users: activeUsers,
      admin_users: adminUsers,
      high_risk_users: highRiskUsers.length,
      average_burnout_score: avgBurnoutScore[0]?.avg || 0,
      timestamp: new Date().toISOString()
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user and all associated data (admin)
router.delete('/users/:userId', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.params.userId;

    if (userId === req.userId) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    await Promise.all([
      ActivityLog.deleteMany({ user_id: userId }),
      BurnoutScore.deleteMany({ user_id: userId }),
      User.findByIdAndDelete(userId),
    ]);

    res.json({ message: 'User and all associated data deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Deactivate user (admin)
router.post('/users/:userId/deactivate', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { status: 'inactive', updated_at: new Date() },
      { new: true }
    ).select('-password_hash');

    res.json({
      message: 'User deactivated successfully',
      user
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Send a notification to a specific user (admin)
router.post('/users/:userId/notify', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { message } = req.body;
    const user = await User.findById(req.params.userId).select('-password_hash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // In a production implementation, this would enqueue an email / push notification.
    // For now, return success and include which user would receive the alert.
    res.json({
      message: `Notification sent to ${user.email}`,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
      },
      note: message || 'No message provided',
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get system-wide statistics
router.get('/system-stats', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const totalUsers = await User.countDocuments();
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const newUsersThisWeek = await User.countDocuments({ created_at: { $gte: oneWeekAgo } });
    
    // Active sessions (users who logged in today)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const activeSessions = await User.countDocuments({ last_login: { $gte: today } });
    
    const totalScoresCalculated = await BurnoutScore.countDocuments();
    const scoresCalculatedToday = await BurnoutScore.countDocuments({ 
      timestamp: { $gte: today } 
    });
    
    const criticalAlerts = await BurnoutScore.countDocuments({ 
      risk_level: 'critical',
      timestamp: { $gte: oneWeekAgo }
    });

    res.json({
      totalUsers,
      newUsersThisWeek,
      activeSessions,
      activeSessionsPercent: totalUsers > 0 ? ((activeSessions / totalUsers) * 100).toFixed(1) : 0,
      totalScoresCalculated,
      scoresCalculatedToday,
      criticalAlerts
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get user risk distribution and growth statistics
router.get('/user-stats', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Risk distribution
    const riskDistribution = await BurnoutScore.aggregate([
      {
        $group: {
          _id: '$risk_level',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Format risk distribution
    const formattedRisk = [
      { risk: 'low', count: riskDistribution.find((r: any) => r._id === 'low')?.count || 0 },
      { risk: 'moderate', count: riskDistribution.find((r: any) => r._id === 'moderate')?.count || 0 },
      { risk: 'high', count: riskDistribution.find((r: any) => r._id === 'high')?.count || 0 },
      { risk: 'critical', count: riskDistribution.find((r: any) => r._id === 'critical')?.count || 0 }
    ];

    // User growth trend (last 30 days)
    const growthTrend = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      
      const nextDate = new Date(date);
      nextDate.setDate(nextDate.getDate() + 1);

      const count = await User.countDocuments({ 
        created_at: { $gte: date, $lt: nextDate } 
      });

      growthTrend.push({
        date: date.toISOString().split('T')[0],
        users: count
      });
    }

    res.json({
      riskDistribution: formattedRisk,
      growthTrend
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get job logs
router.get('/job-logs', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Mock job logs structure - in production, these come from ML service
    const jobs = [
      {
        id: 'job-1',
        type: 'hourly_score_calculation',
        status: 'success',
        lastRun: new Date().toLocaleString(),
        duration: '45s'
      },
      {
        id: 'job-2',
        type: 'daily_aggregation',
        status: 'success',
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleString(),
        duration: '2m 15s'
      },
      {
        id: 'job-3',
        type: 'trend_analysis',
        status: 'success',
        lastRun: new Date(Date.now() - 24 * 60 * 60 * 1000).toLocaleString(),
        duration: '1m 30s'
      },
      {
        id: 'job-4',
        type: 'forecasting',
        status: 'success',
        lastRun: new Date(Date.now() - 6 * 60 * 60 * 1000).toLocaleString(),
        duration: '3m 45s'
      },
      {
        id: 'job-5',
        type: 'alert_generation',
        status: 'success',
        lastRun: new Date(Date.now() - 60 * 60 * 1000).toLocaleString(),
        duration: '30s'
      }
    ];

    res.json({ jobs });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get alert statistics
router.get('/alert-stats', authMiddleware, adminMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    // Mock alert data - in production, this comes from alerts collection
    const oneWeekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    
    const recentAlerts = await BurnoutScore.aggregate([
      {
        $match: {
          risk_level: { $in: ['high', 'critical'] },
          timestamp: { $gte: oneWeekAgo }
        }
      },
      {
        $sort: { timestamp: -1 }
      },
      {
        $limit: 10
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user_id',
          foreignField: '_id',
          as: 'user'
        }
      },
      {
        $unwind: '$user'
      }
    ]);

    const formattedAlerts = recentAlerts.map((alert: any) => ({
      id: alert._id,
      user: alert.user.full_name || alert.user.email,
      message: `${alert.risk_level.toUpperCase()} burnout risk detected - Score: ${alert.score}`,
      severity: alert.risk_level === 'critical' ? 'critical' : 'high',
      timestamp: new Date(alert.timestamp).toLocaleString()
    }));

    res.json({
      recentAlerts: formattedAlerts
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
