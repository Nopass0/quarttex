import { useEffect, useState } from "react";
import { useAggregatorAuth } from "@/stores/aggregator-auth";
import { aggregatorApi } from "@/services/api";

export const useAggregatorBalance = () => {
  const {
    sessionToken,
    balanceUsdt,
    setAuth,
    aggregatorId,
    aggregatorName,
    email,
    apiToken,
    apiBaseUrl,
    twoFactorEnabled,
  } = useAggregatorAuth();
  const [actualBalance, setActualBalance] = useState<number>(balanceUsdt || 0);

  useEffect(() => {
    if (!sessionToken) return;

    const fetchBalance = async () => {
      try {
        const response = await aggregatorApi.getMe();
        const newBalance = response.aggregator.balanceUsdt;

        // Если баланс изменился, обновляем и store, и локальное состояние
        if (newBalance !== balanceUsdt) {
          setAuth(
            sessionToken,
            aggregatorId || "",
            aggregatorName || "",
            email || "",
            apiToken || "",
            apiBaseUrl,
            newBalance,
            twoFactorEnabled || false
          );
        }

        setActualBalance(newBalance);
      } catch (error) {
        // В случае ошибки используем баланс из store
        setActualBalance(balanceUsdt || 0);
      }
    };

    // Обновляем баланс сразу при монтировании
    fetchBalance();

    // Затем обновляем каждые 30 секунд
    const interval = setInterval(fetchBalance, 30000);

    return () => clearInterval(interval);
  }, [
    sessionToken,
    balanceUsdt,
    setAuth,
    aggregatorId,
    aggregatorName,
    email,
    apiToken,
    apiBaseUrl,
    twoFactorEnabled,
  ]);

  return actualBalance;
};
