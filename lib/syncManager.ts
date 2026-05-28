import { dbManager, SyncQueueItem } from './indexedDB';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export interface SyncStatus {
  isOnline: boolean;
  isSyncing: boolean;
  pendingItems: number;
  lastSyncTime?: number;
  failedItems: number;
}

type SyncStatusCallback = (status: SyncStatus) => void;

class SyncManager {
  private statusCallbacks: Set<SyncStatusCallback> = new Set();
  private syncStatus: SyncStatus = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    isSyncing: false,
    pendingItems: 0,
    failedItems: 0
  };
  private syncInterval: NodeJS.Timeout | null = null;
  private isSyncing = false;
  private backendUrl = `${API_BASE_URL.replace(/\/$/, '')}/health`;

  constructor() {
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => this.handleOnline());
      window.addEventListener('offline', () => this.handleOffline());
      void this.updateNetworkStatus();
    }
  }

  private async handleOnline() {
    const online = await this.updateNetworkStatus();
    if (online) {
      await this.startSync();
    }
  }

  private handleOffline() {
    this.syncStatus.isOnline = false;
    this.notifyListeners();
  }

  private async checkBackendConnection(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);

      const response = await fetch(this.backendUrl, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store',
        headers: { Accept: 'application/json' }
      });

      clearTimeout(timeout);
      return response.ok;
    } catch {
      return false;
    }
  }

  private async updateNetworkStatus(): Promise<boolean> {
    const online = await this.checkBackendConnection();
    this.syncStatus.isOnline = online;
    this.notifyListeners();
    return online;
  }

  private notifyListeners() {
    this.statusCallbacks.forEach(callback => callback(this.syncStatus));
  }

  subscribe(callback: SyncStatusCallback): () => void {
    this.statusCallbacks.add(callback);
    return () => this.statusCallbacks.delete(callback);
  }

  async addToQueue(action: 'POST' | 'PUT' | 'DELETE' | 'PATCH', endpoint: string, data?: any) {
    await dbManager.addToSyncQueue({ action, endpoint, data });
    await this.updatePendingCount();
    this.notifyListeners();

    // Auto-sync if online
    if (this.syncStatus.isOnline) {
      this.startSync();
    }
  }

  private async updatePendingCount() {
    const queue = await dbManager.getSyncQueue();
    this.syncStatus.pendingItems = queue.length;
    this.syncStatus.failedItems = queue.filter(item => item.retries > 0).length;
  }

  async startSync() {
    const online = await this.updateNetworkStatus();
    if (this.isSyncing || !online) return;

    this.isSyncing = true;
    this.syncStatus.isSyncing = true;
    this.notifyListeners();

    try {
      const queue = await dbManager.getSyncQueue();

      for (const item of queue) {
        try {
          const response = await fetch(item.endpoint, {
            method: item.action,
            headers: { 'Content-Type': 'application/json' },
            body: item.data ? JSON.stringify(item.data) : undefined
          });

          if (response.ok) {
            await dbManager.removeSyncQueueItem(item.id);
          } else if (response.status >= 500) {
            // Server error, retry later
            await dbManager.updateSyncQueueRetries(item.id, item.retries + 1);
          } else if (response.status >= 400 && response.status < 500) {
            // Client error, don't retry
            await dbManager.removeSyncQueueItem(item.id);
          }
        } catch (error) {
          // Network error, retry later
          await dbManager.updateSyncQueueRetries(item.id, item.retries + 1);
        }
      }

      await this.updatePendingCount();
      this.syncStatus.lastSyncTime = Date.now();
    } finally {
      this.isSyncing = false;
      this.syncStatus.isSyncing = false;
      this.notifyListeners();
    }
  }

  startPeriodicSync(intervalMs = 30000) {
    if (this.syncInterval) clearInterval(this.syncInterval);
    this.syncInterval = setInterval(() => {
      void this.updateNetworkStatus();
      if (this.syncStatus.isOnline && this.syncStatus.pendingItems > 0) {
        void this.startSync();
      }
    }, intervalMs);
  }

  stopPeriodicSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }

  getStatus(): SyncStatus {
    return { ...this.syncStatus };
  }

  async clearQueue() {
    const queue = await dbManager.getSyncQueue();
    for (const item of queue) {
      await dbManager.removeSyncQueueItem(item.id);
    }
    await this.updatePendingCount();
    this.notifyListeners();
  }
}

export const syncManager = new SyncManager();
