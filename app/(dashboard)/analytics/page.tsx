'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { fetcher } from '@/app/lib/api';
import { Spinner } from '@/components/ui/spinner';

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  
  const { data: scoreData, isLoading: scoreLoading } = useSWR(
    `/api/analytics/scores?range=${timeRange}`,
    fetcher
  );

  const { data: trendData, isLoading: trendLoading } = useSWR(
    `/api/analytics/trends?range=${timeRange}`,
    fetcher
  );

  const { data: forecastData, isLoading: forecastLoading } = useSWR(
    `/api/analytics/forecast`,
    fetcher
  );

  const isLoading = scoreLoading || trendLoading || forecastLoading;

  return (
    <main className="flex-1 p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Analytics & Trends</h1>
            <p className="text-gray-600 mt-2">Track your burnout patterns and forecast</p>
          </div>
          <div className="flex gap-2">
            {(['7d', '30d', '90d'] as const).map((range) => (
              <Button
                key={range}
                variant={timeRange === range ? 'default' : 'outline'}
                onClick={() => setTimeRange(range)}
                size="sm"
              >
                {range === '7d' ? 'Last 7 Days' : range === '30d' ? 'Last 30 Days' : 'Last 90 Days'}
              </Button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center h-96">
            <Spinner />
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Burnout Score Trend */}
            <Card>
              <CardHeader>
                <CardTitle>Burnout Score Trend</CardTitle>
              </CardHeader>
              <CardContent>
                {scoreData?.chartData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={scoreData.chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        domain={[0, 100]}
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke={COLORS[0]}
                        strokeWidth={2}
                        dot={{ fill: COLORS[0], r: 4 }}
                        activeDot={{ r: 6 }}
                        name="Burnout Score"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Factor Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Factor Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                {trendData?.factorData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <ComposedChart
                      data={trendData.factorData}
                      margin={{ top: 20, right: 30, left: 0, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="name" 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Bar dataKey="value" fill={COLORS[0]} radius={[8, 8, 0, 0]} />
                    </ComposedChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Activity Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Activity Pattern</CardTitle>
              </CardHeader>
              <CardContent>
                {scoreData?.activityData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={scoreData.activityData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="hour" 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Bar dataKey="activity" fill={COLORS[1]} radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No data available</p>
                )}
              </CardContent>
            </Card>

            {/* Forecast */}
            <Card>
              <CardHeader>
                <CardTitle>30-Day Forecast</CardTitle>
              </CardHeader>
              <CardContent>
                {forecastData?.forecastData ? (
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={forecastData.forecastData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        stroke="#6b7280"
                        style={{ fontSize: '12px' }}
                      />
                      <YAxis 
                        stroke="#6b7280"
                        domain={[0, 100]}
                        style={{ fontSize: '12px' }}
                      />
                      <Tooltip 
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="predicted"
                        stroke={COLORS[2]}
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        name="Forecast"
                      />
                      <Line
                        type="monotone"
                        dataKey="actual"
                        stroke={COLORS[0]}
                        strokeWidth={2}
                        name="Actual"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-gray-500 text-center py-8">No forecast available</p>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </main>
  );
}
