"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DynamicLogo } from "@/components/DynamicLogo";
import { toast } from "sonner";
import { useAggregatorAuth } from "@/stores/aggregator-auth";
import { Loader2, Mail, Lock, Globe } from "lucide-react";
import { aggregatorApi } from "@/services/api";
import {
  InputOTP,
  InputOTPGroup,
  InputOTPSlot,
} from "@/components/ui/input-otp";

export default function AggregatorLoginPage() {
  const router = useRouter();
  const setAuth = useAggregatorAuth((state) => state.setAuth);
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [challengeId, setChallengeId] = useState<string | null>(null);
  const [otp, setOtp] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email || !password) {
      toast.error("Введите email и пароль");
      return;
    }

    setLoading(true);

    try {
      const data = await aggregatorApi.login(email, password);

      if (data.requiresTwoFactor && data.challengeId) {
        setChallengeId(data.challengeId);
        toast.message("Введите код из приложения Google Authenticator");
        return;
      }

      const aggregator = data.aggregator;
      console.log("Login successful, setting auth with:", {
        sessionToken: data.sessionToken,
        aggregatorId: aggregator.id,
        aggregatorName: aggregator.name,
      });

      setAuth(
        data.sessionToken,
        aggregator.id,
        aggregator.name,
        aggregator.email,
        aggregator.apiToken || "",
        aggregator.apiBaseUrl,
        aggregator.balanceUsdt,
        aggregator.twoFactorEnabled || false
      );

      toast.success("Вход выполнен успешно");

      // Небольшая задержка перед редиректом
      setTimeout(() => {
        router.push("/aggregator");
      }, 100);
    } catch (error: any) {
      console.error("Aggregator login error:", error);
      toast.error(
        error?.response?.data?.error ||
          error.message ||
          "Неверный email или пароль"
      );
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!challengeId || otp.length < 6) return;

    setLoading(true);
    try {
      const data = await aggregatorApi.verify2FA(challengeId, otp);

      const aggregator = data.aggregator;
      console.log("2FA verified, setting auth with:", {
        sessionToken: data.sessionToken,
        aggregatorId: aggregator.id,
        aggregatorName: aggregator.name,
      });

      setAuth(
        data.sessionToken,
        aggregator.id,
        aggregator.name,
        aggregator.email,
        aggregator.apiToken || "",
        aggregator.apiBaseUrl,
        aggregator.balanceUsdt,
        aggregator.twoFactorEnabled || false
      );

      toast.success("Вход выполнен успешно");

      // Небольшая задержка перед редиректом
      setTimeout(() => {
        router.push("/aggregator");
      }, 100);
    } catch (error: any) {
      console.error("Verify 2FA error:", error);
      toast.error(
        error?.response?.data?.error || error.message || "Неверный код"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-[#0f0f0f] flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8 bg-white dark:bg-[#29382f] shadow-lg border-gray-200 dark:border-[#29382f]">
        <div className="flex flex-col items-center mb-8">
          <div className="flex items-center gap-3 mb-6">
            <Globe className="h-10 w-10 text-primary" />
            <DynamicLogo size="lg" />
          </div>
          <h1 className="mt-4 text-2xl font-semibold text-gray-900 dark:text-[#eeeeee]">
            Личный кабинет агрегатора
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            {challengeId
              ? "Введите код подтверждения"
              : "Войдите в свой аккаунт"}
          </p>
        </div>

        {!challengeId ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email
              </Label>
              <div className="mt-1 relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary h-4 w-4" />
                <Input
                  id="email"
                  type="email"
                  placeholder="aggregator@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="password" className="text-sm font-medium">
                Пароль
              </Label>
              <div className="mt-1 relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-primary h-4 w-4" />
                <Input
                  id="password"
                  type="password"
                  placeholder="Введите пароль"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-10"
                  disabled={loading}
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-[#006039] hover:bg-[#004d2e] dark:bg-[#2d6a42] dark:hover:bg-[#236035]"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  Вход...
                </>
              ) : (
                "Войти"
              )}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleVerifyOtp} className="space-y-6">
            <div>
              <Label className="text-sm font-medium">
                Код из Google Authenticator
              </Label>
              <div className="mt-2 flex justify-center">
                <InputOTP maxLength={6} value={otp} onChange={setOtp}>
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} className="w-10 h-12" />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
            </div>
            <Button
              type="submit"
              className="w-full bg-[#006039] hover:bg-[#004d2e] dark:bg-[#2d6a42] dark:hover:bg-[#236035]"
              disabled={loading || otp.length < 6}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin text-white" />
                  Проверяем...
                </>
              ) : (
                "Подтвердить"
              )}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => {
                setChallengeId(null);
                setOtp("");
              }}
            >
              Назад
            </Button>
          </form>
        )}

        <div className="mt-6 text-center text-sm text-gray-600 dark:text-gray-400">
          <p>
            Нет доступа?{" "}
            <a
              href="#"
              className="text-[#006039] dark:text-[#2d6a42] hover:text-[#004d2e] dark:hover:text-[#236035] font-medium"
            >
              Свяжитесь с администратором
            </a>
          </p>
        </div>
      </Card>
    </div>
  );
}
