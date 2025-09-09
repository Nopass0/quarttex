// Rapira service for fetching USDT/RUB rates

interface RapiraCandle {
  0: number;  // timestamp
  1: number;  // open
  2: number;  // high
  3: number;  // low
  4: number;  // close
  5: number;  // volume
}

export class RapiraService {
  private static instance: RapiraService;
  private cachedRate: number | null = null;
  private lastUpdateTime: number = 0;
  private cacheTimeMs: number = 60000; // 60 seconds cache (1 minute)

  constructor() {}

  static getInstance(): RapiraService {
    if (!RapiraService.instance) {
      RapiraService.instance = new RapiraService();
    }
    return RapiraService.instance;
  }

  /**
   * Get USDT/RUB rate from Rapira API
   * @returns Current USDT/RUB rate
   */
  async getUsdtRubRate(): Promise<number> {
    try {
      // Check cache
      const now = Date.now();
      if (this.cachedRate !== null && (now - this.lastUpdateTime) < this.cacheTimeMs) {
        console.log('[RapiraService] Returning cached rate:', this.cachedRate);
        return this.cachedRate;
      }

      // Prepare time range - last 24 hours
      const to = Date.now();
      const from = to - (24 * 60 * 60 * 1000); // 24 hours ago

      const url = `https://api.rapira.net/market/history?symbol=USDT%2FRUB&from=${from}&to=${to}&barsMaxSize=1000&resolution=15`;
      
      console.log('[RapiraService] Fetching rate from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data: RapiraCandle[] = await response.json();
      
      if (!Array.isArray(data) || data.length === 0) {
        throw new Error('Invalid response format or empty data');
      }

      // Get the last candle (most recent)
      const lastCandle = data[data.length - 1];
      
      if (!lastCandle || !Array.isArray(lastCandle) || lastCandle.length < 5) {
        throw new Error('Invalid candle format');
      }

      // Extract the high price (index 2) as requested
      const rate = lastCandle[2];
      
      console.log('[RapiraService] Last candle:', {
        timestamp: new Date(lastCandle[0]).toISOString(),
        open: lastCandle[1],
        high: lastCandle[2],
        low: lastCandle[3],
        close: lastCandle[4],
        volume: lastCandle[5]
      });
      
      console.log('[RapiraService] Current USDT/RUB rate:', rate);
      
      // Update cache
      this.cachedRate = rate;
      this.lastUpdateTime = now;
      
      return rate;
    } catch (error) {
      console.error('[RapiraService] Error fetching rate:', error);
      
      // Return cached rate if available
      if (this.cachedRate !== null) {
        console.log('[RapiraService] Returning stale cached rate due to error:', this.cachedRate);
        return this.cachedRate;
      }
      
      // Default fallback rate
      return 78.89;
    }
  }

  /**
   * Get USDT/RUB rate with KKK applied
   * @param kkk - KKK percentage to apply
   * @returns Rate with KKK applied
   */
  async getRateWithKkk(kkk: number = 0): Promise<number> {
    const baseRate = await this.getUsdtRubRate();
    const rateWithKkk = baseRate * (1 + kkk / 100);
    
    console.log('[RapiraService] Rate with KKK:', {
      baseRate,
      kkk: `${kkk}%`,
      rateWithKkk
    });
    
    return Number(rateWithKkk.toFixed(2));
  }

  /**
   * Force update the cached rate
   */
  async forceUpdate(): Promise<number> {
    this.cachedRate = null;
    this.lastUpdateTime = 0;
    return this.getUsdtRubRate();
  }
}

export const rapiraService = RapiraService.getInstance();