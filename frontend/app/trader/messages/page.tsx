"use client";

import { ProtectedRoute } from "@/components/auth/protected-route";
import { AuthLayout } from "@/components/layouts/auth-layout";
import { TraderMessagesV2 } from "@/components/trader/messages-v2";
import { ClassicEntryTabs } from "@/components/trader/classic-entry-tabs";

export default function MessagesPage() {
  return (
    <ProtectedRoute variant="trader">
      <AuthLayout variant="trader">
        <div className="space-y-6">
          {/* Classic Entry Tabs */}
          <ClassicEntryTabs />
          
          <TraderMessagesV2 />
        </div>
      </AuthLayout>
    </ProtectedRoute>
  );
}
