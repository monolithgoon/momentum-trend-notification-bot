import { TNormalizationKey } from "@analytics/math/normalization/strategies";
import { Direction } from "../stages/kinetics/types/KineticsComputeSpecTypes";
import { IKineticsConfigSpec } from "../stages/kinetics/types/KineticsConfig.interface";

/* ============================================================================
   🧠 Pipeline Config
   ----------------------------------------------------------------------------
   - Pure declarative configuration for the pipeline
   - Keeps stages pure: they only read from ctx.config
   - Covers kinetics, momentum, ranking, and algorithm choice
============================================================================ */

// REMOVE - UN-NEEDED
/* ----------------------------------------------------------------------------
   🧩 Momentum Spec (compact config for momentum computation)
---------------------------------------------------------------------------- */
export interface MomentumComputationSpec {
	normalizeChk?:
		| boolean
		| {
				strategy?: TNormalizationKey;
				direction?: Direction;
		  };
	priceWeight?: number;
	volumeWeight?: number;
	includeAccelerationChk?: boolean;
	boostFormula?: (v: number, a: number) => number;
	baseMetricKeys: {
		priceMetricKey: string; // e.g., "price_pct_change"
		volumeMetricKey: string; // e.g., "volume_change"
	};
}

export interface IPipelineConfig extends Record<string, unknown> {
	computeSpec: {
		minSnapshotsNeeded: number;
		kinetics: IKineticsConfigSpec;
		momentum?: MomentumComputationSpec; // optional higher-level momentum config
	};

	ranking?: {
		scoringStrategy?: "sum" | "max" | "latest"; // how to aggregate scores
		limit?: number; // cap number of ranked outputs
	};

	/**
	 * Algorithm for velocity/acceleration computation
	 * - "DIFF" = finite differences
	 * - "OLS"  = regression slope (reserved)
	 */
	algorithm?: "DIFF" | "OLS";
}
