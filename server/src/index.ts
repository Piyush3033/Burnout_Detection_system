import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDatabase } from './config/database.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRoutes from './routes/auth.js';
import userRoutes from './routes/user.js';
import activityRoutes from './routes/activity.js';
import adminRoutes from './routes/admin.js';
import analyticsRoutes from './routes/analytics.js';
import User from './models/User.js';

dotenv.config();

const app: Express = express();
const PORT = process.env.PORT || 5000;

// Middleware
// Configure CORS: allow a comma-separated list in CORS_ORIGIN
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:3000')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: (origin, cb) => {
      // Allow non-browser requests (like curl, server-side) when no origin is present
      if (!origin) return cb(null, true);
      if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) return cb(null, true);
      return cb(null, false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/user', userRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler (must be last)
app.use(errorHandler);

// Initialize admin user
async function initializeAdmin() {
  try {
    const adminEmail = 'admin@gmail.com';
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (!existingAdmin) {
      const adminUser = new User({
        email: adminEmail,
        password_hash: 'admin123',
        full_name: 'System Administrator',
        timezone: 'UTC',
        role: 'admin',
        status: 'active'
      });

      await adminUser.save();
      console.log('✅ Admin user created: admin@gmail.com / admin123');
    } else if (existingAdmin.role !== 'admin') {
      existingAdmin.role = 'admin';
      await existingAdmin.save();
      console.log('✅ Admin user updated: admin@gmail.com');
    } else {
      console.log('✅ Admin user already exists: admin@gmail.com');
    }
  } catch (error: any) {
    console.error('⚠️ Failed to initialize admin:', error.message);
  }
}

// Connect to MongoDB and start server
async function startServer() {
  try {
    await connectDatabase();
    console.log('✅ Connected to MongoDB');

    // Initialize admin user
    await initializeAdmin();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📡 Backend: http://localhost:${PORT}`);
      console.log(`\n🔐 Default Admin Credentials:`);
      console.log(`   Email: admin@gmail.com`);
      console.log(`   Password: admin123`);
      console.log(`\n⚠️  IMPORTANT: Change these credentials in production!\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
