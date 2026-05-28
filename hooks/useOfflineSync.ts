import { useEffect, useState, useCallback } from 'react';
import { syncManager, SyncStatus } from '@/lib/syncManager';

export function useOfflineSync() {
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({
    isOnline: true,
    isSyncing: false,
    pendingItems: 0,
    failedItems: 0
  });

  useEffect(() => {
    // Initialize with current status
    setSyncStatus(syncManager.getStatus());

    // Subscribe to status updates
    const unsubscribe = syncManager.subscribe((status) => {
      setSyncStatus(status);
    });

    // Start periodic sync
    syncManager.startPeriodicSync(30000);

    return () => {
      unsubscribe();
      syncManager.stopPeriodicSync();
    };
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

  return {
    ...syncStatus,
    sync,
    addToQueue,
    clearQueue
  };
}
