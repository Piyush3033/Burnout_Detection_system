import express, { Response } from 'express';
import { authMiddleware, AuthRequest } from '../middleware/auth.js';
import User from '../models/User.js';
import BurnoutScore from '../models/BurnoutScore.js';

const router = express.Router();

// Get user profile
router.get('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.userId).select('-password_hash');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Update user profile
router.put('/profile', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const { full_name, timezone, settings } = req.body;

    const user = await User.findByIdAndUpdate(
      req.userId,
      {
        ...(full_name && { full_name }),
        ...(timezone && { timezone }),
        ...(settings && { settings }),
        updated_at: new Date()
      },
      { new: true }
    ).select('-password_hash');

    res.json(user);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get current burnout score
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
        message: 'No data available yet'
      });
    }

    res.json(latestScore);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Get burnout score history (last N days)
router.get('/burnout-history', authMiddleware, async (req: AuthRequest, res: Response) => {
  try {
    const days = parseInt(req.query.days as string) || 30;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const scores = await BurnoutScore.find({
      user_id: req.userId,
      timestamp: { $gte: startDate }
    })
      .sort({ timestamp: -1 })
      .limit(1000);

    res.json({
      user_id: req.userId,
      days,
      count: scores.length,
      scores
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
