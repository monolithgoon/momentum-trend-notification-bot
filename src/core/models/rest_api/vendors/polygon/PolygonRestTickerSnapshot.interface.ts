export interface FlatRawPolygonTickerSnapshot {
	polygon_ticker_symbol: RawTickerSnapshot["ticker"]; // Normalized ticker symbol, e.g. "AAPL" for Apple Inc.
	polygon_ticker_name: RawTickerSnapshot["ticker"];
	priceChangeTodayAbs: RawTickerSnapshot["todaysChange"];
	priceChangeTodayPerc: RawTickerSnapshot["todaysChangePerc"];
	lastTradeTimestampNs: RawTickerSnapshot["updated"];
	tradingVolumeToday: RawSnapshotDay["v"]; // Today's trading volume
	rawTickerSnapshot: RawTickerSnapshot;

	currDay: RawSnapshotDay; // Today’s aggregated data
	prevDay: RawSnapshotPrevDay; // Previous day’s aggregated data
	minute: RawSnapshotMinute; // Latest minute snapshot
	lastQuote: RawSnapshotLastQuote; // Last quote info
	lastTrade: RawSnapshotLastTrade; // Last trade info
}

interface RawTickerSnapshot {
	ticker: string;
	todaysChange: number; // Absolute change from prev close to last price
	todaysChangePerc: number; // Percentage change
	updated: number; // Last update timestamp in nanoseconds
}

interface RawSnapshotDay {
	c: number; // close
	h: number; // high
	l: number; // low
	o: number; // open
	v: number; // volume
	vw: number; // volume-weighted average price
}

interface RawSnapshotPrevDay {
	c: number; // close
	h: number; // high
	l: number; // low
	o: number; // open
	v: number; // volume
	vw: number; // volume-weighted average price
}

interface RawSnapshotMinute {
	av: number; // accumulated volume
	c: number; // close
	h: number; // high
	l: number; // low
	n: number; // number of trades
	o: number; // open
	t: number; // timestamp (ms)
	v: number; // volume
	vw: number; // volume-weighted average price
}

interface RawSnapshotLastQuote {
	P: number; // ask price
	S: number; // ask size
	p: number; // bid price
	s: number; // bid size
	t: number; // timestamp (nanoseconds)
}

interface RawSnapshotLastTrade {
	c: number[]; // trade conditions
	i: string; // trade ID
	p: number; // price
	s: number; // size
	t: number; // timestamp (nanoseconds)
	x: number; // exchange ID
}

export function fromNanoSecToDate(nano: number): Date {
	return new Date(nano / 1_000_000); // convert nanoseconds to ms
}

export function fromMilliSecToDate(ms: number): Date {
	return new Date(ms); // milliseconds to Date
}

/**
 * Utility fn. to create an default FlatRawPolygonTickerSnapshot
 * Useful for testing or initializing empty snapshots
 */
export function createTickerSnapshot(overrides: Partial<FlatRawPolygonTickerSnapshot> = {}): FlatRawPolygonTickerSnapshot {
	const polygon_ticker_symbol = "TICKER";
	const lastTradeTimestampNs = Date.now() * 1_000_000;
	return {
		...overrides,
		polygon_ticker_symbol: polygon_ticker_symbol,
		polygon_ticker_name: polygon_ticker_symbol,
		priceChangeTodayAbs: 0,
		priceChangeTodayPerc: 0,
		lastTradeTimestampNs, // nanoseconds
		tradingVolumeToday: 0,
		rawTickerSnapshot: {
			ticker: polygon_ticker_symbol,
			todaysChange: 0,
			todaysChangePerc: 0,
			updated: lastTradeTimestampNs,
		},

		currDay: {
			c: 0,
			h: 0,
			l: 0,
			o: 0,
			v: 0,
			vw: 0,
		},

		prevDay: {
			c: 0,
			h: 0,
			l: 0,
			o: 0,
			v: 0,
			vw: 0,
		},

		minute: {
			av: 0,
			c: 0,
			h: 0,
			l: 0,
			n: 0,
			o: 0,
			t: Date.now(), // ms
			v: 0,
			vw: 0,
		},

		lastQuote: {
			P: 0,
			S: 0,
			p: 0,
			s: 0,
			t: Date.now() * 1_000_000, // nanoseconds
		},

		lastTrade: {
			c: [],
			i: "",
			p: 0,
			s: 0,
			t: Date.now() * 1_000_000, // nanoseconds
			x: 0,
		},
	};
}
