// ---- HANDLE WEBSOCKET TICKER UPDATES ----

import { isTrendingAboveKC } from "@utils/indicators";
import { EodhdWebSocketTickerSnapshot } from "@data/snapshots/rest_api/vendors/eodhd/eodhdWebSocketSnapshot.interface";
import { WebSocketTickerBuffer } from "@data/snapshots/websocket/webSocketTickerBuffer";
import { NotifierService } from "@services/notifier/NotifierService";
import { TelegramNotifier } from "@services/notifier/TelegramService";

export default function handleWebSocketTickerUpdate(tick: EodhdWebSocketTickerSnapshot) {
  const wsTickBuffer = new WebSocketTickerBuffer();
  
  wsTickBuffer.addTick(tick);

  const buffer = wsTickBuffer.getBuffer(tick.s);

  const symbolBufferLength = wsTickBuffer.getBufferLength(tick.s);
  console.log({ symbolBufferLength });

  isTrendingAboveKC(buffer).then(async (trending) => {
    if (trending) {
      const notifierService = new NotifierService(new TelegramNotifier());
      await notifierService.notify(`🚀 ${tick.s} is trending above the KC!`);
    }
  });
}