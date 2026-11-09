import { useEffect, useState } from 'react';
import { initializeStitch } from '@/services/stitch.service';

export function useStitchInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const initStitch = async () => {
      try {
        const apiKey = process.env.NEXT_PUBLIC_GOOGLE_STITCH_API_KEY;

        if (!apiKey) {
          console.warn('Google Stitch API key not configured');
          setIsInitialized(false);
          return;
        }

        initializeStitch(apiKey);
        setIsInitialized(true);
        setError(null);
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to initialize Stitch');
        console.error('Stitch initialization error:', error);
        setError(error);
        setIsInitialized(false);
      }
    };

    initStitch();
  }, []);

  return { isInitialized, error };
}
