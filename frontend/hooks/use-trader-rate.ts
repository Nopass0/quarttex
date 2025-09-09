import { useState, useEffect } from 'react';
import { useTraderAuth } from '@/stores/auth';

interface TraderRate {
  baseRate: number;
  kkkPercent: number;
  kkkOperation: 'PLUS' | 'MINUS';
  rate: number;
  source: 'rapira' | 'bybit';
  sourceName: string;
  isCustom: boolean;
}

export function useTraderRate() {
  const [rate, setRate] = useState<TraderRate | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { token } = useTraderAuth();

  const fetchRate = async () => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/trader/rate`, {
        headers: {
          'x-trader-token': token,
        },
      });
      
      if (!response.ok) {
        throw new Error('Failed to fetch trader rate');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setRate(data.data);
        setError(null);
      } else {
        setError(data.error || 'Failed to fetch rate');
      }
    } catch (err) {
      console.error('Error fetching trader rate:', err);
      setError('Ошибка загрузки курса');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRate();
    // Обновляем курс каждые 60 секунд
    const interval = setInterval(fetchRate, 60000);
    return () => clearInterval(interval);
  }, [token]);

  return { rate, loading, error, refetch: fetchRate };
}
