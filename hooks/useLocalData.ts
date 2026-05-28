import { useEffect, useState } from 'react';
import { dbManager } from '@/lib/indexedDB';

export function useLocalData(key: string) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    let mounted = true;

    const loadData = async () => {
      try {
        setLoading(true);
        const cachedData = await dbManager.getCachedData(key);
        if (mounted) {
          setData(cachedData);
          setError(null);
        }
      } catch (err) {
        if (mounted) {
          setError(err instanceof Error ? err : new Error('Failed to load data'));
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    loadData();

    return () => {
      mounted = false;
    };
  }, [key]);

  const cacheData = async (newData: any, ttl?: number) => {
    try {
      await dbManager.cacheData(key, newData, ttl);
      setData(newData);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to cache data'));
    }
  };

  return { data, loading, error, cacheData };
}
