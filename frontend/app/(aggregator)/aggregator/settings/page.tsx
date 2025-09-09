"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"
import { aggregatorApi } from "@/services/api"
import { useAggregatorAuth } from "@/stores/aggregator-auth"
import {
  Copy,
  Eye,
  EyeOff,
  Globe,
  Key,
  Loader2,
  Lock,
  RefreshCw,
  Shield,
  User,
  Smartphone,
  LogOut,
  AlertCircle,
} from "lucide-react"
import Image from "next/image"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"

interface Profile {
  id: string
  email: string
  name: string
  apiToken: string
  customApiToken?: string | null
  apiBaseUrl: string | null
  balanceUsdt: number
  twoFactorEnabled: boolean
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface Session {
  id: string
  ip: string
  userAgent?: string
  createdAt: string
  expiresAt: string
  isExpired: boolean
}

interface TwoFASetup {
  secret: string
  qrCodeDataURL: string
  manualEntryKey: string
  serviceName: string
  accountName: string
}

export default function AggregatorSettings() {
  const auth = useAggregatorAuth()
  const [profile, setProfile] = useState<Profile | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState("profile")

  // Profile form
  const [name, setName] = useState("")
  const [apiBaseUrl, setApiBaseUrl] = useState("")
  const [customApiToken, setCustomApiToken] = useState("")
  const [updatingProfile, setUpdatingProfile] = useState(false)

  // Password form
  const [currentPassword, setCurrentPassword] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [changingPassword, setChangingPassword] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)

  // API Token
  const [showToken, setShowToken] = useState(false)
  const [regeneratingToken, setRegeneratingToken] = useState(false)
  const [tokenDialog, setTokenDialog] = useState(false)
  const [newToken, setNewToken] = useState("")

  // 2FA
  const [twoFADialog, setTwoFADialog] = useState(false)
  const [twoFASetup, setTwoFASetup] = useState<TwoFASetup | null>(null)
  const [twoFACode, setTwoFACode] = useState("")
  const [setting2FA, setSetting2FA] = useState(false)
  const [disable2FADialog, setDisable2FADialog] = useState(false)
  const [disable2FACode, setDisable2FACode] = useState("")
  const [disabling2FA, setDisabling2FA] = useState(false)

  useEffect(() => {
    fetchProfile()
    fetchSessions()
  }, [])

  const fetchProfile = async () => {
    try {
      const data = await aggregatorApi.getProfile()
      setProfile(data)
      setName(data.name)
      setApiBaseUrl(data.apiBaseUrl || "")
      setCustomApiToken(data.customApiToken || "")
    } catch (error) {
      console.error("Error fetching profile:", error)
      toast.error("Ошибка загрузки профиля")
    } finally {
      setLoading(false)
    }
  }

  const fetchSessions = async () => {
    try {
      const data = await aggregatorApi.getSessions()
      setSessions(data.sessions)
    } catch (error) {
      console.error("Error fetching sessions:", error)
    }
  }

  const updateProfile = async () => {
    setUpdatingProfile(true)
    try {
      const data = await aggregatorApi.updateProfile({
        name,
        apiBaseUrl: apiBaseUrl || undefined,
        customApiToken: customApiToken || null,
      })
      setProfile(data.aggregator)
      auth.setAuth(
        auth.sessionToken || "",
        auth.aggregatorId || "",
        data.aggregator.name,
        auth.email || "",
        auth.apiToken || "",
        data.aggregator.apiBaseUrl,
        auth.balanceUsdt,
        auth.twoFactorEnabled
      )
      toast.success("Профиль обновлен")
    } catch (error) {
      console.error("Error updating profile:", error)
      toast.error("Ошибка обновления профиля")
    } finally {
      setUpdatingProfile(false)
    }
  }

  const changePassword = async () => {
    if (newPassword !== confirmPassword) {
      toast.error("Пароли не совпадают")
      return
    }
    if (newPassword.length < 8) {
      toast.error("Пароль должен содержать минимум 8 символов")
      return
    }

    setChangingPassword(true)
    try {
      await aggregatorApi.changePassword(currentPassword, newPassword)
      toast.success("Пароль успешно изменен")
      setCurrentPassword("")
      setNewPassword("")
      setConfirmPassword("")
    } catch (error: any) {
      console.error("Error changing password:", error)
      toast.error(error?.response?.data?.error || "Ошибка изменения пароля")
    } finally {
      setChangingPassword(false)
    }
  }

  const regenerateToken = async () => {
    setRegeneratingToken(true)
    try {
      const data = await aggregatorApi.regenerateToken()
      setNewToken(data.newToken)
      setTokenDialog(true)
      await fetchProfile()
      auth.setAuth(
        auth.sessionToken || "",
        auth.aggregatorId || "",
        auth.aggregatorName || "",
        auth.email || "",
        data.newToken,
        auth.apiBaseUrl,
        auth.balanceUsdt,
        auth.twoFactorEnabled
      )
      toast.success("API токен перегенерирован")
    } catch (error) {
      console.error("Error regenerating token:", error)
      toast.error("Ошибка перегенерации токена")
    } finally {
      setRegeneratingToken(false)
    }
  }

