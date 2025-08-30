"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { TraderMessagesV2 } from "@/components/trader/messages-v2";

export default function MessagesPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <TraderMessagesV2 />
      </AuthLayout>
    </ProtectedRoute>
  );
}
