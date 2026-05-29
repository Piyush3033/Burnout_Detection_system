'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { adminAPI } from '@/app/lib/api';
import { Button } from '@/components/ui/button';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { ArrowLeft, Mail, MapPin, Calendar, AlertTriangle, Trash2, Lock, CheckCircle } from 'lucide-react';
import Link from 'next/link';

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const [actionError, setActionError] = useState('');
  const [actionMessage, setActionMessage] = useState('');

  const { data, error, isLoading } = useSWR(
    params.id ? `/api/admin/users/${params.id}` : null,
    () => adminAPI.getUserDetails(params.id)
  );

  const user = data?.user || {
    email: '',
    full_name: '',
    status: 'active',
    role: 'user',
  };

  const latestScore = data?.latest_burnout_score;

  const burnoutTrend = Array.from({ length: 30 }, (_, i) => ({
    date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    score: Math.floor(Math.random() * 40) + 40,
  }));

  const activityData = [
    { date: 'Mon', active: 8, idle: 2, sleep: 8 },
    { date: 'Tue', active: 7, idle: 3, sleep: 8 },
    { date: 'Wed', active: 9, idle: 1, sleep: 8 },
    { date: 'Thu', active: 6, idle: 4, sleep: 8 },
    { date: 'Fri', active: 8, idle: 2, sleep: 8 },
    { date: 'Sat', active: 5, idle: 5, sleep: 8 },
    { date: 'Sun', active: 7, idle: 3, sleep: 8 },
  ];

  const handleSendNotification = async () => {
    setActionError('');
    setActionMessage('');

    try {
      const response = await adminAPI.sendUserNotification(
        params.id,
        'Please review your burnout report and follow the recommended wellness actions.'
      );
      setActionMessage((response as any)?.message || 'Notification sent successfully');
    } catch (err: any) {
      setActionError(err.data?.error || 'Failed to send notification');
    }
  };

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <Link href="/admin">
          <Button variant="ghost" className="mb-4 hover:bg-primary/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Admin
          </Button>
        </Link>

        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">{user.full_name || user.email || `User ${params.id}`}</h1>
            <p className="text-muted-foreground">{user.email || 'No email available'}</p>
            {user.role && <p className="text-xs text-muted-foreground mt-2 capitalize">Role: {user.role}</p>}
          </div>
          <div className={`px-4 py-2 rounded-lg font-semibold text-sm ${latestScore?.risk_level === 'high' || user.status === 'active' ? 'bg-orange-500/20 border border-orange-500/50 text-orange-300' : 'bg-green-500/20 border border-green-500/50 text-green-300'}`}>
            {user.status?.toUpperCase() || 'ACTIVE'}
          </div>
        </div>
      </motion.div>

      {actionError && <p className="text-destructive text-sm mb-4">{actionError}</p>}
      {actionMessage && <p className="text-green-400 text-sm mb-4">{actionMessage}</p>}

      <motion.div variants={{ show: { transition: { staggerChildren: 0.1 } } }} initial="hidden" animate="show" className="space-y-6">
        {/* User Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <motion.div variants={item} className="cyber-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <Calendar className="w-4 h-4 text-primary" />
              <span className="text-sm text-muted-foreground">Joined</span>
            </div>
            <p className="text-lg font-semibold">{new Date(user.created_at || Date.now()).toLocaleDateString()}</p>
          </motion.div>

          <motion.div variants={item} className="cyber-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="text-sm text-muted-foreground">Last Active</span>
            </div>
            <p className="text-lg font-semibold">{latestScore?.timestamp ? new Date(latestScore.timestamp).toLocaleString() : 'N/A'}</p>
          </motion.div>

          <motion.div variants={item} className="cyber-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <AlertTriangle className="w-4 h-4 text-secondary" />
              <span className="text-sm text-muted-foreground">Latest Score</span>
            </div>
            <p className="text-lg font-semibold">{latestScore?.score ?? 'N/A'}</p>
          </motion.div>

          <motion.div variants={item} className="cyber-card p-6">
            <div className="flex items-center gap-3 mb-2">
              <MapPin className="w-4 h-4 text-purple-400" />
              <span className="text-sm text-muted-foreground">Status</span>
            </div>
            <p className="text-lg font-semibold capitalize">{user.status || 'active'}</p>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Burnout Trend */}
          <motion.div variants={item} className="cyber-card p-6">
            <h3 className="text-lg font-bold mb-4">Burnout Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={burnoutTrend}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff006e" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#ff006e" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                <XAxis dataKey="date" stroke="#8892b0" style={{ fontSize: '12px' }} />
                <YAxis stroke="#8892b0" style={{ fontSize: '12px' }} domain={[0, 100]} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid rgba(0, 217, 255, 0.3)' }} />
                <Area type="monotone" dataKey="score" stroke="#ff006e" fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Activity Pattern */}
          <motion.div variants={item} className="cyber-card p-6">
            <h3 className="text-lg font-bold mb-4">Weekly Activity Pattern</h3>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={activityData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                <XAxis dataKey="date" stroke="#8892b0" style={{ fontSize: '12px' }} />
                <YAxis stroke="#8892b0" style={{ fontSize: '12px' }} />
                <Tooltip contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid rgba(0, 217, 255, 0.3)' }} />
                <Area type="monotone" dataKey="active" stackId="1" stroke="#00ff88" fill="#00ff88" fillOpacity={0.6} />
                <Area type="monotone" dataKey="idle" stackId="1" stroke="#ffa500" fill="#ffa500" fillOpacity={0.6} />
                <Area type="monotone" dataKey="sleep" stackId="1" stroke="#00d9ff" fill="#00d9ff" fillOpacity={0.6} />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>
        </div>

        {/* Actions */}
        <motion.div variants={item} className="cyber-card p-6">
          <h3 className="text-lg font-bold mb-4">Admin Actions</h3>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-primary hover:bg-primary/80" onClick={handleSendNotification}>
              <Mail className="w-4 h-4 mr-2" />
              Send Notification
            </Button>
            <Button variant="outline" className="border-secondary/50 hover:bg-secondary/10">
              <AlertTriangle className="w-4 h-4 mr-2" />
              Generate Report
            </Button>
            <Button variant="outline" className="border-destructive/50 hover:bg-destructive/10 text-destructive hover:text-destructive">
              <Lock className="w-4 h-4 mr-2" />
              Suspend Account
            </Button>
            <Button variant="outline" className="border-destructive/50 hover:bg-destructive/10 text-destructive hover:text-destructive">
              <Trash2 className="w-4 h-4 mr-2" />
              Delete User
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
}