  const setup2FA = async () => {
    try {
      const data = await aggregatorApi.setup2FA()
      setTwoFASetup(data)
      setTwoFADialog(true)
    } catch (error: any) {
      console.error("Error setting up 2FA:", error)
      toast.error(error?.response?.data?.error || "Ошибка настройки 2FA")
    }
  }

  const verify2FA = async () => {
    if (twoFACode.length !== 6) {
      toast.error("Введите 6-значный код")
      return
    }

    setSetting2FA(true)
    try {
      await aggregatorApi.verify2FASetup(twoFACode)
      toast.success("2FA успешно активирована")
      setTwoFADialog(false)
      setTwoFASetup(null)
      setTwoFACode("")
      await fetchProfile()
    } catch (error: any) {
      console.error("Error verifying 2FA:", error)
      toast.error(error?.response?.data?.error || "Неверный код")
    } finally {
      setSetting2FA(false)
    }
  }

  const disable2FA = async () => {
    if (disable2FACode.length !== 6) {
      toast.error("Введите 6-значный код")
      return
    }

    setDisabling2FA(true)
    try {
      await aggregatorApi.disable2FA(disable2FACode)
      toast.success("2FA успешно отключена")
      setDisable2FADialog(false)
      setDisable2FACode("")
      await fetchProfile()
    } catch (error: any) {
      console.error("Error disabling 2FA:", error)
      toast.error(error?.response?.data?.error || "Неверный код")
    } finally {
      setDisabling2FA(false)
    }
  }

