import { AccelerationCalcFieldType, VelocityCalcFieldType } from "./types/snapshotFieldTypeAssertions";

/**
 * Configuration for computing kinetics (velocity & acceleration)
 * across multiple lookback windows.
 */
export interface KineticsWindowConfig {
	/** Number of historical snapshots to include in lookback window */
	numLookbackSnapshots: number;
	/** Whether to normalize the metric across tickers */
	normalize?: boolean;
	/** Minimum snapshots required to compute */
	minSnapshots?: number;
}

export type MultiHorizonKineticsConfigType = {
	velocity: Record<VelocityCalcFieldType, KineticsWindowConfig[]>;
	acceleration: Record<AccelerationCalcFieldType, KineticsWindowConfig[]>;
};

/**
 * The global multi-horizon kinetics config for the leaderboard system.
 * Defines how velocity and acceleration are calculated for multiple horizons.
 */
export const MultiHorizonKineticsConfig: MultiHorizonKineticsConfigType = {
	velocity: {
		[VelocityCalcFieldType.PRICE_PCT_CHANGE]: [
			{ numLookbackSnapshots: 3, normalize: true },
			{ numLookbackSnapshots: 5, normalize: true },
			{ numLookbackSnapshots: 8, normalize: true },
		],
		[VelocityCalcFieldType.VOLUME_CHANGE]: [
			{ numLookbackSnapshots: 3, normalize: true },
			{ numLookbackSnapshots: 5, normalize: true },
			{ numLookbackSnapshots: 8, normalize: true },
		],
	},
	acceleration: {
		[AccelerationCalcFieldType.PRICE_PCT_CHANGE]: [
			{ numLookbackSnapshots: 1, normalize: true },
			{ numLookbackSnapshots: 2, normalize: true },
			{ numLookbackSnapshots: 4, normalize: true },
		],
		[AccelerationCalcFieldType.VOLUME_CHANGE]: [
			{ numLookbackSnapshots: 1, normalize: true },
			{ numLookbackSnapshots: 2, normalize: true },
			{ numLookbackSnapshots: 4, normalize: true },
		],
	},
};
