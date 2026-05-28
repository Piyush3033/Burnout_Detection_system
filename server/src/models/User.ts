import mongoose, { Schema, Document } from 'mongoose';
import bcryptjs from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  password_hash: string;
  full_name: string;
  timezone: string;
  role: 'user' | 'admin';
  status: 'active' | 'inactive' | 'suspended';
  settings: {
    alerts_enabled: boolean;
    email_notifications: boolean;
    break_reminder_interval: number;
  };
  created_at: Date;
  updated_at: Date;
  comparePassword(password: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    password_hash: {
      type: String,
      required: true
    },
    full_name: {
      type: String,
      required: false
    },
    timezone: {
      type: String,
      default: 'UTC'
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user'
    },
    status: {
      type: String,
      enum: ['active', 'inactive', 'suspended'],
      default: 'active'
    },
    settings: {
      alerts_enabled: { type: Boolean, default: true },
      email_notifications: { type: Boolean, default: true },
      break_reminder_interval: { type: Number, default: 60 }
    },
    created_at: {
      type: Date,
      default: Date.now
    },
    updated_at: {
      type: Date,
      default: Date.now
    }
  },
  { collection: 'users' }
);

// Hash password before saving
userSchema.pre<IUser>('save', async function (next) {
  if (!this.isModified('password_hash')) return next();

  try {
    const salt = await bcryptjs.genSalt(10);
    this.password_hash = await bcryptjs.hash(this.password_hash, salt);
    next();
  } catch (error) {
    next(error as any);
  }
});

// Method to compare passwords
userSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcryptjs.compare(password, this.password_hash);
};

export default mongoose.model<IUser>('User', userSchema);
