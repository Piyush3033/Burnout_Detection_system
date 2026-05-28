'use client';

import { useAuth } from '@/app/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { Button } from '@/components/ui/button';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading, logout, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.push('/login');
    }
  }, [isAuthenticated, loading, router]);

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-border border-t-primary mx-auto mb-3"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <main className="min-h-screen bg-background">
      <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 px-6 py-4 border-b border-border/50 bg-background/80 backdrop-blur-sm">
        <div>
          <p className="text-sm text-muted-foreground">Welcome back{user?.full_name ? `, ${user.full_name}` : ''}</p>
          <h1 className="text-2xl font-semibold text-foreground">Burnout Dashboard</h1>
        </div>
        <div className="flex items-center gap-3">
          <Button onClick={logout} className="bg-destructive text-white hover:bg-destructive/90">
            Logout
          </Button>
        </div>
      </header>
      {children}
    </main>
  );
}
