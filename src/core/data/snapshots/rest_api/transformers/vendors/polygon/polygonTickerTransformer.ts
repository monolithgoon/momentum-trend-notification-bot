import { NormalizedRestTickerSnapshot } from "@core/data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { PolygonRestTickerSnapshot } from "../../../vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RawRestApiTickerTransformer } from "../../types/RawRestApiTickerTransformer.interface";

export class PolygonTickerTransformer implements RawRestApiTickerTransformer<PolygonRestTickerSnapshot> {
	transform(snapshot: PolygonRestTickerSnapshot, sortRank: number): NormalizedRestTickerSnapshot {
		return {
			timestamp: snapshot.lastTradeTimestampNs,
			ticker_name__nz_tick: snapshot.polygon_ticker_name,
			change_pct: snapshot.priceChangeTodayPerc,
			price: snapshot.lastTrade?.p,
			volume: snapshot.tradingVolumeToday,
			ordinal_sort_position: sortRank,
		};
	}
}


// TODO -> move out of here
import { NormalizedRestTickerSnapshotTransformer } from "../../types/NormalizedRestTickerSnapshotTransformer.interface";
import { LeaderboardRestTickerSnapshot } from "../../../types/LeaderboardRestTickerSnapshot.interface";

export class LeaderboardTickerTransformer implements NormalizedRestTickerSnapshotTransformer<LeaderboardRestTickerSnapshot> {

	transform(snapshot: NormalizedRestTickerSnapshot): LeaderboardRestTickerSnapshot {
		return {
			...snapshot,
			ticker_name__ld_tick: snapshot.ticker_name__nz_tick,
			change_pct__ld_tick: snapshot.change_pct,
			timestamp__ld_tick: snapshot.timestamp,
			volume__ld_tick: snapshot.volume ?? 0,
			pct_change_velocity__ld_tick: 0,
			pct_change_acceleration__ld_tick: 0,
			volume_velocity__ld_tick: 0,
			volume_acceleration__ld_tick: 0,
			ordinal_sort_position__ld_tick: snapshot.ordinal_sort_position,
			leaderboard_momentum_score: 0, // Placeholder, will be computed later
			leaderboard_rank: 0,
			num_consecutive_appearances: 1, // Default to 1, will be updated during merge
		};
	}
}