export interface SnapshotBar {
	/** Unix timestamp (seconds) of this bar */
	t: number;
	o: number; // open
	h: number; // high
	l: number; // low
	c: number; // close
	v: number; // volume
}

export interface SnapshotQuote {
	/** Unix timestamp in microseconds */
	t: number;
	x: number; // exchange id
	p: number; // price
	s: number; // size
	c?: number[]; // condition codes
}

export interface SnapshotTrade {
	/** Unix timestamp in microseconds */
	t: number;
	x: number; // exchange id
	p: number; // price
	s: number; // size
	c?: number[]; // condition codes
	/** trade id string */
	i: string;
}

// REMOVE
// export interface PolygonTickerSnapshot_0 {
// 	ticker: string;
// 	updated: number;
// 	todaysChange: number;
// 	todaysChangePerc: number;
// 	prevDay?: SnapshotBar;
// 	day?: SnapshotBar;
// 	min?: SnapshotBar;
// 	fmv?: number;
// 	lastQuote?: SnapshotQuote;
// 	lastTrade?: SnapshotTrade;
// 	volume: SnapshotBar;
// }

export interface PolygonTickerSnapshot {
	tickerName: string;

  lastTradeTimestampNs: SnapshotTrade; // e.g., 1700000000000 (nanoseconds)
	// lastUpdatedTimestampNs: number;

	priceChangeTodayAbs: number; // e.g., +2.15
	priceChangeTodayPerc: number; // e.g., +3.42%

	previousDayStats?: SnapshotBar;
	currentDayStats?: SnapshotBar;
	oneMinuteStats?: SnapshotBar;

	fairMarketValueEstimate?: number;

	lastQuote?: SnapshotQuote;
	lastTrade?: SnapshotTrade;

	tradingVolume: SnapshotBar;
}
