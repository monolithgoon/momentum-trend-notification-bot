import { APP_CONFIG } from "../../config";
import { saveSnapshotToRedis, getRecentSnapshots } from "../../infrastructure/redis/redis.service";
import { PolygonTickerSnapshot } from "./types/polygon/polygonTickerSnapshot.interface";
import { InternalTickerSnapshot } from "./types/internalTickerSnapshot.interface";

/**
 * Converts Polygon's snapshot format to your internal snapshot type.
 */
function transformSnapshot(ticker: string, raw: PolygonTickerSnapshot, rank: number): InternalTickerSnapshot {
	return {
		timestamp: Date.now(),
		ticker,
		rank,
		changePct: raw.priceChangeTodayPerc,
		price: raw.lastTrade?.p,
		volume: raw.tradingVolume?.v,
	};
}

/**
 * Saves current snapshot data and returns map of updated time series (optional).
 */
export async function updateSnapshots(rawSnapshots: PolygonTickerSnapshot[]): Promise<void> {
	for (const [rankIdx, data] of rawSnapshots.entries()) {
		const ticker = data.tickerName;
		const snapshot = transformSnapshot(ticker, data, rankIdx);

		await saveSnapshotToRedis(ticker, snapshot, APP_CONFIG.REDIS_SNAPSHOT_LIMIT);
	}
}

/**
 * Gets last N snapshots from Redis for each ticker in a batch.
 */
export async function getBatchSnapshotSeries(
	tickers: string[],
	depth = 3
): Promise<Record<string, InternalTickerSnapshot[]>> {
	const result: Record<string, InternalTickerSnapshot[]> = {};

	for (const ticker of tickers) {
		const series = await getRecentSnapshots(ticker, depth);
		if (series.length > 0) {
			result[ticker] = series;
		}
	}

	return result;
}
