import { IKineticsByMetricMap } from "../types/KineticsComputeSpecTypes";
import { SnapshotMetricFieldKeyType } from "../config/KineticsFieldBindings";

/* ----------------------------------------------------------------------------
   🧩 Adapter: Extracts velocity + acceleration from enriched snapshot into
   IKineticsByMetricMap structure expected by computeMomentumSignalsStage().
   Used per symbol (not batch-level aggregation).
---------------------------------------------------------------------------- */

export function extractKineticsByMetricMap(
	enriched: {
		// Structure from your enrichedSnapshotsMap values
		[key: string]: any;
	}
): IKineticsByMetricMap {
	const output: IKineticsByMetricMap = {};

	// 👇 Supports only two hardcoded metric keys for now
	const metricFieldMappings: Record<SnapshotMetricFieldKeyType, { velocityKey: string; accelerationKey: string }> = {
		pct_change__ld_tick: {
			velocityKey: "pct_change_velocity__ld_tick",
			accelerationKey: "pct_change_acceleration__ld_tick",
		},
		volume__ld_tick: {
			velocityKey: "volume_velocity__ld_tick",
			accelerationKey: "volume_acceleration__ld_tick",
		},
	};

	// 👇 Optional: support multiple spans (e.g., "_3", "_5", "_8") — future enhancement
	const defaultSpan = 3;

	for (const metricKey in metricFieldMappings) {
		const { velocityKey, accelerationKey } = metricFieldMappings[metricKey as SnapshotMetricFieldKeyType];

		// Pull values from enriched object
		const velocity = enriched[velocityKey] ?? 0;
		const acceleration = enriched[accelerationKey] ?? 0;

		if (!output[metricKey]) output[metricKey] = {};
		output[metricKey][defaultSpan] = {
			velocity,
			acceleration,
		};
	}

	return output;
}
