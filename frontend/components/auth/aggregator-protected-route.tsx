"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAggregatorAuth } from "@/stores/aggregator-auth";
import { useAggregatorHydrated } from "@/hooks/use-aggregator-hydrated";
import { Loading } from "@/components/ui/loading";

interface AggregatorProtectedRouteProps {
  children: React.ReactNode;
}

export function AggregatorProtectedRoute({
  children,
}: AggregatorProtectedRouteProps) {
  const router = useRouter();
  const sessionToken = useAggregatorAuth((state) => state.sessionToken);
  const hydrated = useAggregatorHydrated();

  useEffect(() => {
    if (hydrated && !sessionToken) {
      router.push("/aggregator/login");
    }
  }, [sessionToken, router, hydrated]);

  if (!hydrated) {
    return <Loading fullScreen />;
  }

  if (!sessionToken) {
    return <Loading fullScreen />;
  }

  return <>{children}</>;
}
