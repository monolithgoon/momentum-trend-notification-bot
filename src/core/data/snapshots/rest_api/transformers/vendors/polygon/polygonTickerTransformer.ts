import { NormalizedRestTickerSnapshot } from "@core/data/snapshots/rest_api/types/NormalizedRestTickerSnapshot.interface";
import { PolygonRestTickerSnapshot } from "../../../vendors/polygon/PolygonRestTickerSnapshot.interface";
import { RawRestApiTickerTransformer } from "../../types/RawRestApiTickerTransformer.interface";

export class PolygonTickerTransformer implements RawRestApiTickerTransformer<PolygonRestTickerSnapshot> {
	transform(snapshot: PolygonRestTickerSnapshot, sortRank: number): NormalizedRestTickerSnapshot {
		return {
			timestamp: snapshot.lastTradeTimestampNs,
			n_ticker_name: snapshot.polygon_ticker_name,
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
			ld_ticker_name: snapshot.n_ticker_name,
			ld_change_pct: snapshot.change_pct,
			ld_timestamp: snapshot.timestamp,
			ld_volume: snapshot.volume ?? 0,
			ld_pct_change_velocity: 0,
			ld_pct_change_acceleration: 0,
			ld_volume_velocity: 0,
			ld_volume_acceleration: 0,
			ld_ordinal_sort_position: snapshot.ordinal_sort_position,
			leaderboard_momentum_score: 0, // Placeholder, will be computed later
			leaderboard_rank: 0,
			num_consecutive_appearances: 1, // Default to 1, will be updated during merge
		};
	}
}