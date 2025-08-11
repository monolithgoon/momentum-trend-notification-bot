import { ILeaderboardTickerSnapshot_2 } from "@core/models/rest_api/ILeaderboardTickerSnapshot.interface copy";
import { assignDenseRanks1Based } from "./assignDenseRanks";
import { ILbTickerKineticsRankings } from "../types/ILbTickerKineticsRankings";
import { LeaderboardTickerSnapshotsSorter_2 } from "../LeaderboardTickerSnapshotsSorter_2";

/**
 * Computes kinetic sub-rankings for each ticker snapshot.
 * Returns a new Map with updated snapshots including `.rankings` and reset absence count.
 */
export function computeKineticsRanks(
	snapshotsMap: Map<string, ILeaderboardTickerSnapshot_2>
): Map<string, ILeaderboardTickerSnapshot_2> {
	// =============================================
	// 🧱 1. Prepare data
	// =============================================
	const snapshots = Array.from(snapshotsMap.values());

	const rankFields = {
		volume_rank: "volume__ld_tick",
		vol_vel_rank: "volume_velocity__ld_tick",
		vol_acc_rank: "volume_acceleration__ld_tick",
		pct_change_rank: "change_pct__ld_tick",
		pct_change_vel_rank: "pct_change_velocity__ld_tick",
		pct_change_acc_rank: "pct_change_acceleration__ld_tick",
	} as const;

	type RankFieldKey = keyof typeof rankFields;

	// =============================================
	// 🧮 2. Compute dense ranks for each metric
	// =============================================
	// FIXME -> why Partial??
	const rankMaps: Partial<Record<RankFieldKey, Map<string, number>>> = {};

	for (const rankKey in rankFields) {
		const metricKey = rankFields[rankKey as RankFieldKey];

		const rankMap = assignDenseRanks1Based(
			snapshots,
			(s) => s.ticker_symbol__ld_tick,
			(s) => Number(s[metricKey] ?? 0)
		);

		rankMaps[rankKey as RankFieldKey] = rankMap;
	}

	// =============================================
	// 🏁 3. Assign ranks to each snapshot
	// =============================================
	const rankedSnapshots = snapshots.map((snapshot) => {
		const symbol = snapshot.ticker_symbol__ld_tick;

		// The sub-ranks haven't been computed yet; using defaults from the transformer
		//  "recency_rank" was computed in prior mergingWithExistingLeaderboard() step
		const rankings: ILbTickerKineticsRankings = {
			volume_rank: snapshot.rankings.volume_rank,
			vol_vel_rank: snapshot.rankings.vol_vel_rank,
			vol_acc_rank: snapshot.rankings.vol_acc_rank,
			pct_change_rank: snapshot.rankings.pct_change_rank,
			pct_change_vel_rank: snapshot.rankings.pct_change_vel_rank,
			pct_change_acc_rank: snapshot.rankings.pct_change_acc_rank,
		};

		// Assign ranks
		for (const rankKey in rankFields) {
			const rankMap = rankMaps[rankKey as RankFieldKey];
			rankings[rankKey as RankFieldKey] = rankMap?.get(symbol) ?? -1;
		}

		return [symbol, { ...snapshot, rankings, num_consecutive_absences: 0 }] as const;
	});

	// =============================================
	// ✅ 4. Return as new map
	// =============================================
	return new Map(rankedSnapshots);
}

// Keys included in the aggregate
const RANK_KEYS = [
	"volume_rank",
	"vol_vel_rank",
	"vol_acc_rank",
	"pct_change_rank",
	"pct_change_vel_rank",
	"pct_change_acc_rank",
] as const;

type RankKey = (typeof RANK_KEYS)[number];

// Use a large finite penalty instead of Infinity to keep sorts sane
const MISSING_RANK_PENALTY = 1e9;

export function computeAggregateRank(snapshots: ILeaderboardTickerSnapshot_2[]): Map<string, ILeaderboardTickerSnapshot_2> {

	const updated: Array<[string, ILeaderboardTickerSnapshot_2]> = snapshots.map((snap) => {
		const rankingFieldValues = RANK_KEYS.map((k: RankKey) => snap.rankings[k] ?? MISSING_RANK_PENALTY);

		const aggregateRank = rankingFieldValues.reduce((sum, val) => sum + val, 0);

		console.log({ symbol: snap.ticker_symbol__ld_tick, aggRank: aggregateRank });

		const enriched: ILeaderboardTickerSnapshot_2 = {
			...snap,
			aggregate_kinetics_rank: aggregateRank,
		};

		return [snap.ticker_symbol__ld_tick, enriched];
	});

	return new Map(updated);
}

export function getFinalLeaderboardRank(
	snapshots: ILeaderboardTickerSnapshot_2[],
	sorter: LeaderboardTickerSnapshotsSorter_2
): ILeaderboardTickerSnapshot_2[] {
	const sorted = sorter.sort(snapshots);

	// Assign final leaderboard_rank (1-based, dense)
	sorted.forEach((snap, idx) => {
		(snap as ILeaderboardTickerSnapshot_2).leaderboard_rank = idx + 1;
	});

	return sorted as ILeaderboardTickerSnapshot_2[];
}
