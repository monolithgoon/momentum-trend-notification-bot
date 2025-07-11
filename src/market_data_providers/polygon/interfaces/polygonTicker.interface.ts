export interface PolygonTickerSnapshot {
	tickerName: RawTickerSnapshot["ticker"];
	priceChangeTodayAbs: RawTickerSnapshot["todaysChange"];
	priceChangeTodayPerc: RawTickerSnapshot["todaysChangePerc"];
	lastTradeTimestampNs: RawTickerSnapshot["updated"];
	rawTickerSnapshot: RawTickerSnapshot;
	tradingVolumeToday: RawSnapshotDay["v"]; // Today's trading volume

	currDay: RawSnapshotDay; // Today’s aggregated data
	prevDay: RawSnapshotPrevDay; // Previous day’s aggregated data
	minute: RawSnapshotMinute; // Latest minute snapshot
	lastQuote: RawSnapshotLastQuote; // Last quote info
	lastTrade: RawSnapshotLastTrade; // Last trade info
}

export interface TopMarketMoversResponse {
	status: string; // "OK" if successful
	tickers: RawTickerSnapshot[];
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
