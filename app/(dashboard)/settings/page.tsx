'use client';

import React, { useState } from 'react';
import useSWR from 'swr';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { fetcher } from '@/app/lib/api';
import { Spinner } from '@/components/ui/spinner';

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'preferences' | 'agent'>('profile');
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  const { data: profile, mutate: mutateProfile } = useSWR('/api/user/profile', fetcher);
  const { data: preferences, mutate: mutatePreferences } = useSWR('/api/user/preferences', fetcher);
  const { data: agentStatus } = useSWR('/api/user/agent-status', fetcher);

  const [formData, setFormData] = useState({
    name: profile?.name || '',
    email: profile?.email || '',
    phone: profile?.phone || '',
  });

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setMessage('Profile updated successfully');
        mutateProfile();
        setIsEditing(false);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      setMessage('Error updating profile');
    } finally {
      setIsSaving(false);
    }
  };

  const renderProfile = () => (
    <Card>
      <CardHeader>
        <CardTitle>Profile Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {isEditing ? (
          <>
            <div>
              <label className="block text-sm font-semibold mb-2">Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Email</label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2">Phone (Optional)</label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={handleSaveProfile}
                disabled={isSaving}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isSaving ? <Spinner /> : 'Save Changes'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({ name: profile?.name || '', email: profile?.email || '', phone: profile?.phone || '' });
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        ) : (
          <>
            <div>
              <p className="text-sm text-gray-600">Name</p>
              <p className="text-lg font-semibold">{profile?.name}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email</p>
              <p className="text-lg font-semibold">{profile?.email}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="text-lg font-semibold">{profile?.phone || 'Not set'}</p>
            </div>
            <Button
              variant="outline"
              onClick={() => setIsEditing(true)}
            >
              Edit Profile
            </Button>
          </>
        )}
        {message && (
          <div className={`p-3 rounded-lg text-sm ${
            message.includes('successfully') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message}
          </div>
        )}
      </CardContent>
    </Card>
  );

  const renderPreferences = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Notification Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {preferences && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Email Alerts</p>
                  <p className="text-sm text-gray-600">Receive alerts when your score reaches critical</p>
                </div>
                <input type="checkbox" defaultChecked={preferences.emailAlerts} className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Daily Summary</p>
                  <p className="text-sm text-gray-600">Get a daily email with your metrics</p>
                </div>
                <input type="checkbox" defaultChecked={preferences.dailySummary} className="w-5 h-5" />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Desktop Notifications</p>
                  <p className="text-sm text-gray-600">Show browser notifications for high stress events</p>
                </div>
                <input type="checkbox" defaultChecked={preferences.desktopNotifications} className="w-5 h-5" />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Data Collection</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="font-semibold mb-2">Collection Frequency</p>
            <select className="w-full p-2 border border-gray-300 rounded-lg">
              <option>Every 15 minutes (most accurate)</option>
              <option>Every 30 minutes</option>
              <option>Every hour</option>
            </select>
          </div>
          <div>
            <p className="font-semibold mb-2">Data Retention</p>
            <select className="w-full p-2 border border-gray-300 rounded-lg">
              <option>30 days</option>
              <option>90 days</option>
              <option>1 year</option>
              <option>Forever</option>
            </select>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  const renderAgent = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Desktop Agent Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {agentStatus ? (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-semibold">Agent Status</p>
                  <p className="text-sm text-gray-600">Real-time OS-level data collection</p>
                </div>
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${
                  agentStatus.active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {agentStatus.active ? 'Active' : 'Inactive'}
                </span>
              </div>

              {agentStatus.active && (
                <>
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-600">Last Sync: {agentStatus.lastSync}</p>
                    <p className="text-sm text-gray-600">Version: {agentStatus.version}</p>
                  </div>

                  <div className="pt-4 space-y-2">
                    <Button variant="outline" className="w-full">
                      View Logs
                    </Button>
                    <Button variant="outline" className="w-full">
                      Pause Agent
                    </Button>
                    <Button variant="outline" className="w-full">
                      Reinstall Agent
                    </Button>
                  </div>
                </>
              )}

              {!agentStatus.active && (
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-3">
                    The desktop agent collects real-time data on your work patterns, stress levels, and productivity. 
                    Download and install it to enable OS-level monitoring.
                  </p>
                  <Button className="w-full bg-blue-600 hover:bg-blue-700">
                    Download & Install Agent
                  </Button>
                </div>
              )}
            </>
          ) : (
            <Spinner />
          )}
        </CardContent>
      </Card>
    </div>
  );

  return (
    <main className="flex-1 p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
          <p className="text-gray-600 mt-2">Manage your profile and preferences</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-gray-200">
          {(['profile', 'preferences', 'agent'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-3 px-4 font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'agent' ? 'Desktop Agent' : tab}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === 'profile' && renderProfile()}
        {activeTab === 'preferences' && renderPreferences()}
        {activeTab === 'agent' && renderAgent()}
      </div>
    </main>
  );
}
