import { useEffect, useState } from "react";
import { useAggregatorAuth } from "@/stores/aggregator-auth";

export const useAggregatorHydrated = () => {
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    // Ждем гидрации Zustand persist
    const checkHydration = () => {
      setHydrated(true);
    };

    // Небольшая задержка для гарантии восстановления persist состояния
    const timeout = setTimeout(checkHydration, 100);

    return () => clearTimeout(timeout);
  }, []);

  return hydrated;
};