  const deleteSession = async (sessionId: string) => {
    try {
      await aggregatorApi.deleteSession(sessionId)
      toast.success("Сессия завершена")
      await fetchSessions()
    } catch (error) {
      console.error("Error deleting session:", error)
      toast.error("Ошибка завершения сессии")
    }
  }

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text)
    toast.success(`${label} скопирован в буфер обмена`)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Настройки</h1>
        <p className="text-muted-foreground">Управление профилем и безопасностью</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile">Профиль</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
          <TabsTrigger value="security">Безопасность</TabsTrigger>
          <TabsTrigger value="sessions">Сессии</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Информация профиля</CardTitle>
              <CardDescription>
                Обновите информацию вашего профиля
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={profile?.email || ""}
                  disabled
                  className="bg-muted"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name">Название организации</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Введите название"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiBaseUrl">Базовый URL вашего API</Label>
                <Input
                  id="apiBaseUrl"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  placeholder="https://api.example.com"
                />
                <p className="text-xs text-muted-foreground">
                  URL, на который будут отправляться запросы от нашей платформы
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="customApiToken">Кастомный API Token</Label>
                <Input
                  id="customApiToken"
                  value={customApiToken}
                  onChange={(e) => setCustomApiToken(e.target.value)}
                  placeholder="Оставьте пустым для использования автогенерированного"
                />
                <p className="text-xs text-muted-foreground">
                  Если указан, будет использоваться вместо автогенерированного токена
                </p>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Баланс USDT</p>
                  <p className="text-2xl font-bold text-green-600">
                    {profile?.balanceUsdt.toFixed(2) || "0.00"}
                  </p>
                </div>
                <Badge variant={profile?.isActive ? "success" : "destructive"}>
                  {profile?.isActive ? "Активен" : "Неактивен"}
                </Badge>
              </div>
              <Button
                onClick={updateProfile}
                disabled={updatingProfile}
                className="w-full"
              >
                {updatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Сохранить изменения
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="api" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>API токен</CardTitle>
              <CardDescription>
                Управление токеном для API интеграции
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Текущий используемый токен</Label>
                <div className="flex items-center gap-2">
                  <Input
                    value={profile?.customApiToken || profile?.apiToken || ""}
                    type={showToken ? "text" : "password"}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => setShowToken(!showToken)}
                  >
                    {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={() => copyToClipboard(profile?.customApiToken || profile?.apiToken || "", "API токен")}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                {profile?.customApiToken && (
                  <p className="text-xs text-muted-foreground">
                    Используется кастомный токен
                  </p>
                )}
              </div>
              <div className="rounded-lg bg-yellow-50 dark:bg-yellow-900/20 p-4">
                <div className="flex">
                  <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                      Внимание
                    </h3>
                    <p className="mt-1 text-sm text-yellow-700 dark:text-yellow-300">
                      При перегенерации токена старый токен перестанет работать.
                      Убедитесь, что вы обновите токен в вашей системе.
                    </p>
                  </div>
                </div>
              </div>
              <Button
                onClick={regenerateToken}
                disabled={regeneratingToken}
                variant="destructive"
                className="w-full"
              >
                {regeneratingToken ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="mr-2 h-4 w-4" />
                )}
                Перегенерировать токен
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Заголовки запросов</CardTitle>
              <CardDescription>
                Используйте эти заголовки при отправке запросов к нашему API
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="rounded-lg bg-muted p-4">
                  <code className="text-sm">
                    <div>Authorization: Bearer {profile?.customApiToken || profile?.apiToken || "YOUR_API_TOKEN"}</div>
                    <div>Content-Type: application/json</div>
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Также поддерживаются заголовки: X-Aggregator-Token, X-Api-Token
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Изменить пароль</CardTitle>
              <CardDescription>
                Обновите пароль вашего аккаунта
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="currentPassword">Текущий пароль</Label>
                <div className="relative">
                  <Input
                    id="currentPassword"
                    type={showPasswords ? "text" : "password"}
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newPassword">Новый пароль</Label>
                <Input
                  id="newPassword"
                  type={showPasswords ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Подтвердите новый пароль</Label>
                <Input
                  id="confirmPassword"
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                />
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setShowPasswords(!showPasswords)}
                >
                  {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  {showPasswords ? "Скрыть" : "Показать"} пароли
                </Button>
              </div>
              <Button
                onClick={changePassword}
                disabled={changingPassword || !currentPassword || !newPassword || !confirmPassword}
                className="w-full"
              >
                {changingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Изменить пароль
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Двухфакторная аутентификация</CardTitle>
              <CardDescription>
                Добавьте дополнительный уровень безопасности
              </CardDescription>
            </CardHeader>
            <CardContent>
              {profile?.twoFactorEnabled ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-green-600" />
                      <span className="font-medium">2FA активирована</span>
                    </div>
                    <Badge variant="success">Включена</Badge>
                  </div>
                  <Button
                    variant="destructive"
                    onClick={() => setDisable2FADialog(true)}
                    className="w-full"
                  >
                    Отключить 2FA
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Shield className="h-5 w-5 text-muted-foreground" />
                      <span className="font-medium">2FA не активирована</span>
                    </div>
                    <Badge variant="secondary">Выключена</Badge>
                  </div>
                  <Button onClick={setup2FA} className="w-full">
                    <Smartphone className="mr-2 h-4 w-4" />
                    Настроить 2FA
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sessions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Активные сессии</CardTitle>
              <CardDescription>
                Управление активными сессиями вашего аккаунта
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessions.map((session) => (
                  <div
                    key={session.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Globe className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">{session.ip}</span>
                        {session.isExpired && (
                          <Badge variant="destructive">Истекла</Badge>
                        )}
                      </div>
                      {session.userAgent && (
                        <p className="text-sm text-muted-foreground">{session.userAgent}</p>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Создана: {new Date(session.createdAt).toLocaleString()}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteSession(session.id)}
                    >
                      <LogOut className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                {sessions.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Нет активных сессий
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Token Dialog */}
      <Dialog open={tokenDialog} onOpenChange={setTokenDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Новый API токен</DialogTitle>
            <DialogDescription>
              Скопируйте и сохраните новый токен. Он не будет показан снова.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="rounded-lg bg-muted p-4">
              <code className="text-sm break-all">{newToken}</code>
            </div>
            <Button
              onClick={() => copyToClipboard(newToken, "Новый API токен")}
              className="w-full"
            >
              <Copy className="mr-2 h-4 w-4" />
              Скопировать токен
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* 2FA Setup Dialog */}
      <Dialog open={twoFADialog} onOpenChange={setTwoFADialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Настройка 2FA</DialogTitle>
            <DialogDescription>
              Отсканируйте QR-код в приложении Google Authenticator
            </DialogDescription>
          </DialogHeader>
          {twoFASetup && (
            <div className="space-y-4">
              <div className="flex justify-center">
                <div className="relative h-48 w-48">
                  <Image
                    src={twoFASetup.qrCodeDataURL}
                    alt="2FA QR Code"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Или введите код вручную:</Label>
                <div className="rounded-lg bg-muted p-3">
                  <code className="text-sm">{twoFASetup.manualEntryKey}</code>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Введите код из приложения:</Label>
                <InputOTP
                  maxLength={6}
                  value={twoFACode}
                  onChange={setTwoFACode}
                >
                  <InputOTPGroup>
                    {Array.from({ length: 6 }).map((_, i) => (
                      <InputOTPSlot key={i} index={i} />
                    ))}
                  </InputOTPGroup>
                </InputOTP>
              </div>
              <Button
                onClick={verify2FA}
                disabled={setting2FA || twoFACode.length !== 6}
                className="w-full"
              >
                {setting2FA && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Активировать 2FA
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Disable 2FA Dialog */}
      <Dialog open={disable2FADialog} onOpenChange={setDisable2FADialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Отключение 2FA</DialogTitle>
            <DialogDescription>
              Введите код из приложения Google Authenticator для отключения 2FA
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <InputOTP
              maxLength={6}
              value={disable2FACode}
              onChange={setDisable2FACode}
            >
              <InputOTPGroup>
                {Array.from({ length: 6 }).map((_, i) => (
                  <InputOTPSlot key={i} index={i} />
                ))}
              </InputOTPGroup>
            </InputOTP>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setDisable2FADialog(false)}
              >
                Отмена
              </Button>
              <Button
                variant="destructive"
                onClick={disable2FA}
                disabled={disabling2FA || disable2FACode.length !== 6}
              >
                {disabling2FA && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Отключить 2FA
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
