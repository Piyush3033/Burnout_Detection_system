'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/AuthContext';
import { motion } from 'framer-motion';
import useSWR from 'swr';
import { adminAPI } from '@/app/lib/api';
import { Users, Activity, AlertTriangle, Zap, TrendingUp, BarChart3, Shield, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import Link from 'next/link';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function AdminDashboard() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedUser, setSelectedUser] = useState<any>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'admin';

  const { data: systemStats } = useSWR('/api/admin/system-stats', () => adminAPI.getSystemStats());
  const { data: userStats } = useSWR('/api/admin/user-stats', () => adminAPI.getUserStats());
  const { data: jobLogs } = useSWR('/api/admin/job-logs', () => adminAPI.getJobLogs());
  const { data: alertStats } = useSWR('/api/admin/alert-stats', () => adminAPI.getAlertStats());

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="cyber-card p-8 text-center max-w-md">
          <Shield className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Access Denied</h1>
          <p className="text-muted-foreground mb-6">You do not have permission to access the admin dashboard.</p>
          <Link href="/dashboard">
            <Button className="w-full">Go to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, trend, color }: any) => (
    <motion.div variants={item} className="cyber-card p-6 hover:shadow-2xl">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          <h3 className="text-3xl font-bold text-foreground">{value}</h3>
          {trend !== undefined && (
            <p className={`text-xs mt-2 ${trend > 0 ? 'text-green-400' : 'text-destructive'}`}>
              {trend > 0 ? '↑' : '↓'} {Math.abs(trend)}% from last period
            </p>
          )}
        </div>
        <Icon className={`w-8 h-8 ${color}`} />
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent mb-2">
              Admin Control Center
            </h1>
            <p className="text-muted-foreground">System monitoring and user management</p>
          </div>
          <Link href="/admin/settings">
            <Button variant="outline" size="icon" className="border-primary/50 hover:bg-primary/10">
              <Settings className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {/* Key Metrics */}
        {systemStats && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Users} label="Total Users" value={systemStats.totalUsers} trend={systemStats.newUsersThisWeek} color="text-primary" />
            <StatCard icon={Activity} label="Active Sessions" value={systemStats.activeSessions} trend={systemStats.activeSessionsPercent} color="text-green-400" />
            <StatCard icon={Zap} label="Scores Calculated" value={systemStats.scoresCalculatedToday} trend={5} color="text-purple-400" />
            <StatCard icon={AlertTriangle} label="Critical Alerts" value={systemStats.criticalAlerts} trend={-2} color="text-destructive" />
          </div>
        )}

        {/* Main Tabs */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-4 bg-black/30 border border-border">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="alerts">Alerts</TabsTrigger>
            <TabsTrigger value="jobs">Jobs</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Risk Distribution */}
              {userStats?.riskDistribution && (
                <motion.div variants={item} className="cyber-card p-6">
                  <h3 className="text-lg font-bold mb-4">User Risk Distribution</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie data={userStats.riskDistribution} dataKey="count" nameKey="risk" cx="50%" cy="50%" outerRadius={100} label>
                        <Cell fill="#00d9ff" />
                        <Cell fill="#b845f7" />
                        <Cell fill="#ff006e" />
                        <Cell fill="#ff3b30" />
                      </Pie>
                      <Tooltip contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid rgba(0, 217, 255, 0.3)' }} />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </motion.div>
              )}

              {/* Growth Trend */}
              {userStats?.growthTrend && (
                <motion.div variants={item} className="cyber-card p-6">
                  <h3 className="text-lg font-bold mb-4">User Growth (30 Days)</h3>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={userStats.growthTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                      <XAxis dataKey="date" stroke="#8892b0" style={{ fontSize: '12px' }} />
                      <YAxis stroke="#8892b0" style={{ fontSize: '12px' }} />
                      <Tooltip contentStyle={{ backgroundColor: '#1a1f3a', border: '1px solid rgba(0, 217, 255, 0.3)' }} />
                      <Line type="monotone" dataKey="users" stroke="#00d9ff" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </motion.div>
              )}
            </div>
          </TabsContent>

          {/* Users Tab */}
          <TabsContent value="users" className="space-y-6">
            <motion.div variants={item} className="cyber-card p-6">
              <div className="mb-6">
                <Input
                  placeholder="Search users by name or email..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-black/30 border-border/50 focus:border-primary"
                />
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-3 px-4 text-muted-foreground">Name</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Risk Level</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Last Active</th>
                      <th className="text-left py-3 px-4 text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {[...Array(5)].map((_, idx) => (
                      <tr key={idx} className="hover:bg-black/20 transition-colors">
                        <td className="py-3 px-4">User {idx + 1}</td>
                        <td className="py-3 px-4 text-muted-foreground">user{idx + 1}@example.com</td>
                        <td className="py-3 px-4">
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${idx % 3 === 0 ? 'bg-red-500/20 text-red-300' : idx % 3 === 1 ? 'bg-yellow-500/20 text-yellow-300' : 'bg-green-500/20 text-green-300'}`}>
                            {idx % 3 === 0 ? 'HIGH' : idx % 3 === 1 ? 'MODERATE' : 'LOW'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-muted-foreground">2 hours ago</td>
                        <td className="py-3 px-4">
                          <Link href={`/admin/users/${idx}`}>
                            <Button variant="ghost" size="sm" className="hover:bg-primary/20 hover:text-primary">View</Button>
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </TabsContent>

          {/* Alerts Tab */}
          <TabsContent value="alerts" className="space-y-6">
            <motion.div variants={item} className="cyber-card p-6">
              <h3 className="text-lg font-bold mb-6">Recent Critical Alerts</h3>
              <div className="space-y-4">
                {alertStats?.recentAlerts?.map((alert: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-lg bg-black/30 border border-destructive/30 hover:border-destructive/50 transition-colors">
                    <div className="flex items-start gap-4">
                      <AlertTriangle className="w-5 h-5 text-destructive flex-shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground">{alert.user}</p>
                        <p className="text-sm text-muted-foreground mt-1">{alert.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">{alert.timestamp}</p>
                      </div>
                      <Button variant="outline" size="sm" className="flex-shrink-0">
                        Action
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>

          {/* Jobs Tab */}
          <TabsContent value="jobs" className="space-y-6">
            <motion.div variants={item} className="cyber-card p-6">
              <h3 className="text-lg font-bold mb-6">Background Job Status</h3>
              <div className="space-y-3">
                {jobLogs?.jobs?.map((job: any) => (
                  <div key={job.id} className="p-4 rounded-lg bg-black/30 border border-border/50 flex items-center justify-between">
                    <div className="flex-1">
                      <p className="font-semibold text-foreground">{job.type.replace(/_/g, ' ').toUpperCase()}</p>
                      <p className="text-xs text-muted-foreground mt-1">Last run: {job.lastRun} • Duration: {job.duration}</p>
                    </div>
                    <div className={`px-3 py-1 rounded text-xs font-semibold ${job.status === 'success' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
                      {job.status.toUpperCase()}
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  );
}
