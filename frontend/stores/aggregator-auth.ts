import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AggregatorAuthState {
  sessionToken: string | null;
  aggregatorId: string | null;
  aggregatorName: string | null;
  email: string | null;
  apiToken: string | null;
  apiBaseUrl: string | null;
  balanceUsdt: number;
  twoFactorEnabled: boolean;
  setAuth: (
    sessionToken: string,
    aggregatorId: string,
    aggregatorName: string,
    email: string,
    apiToken: string,
    apiBaseUrl: string | null,
    balanceUsdt: number,
    twoFactorEnabled: boolean
  ) => void;
  logout: () => void;
}

export const useAggregatorAuth = create<AggregatorAuthState>()(
  persist(
    (set) => ({
      sessionToken: null,
      aggregatorId: null,
      aggregatorName: null,
      email: null,
      apiToken: null,
      apiBaseUrl: null,
      balanceUsdt: 0,
      twoFactorEnabled: false,
      setAuth: (
        sessionToken,
        aggregatorId,
        aggregatorName,
        email,
        apiToken,
        apiBaseUrl,
        balanceUsdt,
        twoFactorEnabled
      ) =>
        set({
          sessionToken,
          aggregatorId,
          aggregatorName,
          email,
          apiToken,
          apiBaseUrl,
          balanceUsdt,
          twoFactorEnabled,
        }),
      logout: () =>
        set({
          sessionToken: null,
          aggregatorId: null,
          aggregatorName: null,
          email: null,
          apiToken: null,
          apiBaseUrl: null,
          balanceUsdt: 0,
          twoFactorEnabled: false,
        }),
    }),
    {
      name: "aggregator-auth",
    }
  )
);
