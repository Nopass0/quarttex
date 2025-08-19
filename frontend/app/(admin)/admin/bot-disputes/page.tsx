"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { MultiSelect } from "@/components/ui/multi-select"
import { toast } from "sonner"
import { adminApiInstance } from "@/services/api"
import { useAdminAuth } from "@/stores/auth"

interface TrackedChatConfig {
	chatId: number
	title?: string
	type?: "SOURCE" | "TARGET"
	monitored?: boolean
	sourceLabel?: number
	traderIds?: string[]
	sourceChatIds?: number[]
}

export default function AdminBotDisputesPage() {
	const [loading, setLoading] = useState(false)
	const [botTokenMasked, setBotTokenMasked] = useState("")
	const [newToken, setNewToken] = useState("")
	const [lastUpdateId, setLastUpdateId] = useState<number>(0)
	const [chats, setChats] = useState<TrackedChatConfig[]>([])
	const [traders, setTraders] = useState<{ id: string; email: string; numericId?: number }[]>([])
	const [saveBusy, setSaveBusy] = useState(false)

	const adminToken = useAdminAuth.getState().token

	const load = async () => {
		setLoading(true)
		try {
			const [cfgRes, chatsRes] = await Promise.all([
				adminApiInstance.get("/admin/bot-disputes/config", { headers: { "x-admin-key": adminToken || "" } }),
				adminApiInstance.get("/admin/bot-disputes/chats", { headers: { "x-admin-key": adminToken || "" } }),
			])
			setBotTokenMasked(cfgRes.data.botToken || "")
			setLastUpdateId(cfgRes.data.lastUpdateId || 0)
			setChats(chatsRes.data.chats || [])
		} catch (e: any) {
			toast.error(e?.response?.data?.error || "Не удалось загрузить конфиг бота")
		} finally {
			setLoading(false)
		}
	}

	// Load traders separately (limit ≤ 100 to satisfy backend validation)
	useEffect(() => {
		(async () => {
			try {
				const tradersRes = await adminApiInstance.get("/admin/traders", { params: { limit: 100 }, headers: { "x-admin-key": adminToken || "" } })
				const list = (tradersRes.data?.data || tradersRes.data?.traders || [])
				const ts = list.map((t: any) => ({ id: t.id, email: t.email, numericId: t.numericId }))
				setTraders(ts)
			} catch (e) {
				// ignore optional failure
			}
		})()
	}, [adminToken])

	useEffect(() => {
		load()
	}, [])

	const saveSettings = async () => {
		setLoading(true)
		try {
			await adminApiInstance.put("/admin/bot-disputes/settings", { botToken: newToken || undefined }, { headers: { "x-admin-key": adminToken || "" } })
			toast.success("Сохранено")
			setNewToken("")
			await load()
		} catch (e: any) {
			toast.error(e?.response?.data?.error || "Ошибка сохранения")
		} finally {
			setLoading(false)
		}
	}

	const resetOffset = async () => {
		try {
			await adminApiInstance.put("/admin/bot-disputes/settings", { resetOffset: true }, { headers: { "x-admin-key": adminToken || "" } })
			toast.success("Сброшен offset")
			await load()
		} catch (e: any) {
			toast.error(e?.response?.data?.error || "Ошибка")
		}
	}

	const startService = async () => {
		try {
			await adminApiInstance.post("/admin/bot-disputes/start", {}, { headers: { "x-admin-key": adminToken || "" } })
			toast.success("Сервис запущен")
		} catch (e: any) {
			toast.error(e?.response?.data?.error || "Ошибка запуска")
		}
	}

	const stopService = async () => {
		try {
			await adminApiInstance.post("/admin/bot-disputes/stop", {}, { headers: { "x-admin-key": adminToken || "" } })
			toast.success("Сервис остановлен")
		} catch (e: any) {
			toast.error(e?.response?.data?.error || "Ошибка остановки")
		}
	}

	const updateChats = async () => {
		setSaveBusy(true)
		try {
			await adminApiInstance.put("/admin/bot-disputes/chats", { chats }, { headers: { "x-admin-key": adminToken || "" } })
			toast.success("Чаты сохранены")
		} catch (e: any) {
			toast.error(e?.response?.data?.error || "Ошибка сохранения чатов")
		} finally {
			setSaveBusy(false)
		}
	}

	const sourceChats = useMemo(() => chats.filter((c) => c.type === "SOURCE"), [chats])
	const targetChats = useMemo(() => chats.filter((c) => c.type === "TARGET"), [chats])
	const untypedChats = useMemo(() => chats.filter((c) => !c.type), [chats])

	return (
		<div className="p-4 space-y-6">
			<h1 className="text-2xl font-semibold">BOT по спорам (Telegram)</h1>

			<Card>
				<CardHeader>
					<CardTitle>Настройки бота</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-end">
						<div>
							<Label>Текущий токен</Label>
							<Input value={botTokenMasked} readOnly placeholder="не установлен" />
						</div>
						<div>
							<Label>Новый токен</Label>
							<Input value={newToken} onChange={(e) => setNewToken(e.target.value)} placeholder="123456789:ABC..." />
						</div>
						<div className="flex gap-2">
							<Button onClick={saveSettings} disabled={loading || (!newToken && !botTokenMasked)}>Сохранить</Button>
							<Button variant="outline" onClick={resetOffset}>Сбросить offset</Button>
							<Button variant="outline" onClick={startService}>Запустить</Button>
							<Button variant="destructive" onClick={stopService}>Остановить</Button>
						</div>
					</div>
					<div className="text-sm text-muted-foreground">Last update id: {lastUpdateId}</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Доступные чаты</CardTitle>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="text-sm text-muted-foreground">Бот автоматически добавляет сюда чаты, из которых приходят сообщения. Отметьте источники и цели, проставьте связи и трейдеров.</div>
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						<div>
							<h3 className="font-medium mb-2">Источники</h3>
							{sourceChats.map((c, idx) => (
								<div key={c.chatId} className="border rounded p-3 mb-2">
									<div className="font-mono text-sm">{c.title || "(нет имени)"} — {c.chatId}</div>
									<div className="flex items-center gap-2 mt-2">
										<Checkbox checked={c.monitored ?? false} onCheckedChange={(v) => setChats((prev) => prev.map((x) => x.chatId === c.chatId ? { ...x, monitored: !!v } : x))} />
										<span className="text-sm">Мониторить</span>
										<Input className="w-24 ml-4" type="number" placeholder="Источник #" value={c.sourceLabel || ""} onChange={(e) => setChats((prev) => prev.map((x) => x.chatId === c.chatId ? { ...x, sourceLabel: Number(e.target.value) } : x))} />
									</div>
								</div>
							))}
							{untypedChats.length > 0 && (
								<div className="mt-2">
									<h4 className="text-sm text-muted-foreground mb-2">Неразмеченные (назначьте тип):</h4>
									{untypedChats.map((c) => (
										<div key={c.chatId} className="border rounded p-3 mb-2">
											<div className="font-mono text-sm">{c.title || "(нет имени)"} — {c.chatId}</div>
											<div className="flex gap-2 mt-2">
												<Button size="sm" variant="outline" onClick={() => setChats((prev) => prev.map((x) => x.chatId === c.chatId ? { ...x, type: "SOURCE", monitored: true } : x))}>Сделать источником</Button>
												<Button size="sm" variant="outline" onClick={() => setChats((prev) => prev.map((x) => x.chatId === c.chatId ? { ...x, type: "TARGET", traderIds: [] } : x))}>Сделать целью</Button>
											</div>
										</div>
									))}
								</div>
							)}
						</div>
						<div>
							<h3 className="font-medium mb-2">Целевые чаты</h3>
							{targetChats.map((c) => (
								<div key={c.chatId} className="border rounded p-3 mb-2">
									<div className="font-mono text-sm">{c.title || "(нет имени)"} — {c.chatId}</div>
									<div className="mt-2">
										<Label>Источники для пересылки</Label>
										<MultiSelect
											options={chats
												.filter((x) => x.type === "SOURCE")
												.map((x) => ({ value: String(x.chatId), label: `${x.title || x.chatId} (${x.chatId})` }))}
											value={(c.sourceChatIds || []).map(String)}
											onChange={(vals) => {
												const arr = vals.map((v) => Number(v))
												setChats((prev) => prev.map((x) => x.chatId === c.chatId ? { ...x, sourceChatIds: arr } : x))
											}}
											placeholder="Выберите источники"
											searchPlaceholder="Поиск источника..."
										/>
									</div>
									<div className="mt-2">
										<Label>Трейдеры</Label>
										<MultiSelect
											options={traders.map((t) => ({ value: t.id, label: `${t.email}${t.numericId ? ` • #${t.numericId}` : ''}` }))}
											value={c.traderIds || []}
											onChange={(vals) => setChats((prev) => prev.map((x) => x.chatId === c.chatId ? { ...x, traderIds: vals } : x))}
											placeholder="Выберите трейдеров"
											searchPlaceholder="Поиск трейдера..."
										/>
										<div className="text-xs text-muted-foreground mt-1">Можно выбрать несколько</div>
									</div>
								</div>
							))}
						</div>
					</div>
					<div className="flex gap-2 mt-2">
						<Button onClick={() => setChats((prev) => [...prev, { chatId: Date.now(), type: "SOURCE", monitored: false }])} variant="outline">Добавить источник (вручную)</Button>
						<Button onClick={() => setChats((prev) => [...prev, { chatId: Date.now(), type: "TARGET", traderIds: [] }])} variant="outline">Добавить цель (вручную)</Button>
						<Button onClick={updateChats} disabled={saveBusy}>Сохранить чаты</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	)
}


