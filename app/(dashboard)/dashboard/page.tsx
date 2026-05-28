'use client';

import { useEffect, useState } from 'react';
import useSWR from 'swr';
import { motion } from 'framer-motion';
import { userAPI } from '@/app/lib/api';
import { LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { AlertCircle, TrendingUp, Activity, Clock, Zap, ArrowUp, ArrowDown, Flame } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { SyncStatusIndicator } from '@/components/dashboard/SyncStatusIndicator';

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5 } },
};

export default function ModernDashboard() {
  const [burnoutScore, setBurnoutScore] = useState<any>(null);
  const [trendData, setTrendData] = useState<any[]>([]);

  const { data: scoreData, isLoading: scoreLoading } = useSWR('/api/user/burnout-score', () => userAPI.getBurnoutScore());
  const { data: historyData } = useSWR('/api/user/burnout-history?days=30', () => userAPI.getBurnoutHistory(30));

  useEffect(() => {
    if (scoreData) setBurnoutScore(scoreData);
  }, [scoreData]);

  useEffect(() => {
    if (historyData?.scores) {
      const formatted = historyData.scores.map((score: any) => ({
        date: new Date(score.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        score: Math.round(score.score),
        risk: score.risk_level,
      }));
      setTrendData(formatted.reverse());
    }
  }, [historyData]);

  const getRiskGradient = (level: string) => {
    switch (level) {
      case 'critical': return 'from-red-500 via-orange-500 to-yellow-500';
      case 'high': return 'from-orange-500 via-yellow-500 to-amber-500';
      case 'moderate': return 'from-yellow-500 via-lime-500 to-green-500';
      default: return 'from-green-500 via-teal-500 to-cyan-500';
    }
  };

  const getRiskGlowColor = (level: string) => {
    switch (level) {
      case 'critical': return '#ff3b30';
      case 'high': return '#ff9500';
      case 'moderate': return '#ffd60a';
      default: return '#00ff88';
    }
  };

  const MetricCard = ({ icon: Icon, label, value, trend, color }: any) => (
    <motion.div variants={item} className={cn('cyber-card p-6', 'hover:shadow-2xl')}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-2">{label}</p>
          <h3 className={cn('text-3xl font-bold', `text-${color}-400`)}>{value}</h3>
          {trend && (
            <div className="flex items-center gap-1 mt-2 text-xs">
              {trend > 0 ? (
                <>
                  <ArrowUp className="w-3 h-3 text-destructive" />
                  <span className="text-destructive">+{trend}%</span>
                </>
              ) : (
                <>
                  <ArrowDown className="w-3 h-3 text-green-400" />
                  <span className="text-green-400">{trend}%</span>
                </>
              )}
            </div>
          )}
        </div>
        <Icon className={cn('w-8 h-8 opacity-50', `text-${color}-400`)} />
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-purple-400 bg-clip-text text-transparent mb-2">
            Burnout Detector
          </h1>
          <p className="text-muted-foreground">Real-time health monitoring and burnout prevention</p>
        </div>
        <SyncStatusIndicator />
      </motion.div>

      <motion.div variants={container} initial="hidden" animate="show" className="space-y-8">
        {/* Main Score Card */}
        {burnoutScore && (
          <motion.div variants={item} className="cyber-card p-8 mb-8 overflow-hidden relative">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-secondary/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
              {/* Score Circle */}
              <div className="flex-1 flex justify-center">
                <div className="relative w-48 h-48">
                  <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="45" fill="none" stroke="#2d3561" strokeWidth="2" opacity="0.3" />
                    <circle
                      cx="50"
                      cy="50"
                      r="45"
                      fill="none"
                      stroke={`url(#grad-${burnoutScore.risk_level})`}
                      strokeWidth="3"
                      strokeDasharray={`${(burnoutScore.score / 100) * 282.7} 282.7`}
                      className="transition-all duration-1000 drop-shadow-lg"
                      style={{
                        filter: `drop-shadow(0 0 20px ${getRiskGlowColor(burnoutScore.risk_level)})`,
                      }}
                    />
                    <defs>
                      <linearGradient id={`grad-${burnoutScore.risk_level}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor={getRiskGlowColor(burnoutScore.risk_level)} />
                        <stop offset="100%" stopColor="#00d9ff" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-5xl font-bold text-white">{Math.round(burnoutScore.score)}</span>
                    <span className="text-sm text-muted-foreground mt-2">Burnout Index</span>
                  </div>
                </div>
              </div>

              {/* Risk Info */}
              <div className="flex-1 space-y-6">
                <div>
                  <h2 className="text-2xl font-bold mb-4">Current Status</h2>
                  <div className={cn(
                    'inline-block px-4 py-2 rounded-lg font-semibold mb-4 text-white',
                    burnoutScore.risk_level === 'critical' && 'bg-red-500/20 border border-red-500/50 text-red-300',
                    burnoutScore.risk_level === 'high' && 'bg-orange-500/20 border border-orange-500/50 text-orange-300',
                    burnoutScore.risk_level === 'moderate' && 'bg-yellow-500/20 border border-yellow-500/50 text-yellow-300',
                    burnoutScore.risk_level === 'low' && 'bg-green-500/20 border border-green-500/50 text-green-300',
                  )}>
                    {burnoutScore.risk_level.toUpperCase()} RISK
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Primary Factors</p>
                    <div className="flex flex-wrap gap-2">
                      {['Work Hours', 'Stress Level', 'Sleep Quality'].map((factor) => (
                        <span key={factor} className="px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs text-primary">
                          {factor}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-border">
                  <p className="text-sm text-muted-foreground mb-4">
                    {burnoutScore.risk_level === 'critical' && 'Immediate action recommended. Schedule rest and seek support.'}
                    {burnoutScore.risk_level === 'high' && 'Take preventive measures. Adjust your daily routine and prioritize wellbeing.'}
                    {burnoutScore.risk_level === 'moderate' && 'Maintain balance. Keep monitoring your health metrics.'}
                    {burnoutScore.risk_level === 'low' && 'Great job! Keep maintaining your healthy habits.'}
                  </p>
                  <Button className="w-full bg-gradient-to-r from-primary to-secondary hover:shadow-lg hover:shadow-primary/50">
                    View Recommendations
                  </Button>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <MetricCard icon={Activity} label="Weekly Activity" value="89%" trend={5} color="cyan" />
          <MetricCard icon={Clock} label="Avg Sleep" value="7.2h" trend={-2} color="purple" />
          <MetricCard icon={Zap} label="Energy Level" value="72%" trend={3} color="green" />
          <MetricCard icon={Flame} label="Stress Index" value="65%" trend={8} color="orange" />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Burnout Trend */}
          <motion.div variants={item} className="cyber-card p-6">
            <h3 className="text-xl font-bold mb-4 text-foreground">30-Day Trend</h3>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={trendData} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#00d9ff" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#00d9ff" stopOpacity={0.1} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#2d3561" />
                <XAxis dataKey="date" stroke="#8892b0" style={{ fontSize: '12px' }} />
                <YAxis stroke="#8892b0" style={{ fontSize: '12px' }} domain={[0, 100]} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1a1f3a',
                    border: '1px solid rgba(0, 217, 255, 0.3)',
                    borderRadius: '8px',
                  }}
                  labelStyle={{ color: '#00d9ff' }}
                />
                <Area type="monotone" dataKey="score" stroke="#00d9ff" fillOpacity={1} fill="url(#colorScore)" />
              </AreaChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Recent Insights */}
          <motion.div variants={item} className="cyber-card p-6 space-y-4">
            <h3 className="text-xl font-bold mb-4 text-foreground">Insights & Recommendations</h3>
            <div className="space-y-3">
              {[
                { title: 'Work-Life Balance', desc: 'Consider taking breaks every 2 hours', icon: AlertCircle, color: 'primary' },
                { title: 'Sleep Schedule', desc: 'Try to maintain consistent sleep hours', icon: Clock, color: 'secondary' },
                { title: 'Movement', desc: 'Increase daily movement to 10,000 steps', icon: Activity, color: 'green' },
              ].map((insight, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + idx * 0.1 }}
                  className="p-4 rounded-lg bg-black/30 border border-border/50 hover:border-primary/50 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <insight.icon className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                    <div>
                      <p className="font-semibold text-sm text-foreground">{insight.title}</p>
                      <p className="text-xs text-muted-foreground mt-1">{insight.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
