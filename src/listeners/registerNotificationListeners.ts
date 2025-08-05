import { appEvents } from "@config/appEvents";
import { typedEventEmitter } from "@infrastructure/event_bus/TypedEventEmitter";
import { NotifierService } from "@services/notifier/NotifierService";
import { TelegramNotifier } from "@services/notifier/TelegramService";
import { MarketScanPayload } from "src/types/events/MarketScanEventPayload.interface";

// ✅ Main callback logic
async function handleMarketScanComplete(marketScanPayload: MarketScanPayload): Promise<void> {
	const { tickerNames, snapshots } = marketScanPayload;

	if (!tickerNames?.length) return;

	const notifierService = new NotifierService(new TelegramNotifier());

	// Sort and select top 3 by absolute % change
	const topMovers = [...snapshots]
		.sort((a, b) => Math.abs(b.change_pct__nz_tick) - Math.abs(a.change_pct__nz_tick))
		.slice(0, 3);

	const summaryLines = topMovers.map((t) => {
		const symbol = t.ticker_symbol__nz_tick;
		const pct = t.change_pct__nz_tick.toFixed(2);
		const sign = t.change_pct__nz_tick >= 0 ? "+" : "–";
		return `${symbol} ${sign}${Math.abs(+pct)}%`;
	});

	const message = `Top 3\n` + summaryLines.map((s) => `• ${s}`).join(" ");

	try {
		await notifierService.notify(message);
	} catch (err) {
		console.error("❌ Failed to send Telegram notification:", err);
	}
}

// ✅ Listener registration function
export function registerNotificationListeners(): void {
	typedEventEmitter.on(appEvents.MARKET_SCAN_COMPLETE, handleMarketScanComplete);
}
