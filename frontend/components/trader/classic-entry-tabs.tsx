"use client";

import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Smartphone, CreditCard, FileText, MessageSquare } from "lucide-react";

export function ClassicEntryTabs() {
  const pathname = usePathname();
  const router = useRouter();

  // Определяем активную вкладку на основе текущего пути
  const getActiveTab = () => {
    if (pathname.startsWith("/trader/devices")) return "devices";
    if (pathname.startsWith("/trader/requisites")) return "requisites";
    if (pathname.startsWith("/trader/classic-deals")) return "deals";
    if (pathname.startsWith("/trader/messages")) return "messages";
    return "devices"; // по умолчанию
  };

  const handleTabChange = (value: string) => {
    switch (value) {
      case "devices":
        router.push("/trader/devices");
        break;
      case "requisites":
        router.push("/trader/requisites");
        break;
      case "deals":
        router.push("/trader/classic-deals");
        break;
      case "messages":
        router.push("/trader/messages");
        break;
    }
  };

  // Показываем табы только на страницах классического входа
  const shouldShowTabs = [
    "/trader/devices",
    "/trader/requisites", 
    "/trader/classic-deals",
    "/trader/messages"
  ].some(path => pathname.startsWith(path));

  if (!shouldShowTabs) {
    return null;
  }

  return (
    <div className="mb-6">
      <Tabs value={getActiveTab()} onValueChange={handleTabChange}>
        <TabsList className="grid grid-cols-4 w-full max-w-lg">
          <TabsTrigger value="devices" className="flex items-center gap-2">
            <Smartphone className="h-4 w-4" />
            <span className="hidden sm:inline">Устройства</span>
          </TabsTrigger>
          <TabsTrigger value="requisites" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span className="hidden sm:inline">Реквизиты</span>
          </TabsTrigger>
          <TabsTrigger value="deals" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Сделки</span>
          </TabsTrigger>
          <TabsTrigger value="messages" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            <span className="hidden sm:inline">Сообщения</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>
    </div>
  );
}
