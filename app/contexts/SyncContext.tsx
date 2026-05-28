'use client';

import React, { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { dbManager } from '@/lib/indexedDB';
import { syncManager, SyncStatus } from '@/lib/syncManager';

interface SyncContextType {
  syncStatus: SyncStatus;
  sync: () => Promise<void>;
  addToQueue: (action: 'POST' | 'PUT' | 'DELETE' | 'PATCH', endpoint: string, data?: any) => Promise<void>;
  clearQueue: () => Promise<void>;
}

const SyncContext = createContext<SyncContextType | undefined>(undefined);

export function SyncProvider({ children }: { children: React.ReactNode }) {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    pendingItems: 0,
    failedItems: 0
  });

  useEffect(() => {
    // Register service worker
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' }).catch((err) => {
        console.error('[v0] Service Worker registration failed:', err);
      });
    }

    // Initialize DB and sync
    (async () => {
      try {
        await dbManager.init();
        setSyncStatus(syncManager.getStatus());

        // Clear old data
        await dbManager.clearOldData(30);

        // Subscribe to sync status updates
        const unsubscribe = syncManager.subscribe((status) => {
          setSyncStatus(status);
        });

        // Start periodic sync
        syncManager.startPeriodicSync(30000);

        return () => {
          unsubscribe();
          syncManager.stopPeriodicSync();
        };
      } catch (error) {
        console.error('[v0] Sync initialization error:', error);
      }
    })();
  }, []);

  const sync = useCallback(async () => {
    await syncManager.startSync();
  }, []);

  const addToQueue = useCallback(
    async (action: 'POST' | 'PUT' | 'DELETE' | 'PATCH', endpoint: string, data?: any) => {
      await syncManager.addToQueue(action, endpoint, data);
    },
    []
  );

  const clearQueue = useCallback(async () => {
    await syncManager.clearQueue();
  }, []);

  return (
    <SyncContext.Provider
      value={{
        syncStatus,
        sync,
        addToQueue,
        clearQueue
      }}
    >
      {children}
    </SyncContext.Provider>
  );
}

export function useSync() {
  const context = useContext(SyncContext);
  if (!context) {
    throw new Error('useSync must be used within SyncProvider');
  }
  return context;
}
