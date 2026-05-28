import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  user_id: mongoose.Types.ObjectId;
  timestamp: Date;
  platform: 'desktop' | 'android' | 'web' | 'ios';
  data: {
    screen_time_minutes: number;
    active_window: string;
    idle_time_minutes: number;
    app_switches: number;
    is_late_night: boolean;
    break_taken: boolean;
    app_name?: string;
    duration_minutes?: number;
  };
  app_usage?: Array<{ app_name: string; duration_minutes: number }>;
  system?: {
    cpu_percent?: number;
    memory_percent?: number;
    memory_available_mb?: number;
    disk_percent?: number;
    disk_available_gb?: number;
    cpu_uptime_seconds?: number;
    active_window?: string;
    active_window_changes?: number;
  };
}

const activityLogSchema = new Schema<IActivityLog>(
  {
    user_id: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    timestamp: {
      type: Date,
      required: true,
      default: Date.now
    },
    platform: {
      type: String,
      enum: ['desktop', 'android', 'web', 'ios'],
      default: 'desktop'
    },
    app_usage: [
      {
        app_name: { type: String, default: 'unknown' },
        duration_minutes: { type: Number, default: 0 }
      }
    ],
    data: {
      screen_time_minutes: { type: Number, default: 0 },
      active_window: { type: String, default: '' },
      idle_time_minutes: { type: Number, default: 0 },
      app_switches: { type: Number, default: 0 },
      is_late_night: { type: Boolean, default: false },
      break_taken: { type: Boolean, default: false }
    },
    system: {
      cpu_percent: { type: Number, default: 0 },
      memory_percent: { type: Number, default: 0 },
      memory_available_mb: { type: Number, default: 0 },
      disk_percent: { type: Number, default: 0 },
      disk_available_gb: { type: Number, default: 0 },
      cpu_uptime_seconds: { type: Number, default: 0 },
      active_window: { type: String, default: '' },
      active_window_changes: { type: Number, default: 0 }
    }
  },
  { collection: 'activity_logs' }
);

// TTL index: automatically delete records older than 90 days
activityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
// Compound index for efficient queries
activityLogSchema.index({ user_id: 1, timestamp: -1 });

export default mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
