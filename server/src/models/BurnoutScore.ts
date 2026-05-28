import mongoose, { Schema, Document } from 'mongoose';

export interface IBurnoutScore extends Document {
  user_id: mongoose.Types.ObjectId;
  timestamp: Date;
  score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  components: {
    screen_time: number;
    break_frequency: number;
    sleep_quality: number;
    physical_activity: number;
    engagement: number;
  };
  recommendation?: string;
  rl_action?: string;
}

const burnoutScoreSchema = new Schema<IBurnoutScore>(
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
    score: {
      type: Number,
      required: true,
      min: 0,
      max: 100
    },
    risk_level: {
      type: String,
      enum: ['low', 'medium', 'high', 'critical'],
      required: true
    },
    components: {
      screen_time: { type: Number, required: true },
      break_frequency: { type: Number, required: true },
      sleep_quality: { type: Number, required: true },
      physical_activity: { type: Number, required: true },
      engagement: { type: Number, required: true }
    },
    recommendation: { type: String },
    rl_action: { type: String }
  },
  { collection: 'burnout_scores' }
);

// TTL index: automatically delete records older than 180 days
burnoutScoreSchema.index({ timestamp: 1 }, { expireAfterSeconds: 15552000 });
// Compound indexes for efficient queries
burnoutScoreSchema.index({ user_id: 1, timestamp: -1 });
burnoutScoreSchema.index({ risk_level: 1 });

export default mongoose.model<IBurnoutScore>('BurnoutScore', burnoutScoreSchema);
