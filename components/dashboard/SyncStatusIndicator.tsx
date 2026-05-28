'use client';

import { useSync } from '@/app/contexts/SyncContext';
import { Wifi, WifiOff, Loader } from 'lucide-react';

export function SyncStatusIndicator() {
  const { isOnline, isSyncing, pendingItems } = useSync();

  return (
    <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border/50 bg-black/30 backdrop-blur-sm">
      {isOnline ? (
        <>
          {isSyncing ? (
            <>
              <Loader className="w-4 h-4 text-primary animate-spin" />
              <span className="text-xs text-muted-foreground">Syncing...</span>
            </>
          ) : pendingItems > 0 ? (
            <>
              <Wifi className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-xs text-muted-foreground">{pendingItems} pending</span>
            </>
          ) : (
            <>
              <Wifi className="w-4 h-4 text-green-400" />
              <span className="text-xs text-green-400">Synced</span>
            </>
          )}
        </>
      ) : (
        <>
          <WifiOff className="w-4 h-4 text-destructive animate-pulse" />
          <span className="text-xs text-destructive">Offline</span>
          {pendingItems > 0 && (
            <span className="ml-1 text-xs text-muted-foreground">({pendingItems})</span>
          )}
        </>
      )}
    </div>
  );
}
