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

interface TraderProfile {
  id: number;
  numericId: number;
  email: string;
}

export function TraderHeader() {
  const router = useRouter();
  const logout = useTraderAuth((state) => state.logout);
  const [teamEnabled, setTeamEnabled] = useState(false);
  const [traderProfile, setTraderProfile] = useState<TraderProfile | null>(
    null,
  );
  const [depositDialogOpen, setDepositDialogOpen] = useState(false);
  const [depositType, setDepositType] = useState<'BALANCE' | 'INSURANCE'>('BALANCE');

  useEffect(() => {
    // Fetch trader profile and team state from server
    fetchTraderProfile();
  }, []);

  const fetchTraderProfile = async () => {
    try {
      const response = await traderApi.getProfile();
      if (response) {
        setTraderProfile({
          id: response.id || 0,
          numericId: response.numericId || 0,
          email: response.email || "trader@example.com",
        });
        // Set team state from server response
        setTeamEnabled(response.teamEnabled || false);
      }
    } catch (error) {
      console.error("Failed to fetch trader profile:", error);
      setTraderProfile({
        id: 0,
        numericId: 0,
        email: "trader@example.com",
      });
    }
  };

  const handleTeamToggle = async (checked: boolean) => {
    setTeamEnabled(checked);
    try {
      await traderApi.updateProfile({ teamEnabled: checked });
      toast.success(checked ? "Вы вошли в команду" : "Вы вышли из команды");
    } catch (error) {
      console.error("Failed to update team status:", error);
      toast.error("Не удалось обновить статус команды");
      // Revert the state if the API call fails
      setTeamEnabled(!checked);
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
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            className="h-9 w-9 border-purple-600 text-purple-600 hover:bg-purple-50 dark:border-purple-500 dark:text-purple-500 dark:hover:bg-purple-950/20"
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
          checked={teamEnabled}
          onCheckedChange={handleTeamToggle}
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
              <div className="h-8 w-8 rounded-full bg-gray-100 dark:bg-[#292133] flex items-center justify-center">
                <User className="h-4 w-4 text-[#530FAD] dark:text-[#530FAD]" />
              </div>
              <span className="hidden sm:block text-gray-700 dark:text-gray-300 font-medium">
                ID: {traderProfile?.numericId?.toString() || "0"}
              </span>
            </div>
            <ChevronDown className="h-4 w-4 text-[#530FAD] dark:text-[#530FAD]" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem
            onClick={handleLogout}
            className="text-red-600 dark:text-[#c64444] focus:text-red-600 dark:focus:text-[#c64444] hover:bg-gray-50 dark:hover:bg-[#292133] cursor-pointer"
          >
            <LogOut className="mr-2 h-4 w-4 text-[#530FAD] dark:text-[#530FAD]" />
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
