"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { TrafficSettings } from "@/components/trader/traffic-settings";

export default function TraderSettingsPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-semibold">Настройки</h1>
            <p className="text-muted-foreground">
              Управление настройками трафика и фильтрами выплат
            </p>
          </div>
          
          <TrafficSettings />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}
