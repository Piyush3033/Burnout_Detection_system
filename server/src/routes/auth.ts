import express, { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import User from '../models/User.js';

const router = express.Router();

// Validation schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  full_name: z.string().optional(),
  timezone: z.string().default('UTC')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6)
});

// Register endpoint
router.post('/register', async (req: Request, res: Response) => {
  try {
    const body = registerSchema.parse(req.body);

    // Check if user already exists
    const existingUser = await User.findOne({ email: body.email });
    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Create new user
    const user = new User({
      email: body.email,
      password_hash: body.password,
      full_name: body.full_name || '',
      timezone: body.timezone,
      role: 'user',
      status: 'active'
    });

    await user.save();

    // Generate JWT token
    const jwtSecret = (process.env.JWT_SECRET || 'secret') as jwt.Secret;
    const jwtOptions = { expiresIn: process.env.JWT_EXPIRY || '7d' } as jwt.SignOptions;
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      jwtSecret,
      jwtOptions
    );

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error: any) {
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

// Login endpoint
router.post('/login', async (req: Request, res: Response) => {
  try {
    const body = loginSchema.parse(req.body);

    // Find user
    const user = await User.findOne({ email: body.email });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check password
    const isPasswordValid = await user.comparePassword(body.password);
    if (!isPasswordValid) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    // Check user status
    if (user.status !== 'active') {
      return res.status(403).json({ error: 'User account is not active' });
    }

    // Generate JWT token
    const jwtSecret = (process.env.JWT_SECRET || 'secret') as jwt.Secret;
    const jwtOptions = { expiresIn: process.env.JWT_EXPIRY || '7d' } as jwt.SignOptions;
    const token = jwt.sign(
      { userId: user._id, role: user.role },
      jwtSecret,
      jwtOptions
    );

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        full_name: user.full_name,
        role: user.role
      }
    });
  } catch (error: any) {
    if (error.errors) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    res.status(500).json({ error: error.message });
  }
});

export default router;
