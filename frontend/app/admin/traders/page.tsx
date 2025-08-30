"use client";

import { AdminGuard } from "@/components/auth/admin-guard";
import { TradersList } from "@/components/admin/traders-list";
import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";

export default function TradersPage() {
  return (
    <ProtectedRoute variant="admin">
      <AuthLayout variant="admin">
        <AdminGuard>
          <div className="space-y-4">
            <h1 className="text-2xl font-semibold text-gray-900 dark:text-[#eeeeee]">
              Трейдеры
            </h1>
            <TradersList />
          </div>
        </AdminGuard>
      </AuthLayout>
    </ProtectedRoute>
  );
}

