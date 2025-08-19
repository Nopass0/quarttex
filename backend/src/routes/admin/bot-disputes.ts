import { Elysia, t } from "elysia"
import { db } from "@/db"
import { serviceRegistry } from "@/services/ServiceRegistry"

export const botDisputesRoutes = new Elysia({ prefix: "/bot-disputes" })
	.get("/config", async () => {
		const settings = await db.systemConfig.findUnique({ where: { key: "dispute_bot_settings" } })
		const chats = await db.systemConfig.findUnique({ where: { key: "dispute_bot_chats" } })
		const s = settings ? JSON.parse(settings.value) : { botToken: "", lastUpdateId: 0 }
		const c = chats ? JSON.parse(chats.value) : []
		return { botToken: s.botToken ? "••••••••" : "", lastUpdateId: s.lastUpdateId || 0, chats: c }
	})
	.put("/settings", async ({ body }) => {
		const { botToken, resetOffset } = body as { botToken?: string; resetOffset?: boolean }
		const settings = await db.systemConfig.findUnique({ where: { key: "dispute_bot_settings" } })
		let lastUpdateId = settings ? (JSON.parse(settings.value).lastUpdateId || 0) : 0
		if (resetOffset) lastUpdateId = 0
		await db.systemConfig.upsert({
			where: { key: "dispute_bot_settings" },
			create: { key: "dispute_bot_settings", value: JSON.stringify({ botToken: botToken || null, lastUpdateId }) },
			update: { value: JSON.stringify({ botToken: botToken || null, lastUpdateId }) },
		})
		return { success: true }
	}, {
		body: t.Object({ botToken: t.Optional(t.String()), resetOffset: t.Optional(t.Boolean()) })
	})
	.get("/chats", async () => {
		const chats = await db.systemConfig.findUnique({ where: { key: "dispute_bot_chats" } })
		return { chats: chats ? JSON.parse(chats.value) : [] }
	})
	.put("/chats", async ({ body }) => {
		const { chats } = body as { chats: any[] }
		await db.systemConfig.upsert({
			where: { key: "dispute_bot_chats" },
			create: { key: "dispute_bot_chats", value: JSON.stringify(chats || []) },
			update: { value: JSON.stringify(chats || []) },
		})
		return { success: true }
	}, {
		body: t.Object({ chats: t.Array(t.Any()) })
	})
	.post("/start", async () => {
		const svc = serviceRegistry.getService("TelegramDisputeBotService")
		if (!svc) throw new Error("Service not found")
		await serviceRegistry.startService("TelegramDisputeBotService")
		return { success: true }
	})
	.post("/stop", async () => {
		const svc = serviceRegistry.getService("TelegramDisputeBotService")
		if (!svc) throw new Error("Service not found")
		await serviceRegistry.stopService("TelegramDisputeBotService")
		return { success: true }
	})
