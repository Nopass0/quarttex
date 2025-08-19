import { BaseService } from "./BaseService"
import { db } from "../db"
import { mkdir, writeFile } from "fs/promises"
import { existsSync } from "fs"
import { join } from "node:path"

interface DisputeBotSettings {
	botToken: string | null
	lastUpdateId?: number
}

interface TrackedChatConfig {
	chatId: number
	title?: string
	type?: "SOURCE" | "TARGET"
	monitored?: boolean
	sourceLabel?: number
	traderIds?: string[]
	sourceChatIds?: number[]
}

interface DisputeBotConfig {
	settings: DisputeBotSettings
	chats: TrackedChatConfig[]
}

export default class TelegramDisputeBotService extends BaseService {
	public autoStart = false
	protected interval = 800

	private botToken: string | null = null
	private lastUpdateId: number = 0
	/**
	 * Stores processed forwarding keys to avoid duplicates.
	 * Key format: `${sourceChatId}:${messageId}:${targetChatId}`
	 */
	private processedForwardKeys: Set<string> = new Set()
	private processedChanged = false
	/** For dispute-site messages */
	private processedDisputeKeys: Set<string> = new Set()

	protected async onStart(): Promise<void> {
		await this.loadConfig()
		await this.loadProcessed()
		// Ensure polling works even if webhook was configured previously
		if (this.botToken) {
			try {
				await fetch(`https://api.telegram.org/bot${this.botToken}/deleteWebhook`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ drop_pending_updates: false }),
				})
				await this.logInfo("Deleted Telegram webhook to enable getUpdates polling")
			} catch (e) {
				await this.logWarn("Failed to delete webhook (continuing)", { error: String(e) })
			}
		}
	}

	protected async tick(): Promise<void> {
		if (!this.botToken) return

		try {
			await this.logDebug("Polling updates", { nextOffset: this.lastUpdateId + 1 })
			const updates = await this.getUpdates(this.lastUpdateId + 1)
			if (!updates?.length) return

			for (const update of updates) {
				this.lastUpdateId = update.update_id
				const msg = update.message || update.edited_message || update.channel_post
				if (!msg) continue

				const chat = msg.chat
				await this.ensureChatTracked(chat.id, chat.title || chat.username || chat.type)

				const config = await this.getConfig()
				const tracked = config.chats.find((c) => c.chatId === chat.id)
				const shouldForward = !!tracked && tracked.type === "SOURCE" && tracked.monitored !== false
				await this.logDebug("Update received", { chatId: chat.id, shouldForward, title: chat.title || chat.username || chat.type })

				// Extract candidates from message
				const text = (msg.caption || msg.text || "") as string
				const { numericTokens, textTokens } = this.extractCandidates(msg, text)
				await this.logDebug("Parsed candidates", { 
					numericTokens, 
					textTokens,
					hasDocument: !!msg.document,
					fileName: msg.document?.file_name,
					text: text?.slice(0, 100)
				})

				let tx = null as any
				// 1) Try numericId candidates (only safe integer range and within INT4 bounds)
				for (const n of numericTokens) {
					const num = Number(n)
					if (!Number.isSafeInteger(num) || num > 2147483647) continue
					tx = await db.transaction.findFirst({ where: { numericId: num } })
					if (tx) { await this.logDebug("Matched by numericId", { numericId: num, transactionId: tx.id }); break }
				}
				// 2) Try textual tokens as orderId/id
				if (!tx) {
					for (const tok of textTokens) {
						await this.logDebug("Trying token", { token: tok, length: tok.length })
						
						// Skip very short tokens
						if (tok.length < 3) continue
						
						// Try as transaction ID (cuid/uuid format)
						if (/^[a-z0-9-]{20,40}$/i.test(tok)) {
							tx = await db.transaction.findFirst({ where: { id: tok } })
							if (tx) { 
								await this.logDebug("Matched by internal id", { id: tok, transactionId: tx.id })
								break 
							}
						}
						
						// Try exact orderId match
						tx = await db.transaction.findFirst({ where: { orderId: tok } })
						if (tx) { 
							await this.logDebug("Matched by orderId exact", { orderId: tok, transactionId: tx.id })
							break 
						}
						
						// Try contains for longer tokens
						if (tok.length >= 5) {
							tx = await db.transaction.findFirst({ 
								where: { 
									orderId: { contains: tok } 
								} 
							})
							if (tx) { 
								await this.logDebug("Matched by orderId contains", { orderId: tok, transactionId: tx.id, actualOrderId: tx.orderId })
								break 
							}
						}
						
						// Try startsWith for longer tokens
						if (tok.length >= 5) {
							tx = await db.transaction.findFirst({ 
								where: { 
									orderId: { startsWith: tok } 
								} 
							})
							if (tx) { 
								await this.logDebug("Matched by orderId startsWith", { orderId: tok, transactionId: tx.id, actualOrderId: tx.orderId })
								break 
							}
						}
						
						// Try endsWith for longer tokens
						if (tok.length >= 5) {
							tx = await db.transaction.findFirst({ 
								where: { 
									orderId: { endsWith: tok } 
								} 
							})
							if (tx) { 
								await this.logDebug("Matched by orderId endsWith", { orderId: tok, transactionId: tx.id, actualOrderId: tx.orderId })
								break 
							}
						}
					}
				}
				await this.logDebug("Transaction lookup result", { found: !!tx })
				if (!tx) {
					// If no deal found, still ensure chat gets tracked and continue
					await this.logWarn("No transaction matched", { chatId: chat.id, textSnippet: text?.slice(0, 120) })
					continue
				}
				// Ensure we have traderId to bind dispute correctly
				if (!tx.traderId) {
					await this.logWarn("Transaction has no traderId, skipping dispute", { transactionId: tx.id })
					continue
				}

				// Collect attachments from Telegram message
				const uploadedFiles = await this.collectAndStoreAttachments(msg)
				await this.logDebug("Attachments collected", { count: uploadedFiles.length })

				// Update status to DISPUTE and create DealDispute / message with attachments
				if (tx.status !== "DISPUTE") {
					await db.transaction.update({ where: { id: tx.id }, data: { status: "DISPUTE" } })
					await this.logInfo("Transaction status set to DISPUTE", { transactionId: tx.id })
				}

				const existingDispute = await db.dealDispute.findFirst({ where: { dealId: tx.id, status: { in: ["OPEN", "IN_PROGRESS"] } } })
				const disputeKey = `${chat.id}:${msg.message_id}:dispute`
				if (!existingDispute) {
					// Create dispute; add initial message only if we have files (без текста)
					if (!this.processedDisputeKeys.has(disputeKey)) {
						if (uploadedFiles.length > 0) {
							await db.dealDispute.create({
								data: {
									dealId: tx.id,
									merchantId: tx.merchantId,
									traderId: tx.traderId!,
									messages: {
										create: {
											senderId: tx.merchantId,
											senderType: "MERCHANT",
											message: "",
											attachments: { create: uploadedFiles },
										},
									},
								},
							})
							this.markProcessedDispute(disputeKey)
						} else {
							// No files — just create dispute without message
							await db.dealDispute.create({
								data: {
									dealId: tx.id,
									merchantId: tx.merchantId,
									traderId: tx.traderId!,
								},
							})
						}
					}
				} else {
					// Dispute exists — only add message if we have files and not processed yet (без текста)
					if (uploadedFiles.length > 0 && !this.processedDisputeKeys.has(disputeKey)) {
						await db.dealDisputeMessage.create({
							data: {
								disputeId: existingDispute.id,
								senderId: tx.merchantId,
								senderType: "MERCHANT",
								message: "",
								attachments: { create: uploadedFiles },
							},
						})
						this.markProcessedDispute(disputeKey)
					}
				}

				// Forward/copy message to target chats linked to trader and mapping source -> target
				if (!shouldForward) {
					await this.logDebug("Not forwarding - source chat not monitored", { 
						chatId: chat.id,
						chatType: tracked?.type,
						monitored: tracked?.monitored
					})
				} else if (!tx.traderId) {
					await this.logWarn("Not forwarding - transaction has no traderId", { 
						transactionId: tx.id,
						numericId: tx.numericId
					})
				} else if (shouldForward && tx.traderId) {
					await this.logDebug("Looking for target chats", { 
						traderId: tx.traderId, 
						sourceChatId: chat.id,
						allChats: config.chats.map(c => ({ 
							chatId: c.chatId, 
							type: c.type, 
							traderIds: c.traderIds, 
							sourceChatIds: c.sourceChatIds 
						}))
					})
					
					let targets = config.chats.filter(
						(c) => c.type === "TARGET" && (c.traderIds || []).includes(tx.traderId) && (!c.sourceChatIds || c.sourceChatIds.includes(chat.id))
					)
					if (targets.length === 0) {
						// Fallback: ignore trader filter, only respect source mapping
						targets = config.chats.filter(
							(c) => c.type === "TARGET" && (!c.sourceChatIds || c.sourceChatIds.includes(chat.id))
						)
						await this.logWarn("No targets for trader; using fallback by source only", { 
							traderId: tx.traderId,
							sourceChatId: chat.id, 
							fallbackTargets: targets.map(t => t.chatId),
							targetsFound: targets.length
						})
					} else {
						await this.logDebug("Forwarding to targets", { 
							targets: targets.map(t => t.chatId), 
							sourceChatId: chat.id,
							traderId: tx.traderId
						})
					}
					// Prepare detail message to include deal numericId and trader data
					const trader = tx.traderId ? await db.user.findUnique({ where: { id: tx.traderId }, select: { email: true, numericId: true } }) : null
					const detailText = `Сделка #${tx.numericId}\nТрейдер: ${trader?.email || "—"}${trader?.numericId ? ` (#${trader.numericId})` : ""}`

					for (const t of targets) {
						const fwdKey = `${chat.id}:${msg.message_id}:${t.chatId}`
						if (this.processedForwardKeys.has(fwdKey)) continue
						await this.copyMessage(t.chatId, chat.id, msg.message_id)
						await this.sendTextMessage(t.chatId, detailText)
						this.markProcessed(fwdKey)
					}
				}
			}

			await this.saveSettings({ botToken: this.botToken, lastUpdateId: this.lastUpdateId })
			if (this.processedChanged) {
				await this.saveProcessed()
				this.processedChanged = false
			}
		} catch (e) {
			// swallow errors per tick
		}
	}

	private async getUpdates(offset: number) {
		const resp = await fetch(`https://api.telegram.org/bot${this.botToken}/getUpdates`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ offset, timeout: 0, allowed_updates: ["message", "edited_message", "channel_post"] }),
		})
		if (!resp.ok) return []
		const data = await resp.json()
		return data.result || []
	}

	private async ensureChatTracked(chatId: number, title?: string) {
		const config = await this.getConfig()
		const idx = config.chats.findIndex((c) => c.chatId === chatId)
		if (idx === -1) {
			config.chats.push({ chatId, title, monitored: false })
		} else if (title && config.chats[idx].title !== title) {
			config.chats[idx].title = title
		}
		await this.saveConfig(config)
	}

	private extractCandidates(msg: any, text: string): { numericTokens: string[], textTokens: string[] } {
		const numericTokens = new Set<string>()
		const textTokens = new Set<string>()
		
		// Extract from text/caption
		if (text) {
			// Find all numeric tokens (2-15 digits) - using lookahead/lookbehind for word boundaries
			const numMatches = text.match(/(?<![0-9])\d{2,15}(?![0-9])/g) || []
			numMatches.forEach((n: string) => numericTokens.add(n))
			
			// Find all text tokens (alphanumeric, including Unicode/Cyrillic)
			const textMatches = text.match(/[\p{L}\p{N}_-]{3,}/gu) || []
			textMatches.forEach((t: string) => {
				textTokens.add(t)
				// Also extract embedded numbers from text tokens
				const embeddedNums = t.match(/(?<![0-9])\d{2,15}(?![0-9])/g) || []
				embeddedNums.forEach((n: string) => numericTokens.add(n))
			})
		}
		
		// Extract from document filename if present
		if (msg.document?.file_name) {
			const fileName = msg.document.file_name
			// Extract numeric tokens from filename
			const fileNumMatches = fileName.match(/(?<![0-9])\d{2,15}(?![0-9])/g) || []
			fileNumMatches.forEach((n: string) => numericTokens.add(n))
			
			// Extract text tokens from filename
			const fileTextMatches = fileName.match(/[\p{L}\p{N}_-]{3,}/gu) || []
			fileTextMatches.forEach((t: string) => {
				textTokens.add(t)
				// Also extract embedded numbers from text tokens
				const embeddedNums = t.match(/(?<![0-9])\d{2,15}(?![0-9])/g) || []
				embeddedNums.forEach((n: string) => numericTokens.add(n))
			})
		}
		
		return {
			numericTokens: Array.from(numericTokens),
			textTokens: Array.from(textTokens)
		}
	}

	private async copyMessage(targetChatId: number, fromChatId: number, messageId: number) {
		if (!this.botToken) return
		await fetch(`https://api.telegram.org/bot${this.botToken}/copyMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ chat_id: targetChatId, from_chat_id: fromChatId, message_id: messageId }),
		})
	}

	private async sendTextMessage(targetChatId: number, text: string) {
		if (!this.botToken) return
		await fetch(`https://api.telegram.org/bot${this.botToken}/sendMessage`, {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ chat_id: targetChatId, text }),
		})
	}

	/** Download and store Telegram media, return DealDisputeFile[]-like objects */
	private async collectAndStoreAttachments(msg: any): Promise<Array<{ filename: string; url: string; size: number; mimeType: string }>> {
		const files: Array<{ file_id: string; mime?: string; name?: string }> = []
		if (msg.photo && Array.isArray(msg.photo)) {
			const best = msg.photo[msg.photo.length - 1]
			files.push({ file_id: best.file_id, name: 'photo' })
		}
		if (msg.document) {
			files.push({ 
				file_id: msg.document.file_id, 
				mime: msg.document.mime_type,
				name: msg.document.file_name || 'document'
			})
		}
		if (msg.video) {
			files.push({ 
				file_id: msg.video.file_id, 
				mime: msg.video.mime_type,
				name: 'video'
			})
		}
		if (msg.animation) {
			files.push({ 
				file_id: msg.animation.file_id, 
				mime: msg.animation.mime_type,
				name: 'animation'
			})
		}

		await this.logDebug("Files to download", { 
			count: files.length, 
			types: files.map(f => f.name)
		})

		if (files.length === 0) return []
		if (!this.botToken) return []

		const uploadsDir = join(process.cwd(), "uploads", "deal-disputes")
		if (!existsSync(uploadsDir)) {
			await mkdir(uploadsDir, { recursive: true })
		}

		const saved: Array<{ filename: string; url: string; size: number; mimeType: string }> = []
		for (const f of files) {
			try {
				// 1) getFile
				const gf = await fetch(`https://api.telegram.org/bot${this.botToken}/getFile`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ file_id: f.file_id })
				})
				if (!gf.ok) continue
				const gfj = await gf.json()
				const filePath = gfj?.result?.file_path
				if (!filePath) continue

				// 2) download
				const fileResp = await fetch(`https://api.telegram.org/file/bot${this.botToken}/${filePath}`)
				if (!fileResp.ok) continue
				const buf = Buffer.from(await fileResp.arrayBuffer())
				const ext = filePath.split('.').pop() || 'bin'
				const filename = `${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`
				const full = join(uploadsDir, filename)
				await writeFile(full, buf)

				saved.push({
					filename,
					url: `/api/uploads/deal-disputes/${filename}`,
					size: buf.length,
					mimeType: f.mime || "application/octet-stream",
				})
				
				await this.logDebug("File saved", { 
					originalName: f.name,
					savedAs: filename,
					size: buf.length,
					path: full
				})
			} catch (err) {
				await this.logWarn("Failed to download file", { 
					fileId: f.file_id,
					error: err instanceof Error ? err.message : String(err)
				})
			}
		}
		return saved
	}

	// Config persistence via SystemConfig
	private async loadConfig() {
		const settings = await db.systemConfig.findUnique({ where: { key: "dispute_bot_settings" } })
		if (settings) {
			const parsed: DisputeBotSettings = JSON.parse(settings.value)
			this.botToken = parsed.botToken || null
			this.lastUpdateId = parsed.lastUpdateId || 0
		} else {
			this.botToken = null
			this.lastUpdateId = 0
		}
	}

	private async saveSettings(s: DisputeBotSettings) {
		await db.systemConfig.upsert({
			where: { key: "dispute_bot_settings" },
			create: { key: "dispute_bot_settings", value: JSON.stringify(s) },
			update: { value: JSON.stringify(s) },
		})
	}

	/** Load processed forwarding keys from SystemConfig (limited window) */
	private async loadProcessed() {
		const rec = await db.systemConfig.findUnique({ where: { key: "dispute_bot_processed" } })
		if (rec) {
			try {
				const data = JSON.parse(rec.value) as { keys?: string[]; disputeKeys?: string[] }
				if (Array.isArray(data.keys)) {
					this.processedForwardKeys = new Set(data.keys)
				}
				if (Array.isArray(data.disputeKeys)) {
					this.processedDisputeKeys = new Set(data.disputeKeys)
				}
			} catch {}
		}
	}

	/** Persist processed forwarding keys (keeps only last N keys) */
	private async saveProcessed() {
		const MAX_KEYS = 10000
		// Keep only last N keys deterministically by insertion order
		const keys = Array.from(this.processedForwardKeys)
		const trimmed = keys.length > MAX_KEYS ? keys.slice(keys.length - MAX_KEYS) : keys
		this.processedForwardKeys = new Set(trimmed)
		const dkeys = Array.from(this.processedDisputeKeys)
		const dtrimmed = dkeys.length > MAX_KEYS ? dkeys.slice(dkeys.length - MAX_KEYS) : dkeys
		this.processedDisputeKeys = new Set(dtrimmed)
		await db.systemConfig.upsert({
			where: { key: "dispute_bot_processed" },
			create: { key: "dispute_bot_processed", value: JSON.stringify({ keys: trimmed, disputeKeys: dtrimmed }) },
			update: { value: JSON.stringify({ keys: trimmed, disputeKeys: dtrimmed }) },
		})
	}

	private markProcessed(key: string) {
		this.processedForwardKeys.add(key)
		this.processedChanged = true
	}

	private markProcessedDispute(key: string) {
		this.processedDisputeKeys.add(key)
		this.processedChanged = true
	}

	private async getConfig(): Promise<DisputeBotConfig> {
		const chatsCfg = await db.systemConfig.findUnique({ where: { key: "dispute_bot_chats" } })
		const settingsCfg = await db.systemConfig.findUnique({ where: { key: "dispute_bot_settings" } })
		const config: DisputeBotConfig = {
			settings: settingsCfg ? JSON.parse(settingsCfg.value) : { botToken: null, lastUpdateId: 0 },
			chats: chatsCfg ? JSON.parse(chatsCfg.value) : [],
		}
		this.botToken = config.settings.botToken || null
		this.lastUpdateId = config.settings.lastUpdateId || 0
		return config
	}

	private async saveConfig(config: DisputeBotConfig | { chats: TrackedChatConfig[] }) {
		if ("settings" in config) {
			await this.saveSettings(config.settings)
			await db.systemConfig.upsert({
				where: { key: "dispute_bot_chats" },
				create: { key: "dispute_bot_chats", value: JSON.stringify(config.chats) },
				update: { value: JSON.stringify(config.chats) },
			})
			return
		}
		await db.systemConfig.upsert({
			where: { key: "dispute_bot_chats" },
			create: { key: "dispute_bot_chats", value: JSON.stringify(config.chats) },
			update: { value: JSON.stringify(config.chats) },
		})
	}

	// Admin endpoints for service
	getApp() {
		return this.createEndpointsApp()
			.post("/settings", async ({ body }: any) => {
				const { botToken, resetOffset } = body || {}
				const cfg = await this.getConfig()
				cfg.settings.botToken = botToken || null
				if (resetOffset) cfg.settings.lastUpdateId = 0
				await this.saveConfig(cfg)
				return { success: true }
			})
			.get("/config", async () => {
				const cfg = await this.getConfig()
				return {
					botToken: cfg.settings.botToken ? "••••••••" : "",
					lastUpdateId: cfg.settings.lastUpdateId || 0,
					chats: cfg.chats,
				}
			})
			.put("/chats", async ({ body }: any) => {
				const chats: TrackedChatConfig[] = body?.chats || []
				await this.saveConfig({ chats })
				return { success: true }
			})
	}
}
