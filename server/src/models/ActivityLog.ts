import mongoose, { Schema, Document } from 'mongoose';

export interface IActivityLog extends Document {
  user_id: mongoose.Types.ObjectId;
  timestamp: Date;
  data: {
    screen_time_minutes: number;
    active_window: string;
    idle_time_minutes: number;
    app_switches: number;
    is_late_night: boolean;
    break_taken: boolean;
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
    data: {
      screen_time_minutes: { type: Number, default: 0 },
      active_window: { type: String, default: '' },
      idle_time_minutes: { type: Number, default: 0 },
      app_switches: { type: Number, default: 0 },
      is_late_night: { type: Boolean, default: false },
      break_taken: { type: Boolean, default: false }
    }
  },
  { collection: 'activity_logs' }
);

// TTL index: automatically delete records older than 90 days
activityLogSchema.index({ timestamp: 1 }, { expireAfterSeconds: 7776000 });
// Compound index for efficient queries
activityLogSchema.index({ user_id: 1, timestamp: -1 });

export default mongoose.model<IActivityLog>('ActivityLog', activityLogSchema);
