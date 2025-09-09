"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ChevronDown, LogOut, User, Plus, Wallet, Shield } from "lucide-react";
import { useTraderAuth } from "@/stores/auth";
import { traderApi } from "@/services/api";
import { toast } from "sonner";
import { DepositDialog } from "@/components/finances/deposit-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTraderRate } from "@/hooks/use-trader-rate";

interface MerchantMethodRate {
  inPercentFrom: number;
  inPercentTo: number;
  outPercentFrom: number;
  outPercentTo: number;
  amountFrom: number;
  amountTo: number;
  actualRate: number;
  baseRate: number;
}

interface MerchantMethod {
  method: string;
  methodName: string;
  rates: MerchantMethodRate[];
}

interface DisplayRate {
  id: string;
  stakePercent: number;
  amountFrom: number;
  amountTo: number;
  sortOrder: number;
}

interface TraderProfile {
  id: string;
  numericId: number;
  email: string;
  trafficEnabled: boolean;
  merchantMethods?: MerchantMethod[];
  displayStakePercent?: number | null;
  displayAmountFrom?: number | null;
  displayAmountTo?: number | null;
  displayRates?: DisplayRate[];
}

export function TraderHeader() {
  const router = useRouter();
  const logout = useTraderAuth((state) => state.logout);
  const [trafficEnabled, setTrafficEnabled] = useState(false);
  const [traderProfile, setTraderProfile] = useState<TraderProfile | null>(
    null,
  );
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositType, setDepositType] = useState<'BALANCE' | 'INSURANCE'>('BALANCE');
  const { rate: traderRate } = useTraderRate();

  useEffect(() => {
    // Fetch trader profile and team state from server
    fetchTraderProfile();
  }, []);

  const fetchTraderProfile = async () => {
    try {
      const [profileResponse, merchantMethodsResponse] = await Promise.all([
        traderApi.getProfile(),
        traderApi.getMerchantMethods(),
      ]);
      console.log("[TraderHeader] /trader/profile response:", profileResponse);
      

      if (profileResponse) {
        setTraderProfile({
          id: String(profileResponse.id || ""),
          numericId: profileResponse.numericId || 0,
          email: profileResponse.email || "trader@example.com",
          trafficEnabled: profileResponse.trafficEnabled || false,
          merchantMethods: merchantMethodsResponse || [],
          displayStakePercent: profileResponse.displayStakePercent ?? null,
          displayAmountFrom: profileResponse.displayAmountFrom ?? null,
          displayAmountTo: profileResponse.displayAmountTo ?? null,
          // Новое поле: массив отображаемых ставок с бэка
          displayRates: Array.isArray(profileResponse.displayRates)
            ? profileResponse.displayRates
            : [],
        });
        console.log(
          "[TraderHeader] setTraderProfile.displayRates length:",
          Array.isArray(profileResponse.displayRates)
            ? profileResponse.displayRates.length
            : 0
        );
        // Set traffic enabled state from server response
        setTrafficEnabled(profileResponse.trafficEnabled || false);
      }
    } catch (error) {
      console.error("Failed to fetch trader profile:", error);
      setTraderProfile({
        id: "",
        numericId: 0,
        email: "trader@example.com",
        trafficEnabled: false,
        merchantMethods: [],
      });
    }
  };

  const handleTrafficToggle = async (checked: boolean) => {
    setTrafficEnabled(checked);
    try {
      await traderApi.updateProfile({ teamEnabled: checked });
      toast.success(checked ? "Вы вошли в команду" : "Вы вышли из команды");
    } catch (error) {
      console.error("Failed to update traffic status:", error);
      toast.error("Не удалось обновить статус команды");
      // Revert the state if the API call fails
      setTrafficEnabled(!checked);
    }
  };

  const handleLogout = () => {
    logout();
    if (typeof window !== "undefined") {
      localStorage.removeItem("trader-auth");
    }
    router.push("/trader/login");
  };

  return (
    <div className="flex items-center gap-2 md:gap-4">
      {/* Deposit button dropdown */}
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className="flex items-center gap-2 px-4 py-2 font-medium text-primary border-primary hover:bg-primary/10"
            title="Параметры курса"
          >
            Параметры курса
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[500px] p-4 bg-gradient-to-r from-primary/5 to-primary/10 dark:bg-[#181f1b] rounded-md border-2 border-primary shadow"
        >
          <h4 className="font-semibold mb-2">Ставки и лимиты</h4>
          {(() => {
            // Приоритет: новая система displayRates, затем старая система
            const displayRates = traderProfile?.displayRates;
            const hasNewRates = displayRates && displayRates.length > 0;
            const hasOldRates = (
              traderProfile?.displayStakePercent != null ||
              traderProfile?.displayAmountFrom != null ||
              traderProfile?.displayAmountTo != null
            );

            if (hasNewRates || hasOldRates) {
              return (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-sm border-collapse">
                    <thead>
                      <tr className="bg-gradient-to-r from-primary/5 to-primary/10">
                        <th className="px-2 py-2 border-b text-left font-semibold text-gray-700 dark:text-gray-200">Сумма (от — до)</th>
                        <th className="px-2 py-2 border-b text-left font-semibold text-gray-700 dark:text-gray-200">Ставка (%)</th>
                        <th className="px-2 py-2 border-b text-left font-semibold text-gray-700 dark:text-gray-200">Фактический курс (₽/USDT)</th>
                        <th className="px-2 py-2 border-b text-left font-semibold text-gray-700 dark:text-gray-200">Условный курс (₽/USDT)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {hasNewRates ? (
                        // Новая система - показываем все ставки
                        displayRates!.map((rate, index) => {
                          const base = traderRate?.baseRate ?? traderRate?.rate ?? null;
                          const dealAmount = rate.amountFrom || 5000;
                          let actualRate: number | null = null;
                          if (base && rate.stakePercent > 0) {
                            const usdt = dealAmount / base;
                            const feeAmount = usdt * (rate.stakePercent / 100);
                            const newUsdt = usdt - feeAmount;
                            if (newUsdt > 0) actualRate = dealAmount / newUsdt;
                          }
                          return (
                            <tr key={rate.id || index} className="border-b last:border-b-0">
                              <td className="px-2 font-medium py-2 text-gray-700 dark:text-gray-200">
                                {rate.amountFrom.toLocaleString()} — {rate.amountTo.toLocaleString()}
                              </td>
                              <td className="px-2 font-medium py-2 text-gray-700 dark:text-gray-200">
                                {rate.stakePercent}%
                              </td>
                              <td className="px-2 font-medium py-2 text-gray-700 dark:text-gray-200">
                                {actualRate != null ? actualRate.toFixed(2) + " ₽/USDT" : "—"}
                              </td>
                              <td className="px-2 font-medium py-2 text-gray-700 dark:text-gray-200">
                                {base != null ? Number(base).toFixed(2) + " ₽/USDT" : "—"}
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        // Старая система - показываем одну ставку
                        (() => {
                          const percent = traderProfile?.displayStakePercent ?? null;
                          const amountFrom = traderProfile?.displayAmountFrom ?? null;
                          const amountTo = traderProfile?.displayAmountTo ?? null;
                          const base = traderRate?.baseRate ?? traderRate?.rate ?? null;
                          const dealAmount = amountFrom ?? 5000;
                          let actualRate: number | null = null;
                          if (base && percent != null) {
                            const usdt = dealAmount / base;
                            const feeAmount = usdt * (percent / 100);
                            const newUsdt = usdt - feeAmount;
                            if (newUsdt > 0) actualRate = dealAmount / newUsdt;
                          }
                          return (
                            <tr className="border-b last:border-b-0">
                              <td className="px-2 font-medium py-2 text-gray-700 dark:text-gray-200">
                                {(amountFrom != null ? amountFrom.toLocaleString() : "—")} — {(amountTo != null ? amountTo.toLocaleString() : "—")}
                              </td>
                              <td className="px-2 font-medium py-2 text-gray-700 dark:text-gray-200">
                                {percent != null ? `${percent}%` : "—"}
                              </td>
                              <td className="px-2 font-medium py-2 text-gray-700 dark:text-gray-200">
                                {actualRate != null ? actualRate.toFixed(2) + " ₽/USDT" : "—"}
                              </td>
                              <td className="px-2 font-medium py-2 text-gray-700 dark:text-gray-200">
                                {base != null ? Number(base).toFixed(2) + " ₽/USDT" : "—"}
                              </td>
                            </tr>
                          );
                        })()
                      )}
                    </tbody>
                  </table>
                </div>
              );
            } else {
              return <div className="text-sm text-gray-500">Нет данных по ставке/диапазону</div>;
            }
          })()}
        </PopoverContent>
      </Popover>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-primary text-primary hover:bg-primary/10 dark:border-primary dark:text-primary dark:hover:bg-primary/20"
            title="Пополнить баланс"
          >
            <Plus className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={() => {
              setDepositType('BALANCE');
              setDepositDialogOpen(true);
            }}
            className="cursor-pointer"
          >
            <Wallet className="mr-2 h-4 w-4" />
            Пополнить баланс
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => {
              setDepositType('INSURANCE');
              setDepositDialogOpen(true);
            }}
            className="cursor-pointer"
          >
            <Shield className="mr-2 h-4 w-4" />
            Пополнить депозит
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Team toggle switch - hidden on mobile */}
      <div className="hidden md:flex items-center gap-2">
        <Label htmlFor="team-switch" className="text-sm text-gray-700">
          Команда
        </Label>
        <Switch
          id="team-switch"
          checked={trafficEnabled}
          onCheckedChange={handleTrafficToggle}
        />
      </div>

      {/* User menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            className="flex items-center gap-2 text-sm font-normal hover:bg-black/5 transition-colors"
          >
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-[#29382f] flex items-center justify-center">
                <User className="h-4 w-4 text-primary" />
              </div>
              <span className="hidden sm:block text-gray-700 dark:text-gray-300 font-medium">
                ID: {traderProfile?.numericId?.toString() || "0"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-primary" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 dark:text-[#c64444] focus:text-red-600 dark:focus:text-[#c64444] hover:bg-gray-50 dark:hover:bg-[#29382f] cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Deposit Dialog */}
      <DepositDialog
        open={depositDialogOpen}
        onOpenChange={setDepositDialogOpen}
        depositType={depositType}
      />
    </div>
  );
}
