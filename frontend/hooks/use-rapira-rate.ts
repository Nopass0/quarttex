import { useState, useEffect } from 'react';

interface RapiraRate {
  baseRate: number;
  kkk: number;
  rate: number;
  timestamp: string;
}

type RateSource = 'rapira' | 'bybit';

export function useRapiraRate(source: RateSource = 'rapira') {
  const [rate, setRate] = useState<RapiraRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [baseRate, setBaseRate] = useState<number | null>(null);

  const fetchRate = async () => {
    try {
      const path = source === 'bybit' ? '/rapira-rate/bybit-rate' : '/rapira-rate';
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}${path}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch rate');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setRate(data.data);
        setBaseRate(data.data.baseRate);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch rate');
      }
    } catch (err) {
      console.error('Error fetching rate:', err);
      setError('Ошибка загрузки курса');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
    // Refresh rate every 60 seconds to reduce server load
    const interval = setInterval(fetchRate, 60000);
    return () => clearInterval(interval);
  }, [source]);

  return { rate, baseRate, loading, error, refetch: fetchRate };
}