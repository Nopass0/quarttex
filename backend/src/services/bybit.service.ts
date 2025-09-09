// Bybit service for fetching USDT/RUB rates from OTC API

type BybitOnlineItem = {
  price: string;
};

type BybitOnlineResponse = {
  ret_code: number;
  result?: {
    items?: BybitOnlineItem[];
  };
};

export class BybitService {
  private static instance: BybitService;
  private cachedRate: number | null = null;
  private lastUpdateTime = 0;
  private cacheTimeMs = 60000; // 60s (1 minute)

  static getInstance(): BybitService {
    if (!BybitService.instance) BybitService.instance = new BybitService();
    return BybitService.instance;
  }

  /**
   * Fetch average price from first 10 items for USDT/RUB OTC buy side
   */
  async getUsdtRubRate(): Promise<number> {
    const now = Date.now();
    if (this.cachedRate !== null && now - this.lastUpdateTime < this.cacheTimeMs) {
      return this.cachedRate;
    }

    const url = "https://www.bybit.com/x-api/fiat/otc/item/online";
    const payload = {
      userId: "",
      tokenId: "USDT",
      currencyId: "RUB",
      payment: ["582"],
      side: "1",
      size: "10",
      page: "1",
      amount: "100000",
      vaMaker: false,
      bulkMaker: false,
      canTrade: false,
      verificationFilter: 0,
      sortType: "OVERALL_RANKING",
      paymentPeriod: [] as any[],
      itemRegion: 1,
    };

    try {
      const headers: Record<string, string> = {
        "content-type": "application/json;charset=UTF-8",
        accept: "application/json",
        origin: "https://www.bybit.com",
        referer: "https://www.bybit.com/en/fiat/trade/otc/buy/USDT/RUB",
        "accept-language": "en-US,en;q=0.9,ru;q=0.8",
        lang: "en",
        platform: "PC",
        guid: Bun.env.BYBIT_GUID || crypto.randomUUID(),
        "x-country-code": Bun.env.BYBIT_COUNTRY || "RU",
        "user-agent":
          Bun.env.BYBIT_UA ||
          "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) YaBrowser/25.2.0.0 Chrome/132.0.0.0 Safari/537.36",
      };
      if (Bun.env.BYBIT_COOKIE) {
        headers["cookie"] = Bun.env.BYBIT_COOKIE;
      }
      if (Bun.env.BYBIT_RISKTOKEN) {
        headers["risktoken"] = Bun.env.BYBIT_RISKTOKEN;
      }

      const resp = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
      });

      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);

      const json = (await resp.json()) as BybitOnlineResponse;
      if (json.ret_code !== 0) throw new Error(`ret_code ${json.ret_code}`);

      const items = json.result?.items || [];
      if (!items.length) throw new Error("Empty items from Bybit");

      const prices = items
        .slice(0, 10)
        .map((i) => Number(i.price))
        .filter((n) => Number.isFinite(n));

      if (!prices.length) throw new Error("No numeric prices");

      const avg = prices.reduce((a, b) => a + b, 0) / prices.length;
      const rate = Number(avg.toFixed(2));

      this.cachedRate = rate;
      this.lastUpdateTime = now;
      return rate;
    } catch (e) {
      console.warn('[BybitService] Failed to fetch Bybit rate, falling back:', e);
      if (this.cachedRate !== null) return this.cachedRate;
      // Fallback to Rapira if available to avoid misleading fixed 80.00
      try {
        const { rapiraService } = await import("@/services/rapira.service");
        const rapiraRate = await rapiraService.getUsdtRubRate();
        this.cachedRate = rapiraRate;
        this.lastUpdateTime = Date.now();
        return rapiraRate;
      } catch {
        return 80; // last resort
      }
    }
  }

  async getRateWithKkk(kkk: number = 0): Promise<number> {
    const base = await this.getUsdtRubRate();
    return Number((base * (1 + kkk / 100)).toFixed(2));
  }

  async forceUpdate(): Promise<number> {
    this.cachedRate = null;
    this.lastUpdateTime = 0;
    return this.getUsdtRubRate();
  }
}

export const bybitService = BybitService.getInstance();


