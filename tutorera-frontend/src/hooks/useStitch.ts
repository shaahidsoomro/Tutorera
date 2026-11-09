import { useEffect, useState, useCallback } from 'react';
import { getStitchService } from '@/services/stitch.service';

interface UseStitchOptions {
  model: 'tutors' | 'students' | 'bookings' | 'offers';
  filters?: Record<string, any>;
  watchChanges?: boolean;
}

export function useStitch<T>(options: UseStitchOptions) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const stitch = getStitchService();

      let result;
      switch (options.model) {
        case 'tutors':
          result = await stitch.getTutors(options.filters);
          break;
        case 'bookings':
          result = await stitch.getBookings(options.filters?.studentId);
          break;
        case 'offers':
          result = await stitch.getOffers(options.filters?.tutorId);
          break;
        default:
          result = [];
      }

      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch data'));
    } finally {
      setLoading(false);
    }
  }, [options.model, options.filters]);

  useEffect(() => {
    fetchData();

    // Watch for real-time changes if enabled
    if (options.watchChanges) {
      const stitch = getStitchService();
      stitch.watchModel(options.model, (newData) => {
        setData(prev => [...prev, newData as T]);
      });
    }
  }, [fetchData, options.watchChanges, options.model]);

  return { data, loading, error, refetch: fetchData };
}

// Hook for syncing data to Stitch
export function useSyncStitch() {
  const sync = useCallback(async (model: string, data: any[]) => {
    try {
      const stitch = getStitchService();

      switch (model) {
        case 'tutors':
          await stitch.syncTutors(data);
          break;
        case 'bookings':
          await stitch.syncBookings(data);
          break;
        case 'offers':
          await stitch.syncOffers(data);
          break;
      }

      return { success: true };
    } catch (error) {
      console.error('Sync failed:', error);
      return { success: false, error };
    }
  }, []);

  return { sync };
}
