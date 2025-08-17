import { BaseInternalTickerSnapshot } from "./BaseInternalTickerSnapshot.interface";

export interface ILeaderboardTickerSnapshot extends BaseInternalTickerSnapshot {
	readonly ticker_symbol__ld_tick: string;
	readonly ticker_name__ld_tick: string;
	readonly timestamp__ld_tick: number;
	readonly pct_change__ld_tick: number;
	readonly volume__ld_tick: number;
	// Kinetics metrics
	pct_change_velocity__ld_tick: number;
	pct_change_acceleration__ld_tick: number;
	volume_velocity__ld_tick: number;
	volume_acceleration__ld_tick: number;
	// Rank & sort fields
	leaderboard_momentum_score: number;
	// Other
	num_consecutive_appearances: number; // Optional, will be set during merge
	num_consecutive_absences: number; // Optional, will be set during merge
	// rankings
	rankings: {
		recency_rank: number;
		volume_rank: number;
		vol_vel_rank: number;
		vol_acc_rank: number;
		pct_change_rank: number;
		pct_change_vel_rank: number;
		pct_change_acc_rank: number;	
	},
	aggregate_kinetics_rank: number;
	leaderboard_rank: number;
}
