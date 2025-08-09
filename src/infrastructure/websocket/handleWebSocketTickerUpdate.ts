// ---- HANDLE WEBSOCKET TICKER UPDATES ----

import { EodhdWebSocketTickerSnapshot } from "@core/models/rest_api/vendors/eodhd/eodhdWebSocketSnapshot.interface";
import { wsTickBuffer } from "./wsTickBufferInstance";
import { isTrendingAboveKC } from "src/analytics/indicators";
import { NotifierService } from "src/services/notifier/NotifierService";
import { TelegramNotifier } from "src/services/notifier/TelegramService";

export default function handleWebSocketTickerUpdate(tick: EodhdWebSocketTickerSnapshot) {
	wsTickBuffer.addTick(tick);

	const buffer = wsTickBuffer.getBuffer(tick.s);
	const symbolBufferLength = wsTickBuffer.getBufferLength(tick.s);

	console.log({ symbol: tick.s, bufferSize: symbolBufferLength, snapshot: tick });

	isTrendingAboveKC(buffer).then(async (trending) => {
		if (trending) {
			const notifierService = new NotifierService(new TelegramNotifier());
			await notifierService.notify(`🚀 ${tick.s} is trending above the KC!`);
		}
	});
}
