import { APP_CONFIG } from "@config/index";
import { EodhdWebSocketTickerSnapshot } from "@core/models/vendors/eodhd/eodhdWebSocketSnapshot.interface";

type Ticker = EodhdWebSocketTickerSnapshot;

export class WebSocketTickerBuffer {
	private buffers: Record<string, Ticker[]> = {};

	constructor(private readonly maxLength: number = APP_CONFIG.TICKER_BUFFER_MAX_LENGTH) {}

	addTick(tick: Ticker): void {
		const symbol = tick.s;

		if (!this.buffers[symbol]) {
			this.buffers[symbol] = [];
		}

		const buffer = this.buffers[symbol];
		buffer.push(tick);

		while (buffer.length > this.maxLength) {
			buffer.shift();
		}
	}

	getBuffer(symbol: string): Ticker[] {
		return this.buffers[symbol] || [];
	}

	getBufferLength(symbol: string): number {
		console.log(`${symbol} buffer length: ${this.buffers[symbol]?.length || 0}`);
		return this.buffers[symbol]?.length || 0;
	}
}
