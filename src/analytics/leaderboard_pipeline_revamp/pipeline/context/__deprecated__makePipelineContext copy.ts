import { FIELD_KEYS } from "@analytics/leaderboard_latest/kinetics/config/KineticsFieldBindings";
import { IPipelineContext } from "./PipelineContext.interface";
import { IKineticsConfigSpec, THorizonConfigSpec } from "../stages/kinetics/types/KineticsConfig.interface";

export function makedPipelineContext(overrides: Partial<IPipelineContext> = {}): IPipelineContext {
	const horizons: THorizonConfigSpec = { 3: "Z_SCORE", 5: "Z_SCORE", 8: "NONE" };
	const widestLookbackSpan: number = Math.max(...Object.keys(horizons).map(Number));
	const pipelineKineticsSpec: IKineticsConfigSpec = {
		// kinetics: {
		horizons: { 3: "Z_SCORE", 5: "Z_SCORE", 8: "NONE" },
		// horizons: { 3: "Z_SCORE", 5: "Z_SCORE", 8: "NONE", 15: "NONE" },
		metrics: {
			price: {
				key: FIELD_KEYS.METRIC_FIELDS.PRICE_PCT_CHANGE,
				enableVelocityGuard: true,
				minVelocity: 0.02,
			},
			volume: {
				key: FIELD_KEYS.METRIC_FIELDS.VOLUME_CHANGE,
				enableVelocityGuard: false,
			},
		},
		velNormStrat: "NONE",
		accelNormStrat: "NONE",
		weights: { price: 1, volume: 1 },
		includeAcceleration: true,
		// },
	};

	return {
		nowEpochMs: Date.now(),
		tickerSymbolFieldKey: FIELD_KEYS.TICKER_SYMBOL_FIELD,
		timestampFieldKey: FIELD_KEYS.TIMESTAMP_FIELD,
		correlationId: `ctx_${Date.now()}`,
		incomingBatch: [],
		historyBySymbol: {},
		config: {
			computeSpec: {
				minSnapshotsNeeded: widestLookbackSpan + 1, // +1 because accel. needs one more than vel.
				kinetics: pipelineKineticsSpec,
				// kinetics: {
				// 	horizons,
				// 	metrics: {
				// 		price: {
				// 			key: FIELD_KEYS.METRIC_FIELDS.PRICE_PCT_CHANGE,
				// 			enableVelocityGuard: true,
				// 			minVelocity: 0.02,
				// 		},
				// 		volume: {
				// 			key: FIELD_KEYS.METRIC_FIELDS.VOLUME_CHANGE,
				// 			enableVelocityGuard: false,
				// 		},
				// 	},
				// 	velNormStrat: "NONE",
				// 	accelNormStrat: "NONE",
				// 	weights: { price: 1, volume: 1 },
				// 	includeAcceleration: true,
				// },
			},
			ranking: { scoringStrategy: "sum", limit: 10 },
			algorithm: "DIFF",
		},
		...overrides, // allow per-run customization
	};
}

// export function makePipelineContext(
//   overrides: Partial<IPipelineContext> = {}
// ): IPipelineContext {
//   const baseConfig = {
//     computeSpec: {
//       kinetics: {
//         horizons: { 3: "Z_SCORE", 5: "Z_SCORE", 8: "NONE" },
//         metrics: {
//           price: {
//             key: FIELD_KEYS.METRIC_FIELDS.PRICE_PCT_CHANGE,
//             enableVelocityGuard: true,
//             minVelocity: 0.02,
//           },
//           volume: {
//             key: FIELD_KEYS.METRIC_FIELDS.VOLUME_CHANGE,
//             enableVelocityGuard: false,
//           },
//         },
//         velNormStrat: "NONE",
//         accelNormStrat: "NONE",
//         weights: { price: 1, volume: 1 },
//         includeAcceleration: true,
//       },
//     },
//     ranking: { scoringStrategy: "sum", limit: 10 },
//     algorithm: "DIFF" as const,
//   };

//   // Derive from config horizons
//   const widestLookbackSpan = Math.max(
//     ...Object.keys(baseConfig.computeSpec.kinetics.horizons).map(Number)
//   );

//   return {
//     symbolFieldKey: FIELD_KEYS.TICKER_SYMBOL_FIELD,
//     timestampFieldKey: FIELD_KEYS.TIMESTAMP_FIELD,
//     correlationId: `ctx_${Date.now()}`,
//     incomingBatch: [],
//     historyBySymbol: {},
//     config: baseConfig,
//     // expose widest lookback as part of context if useful to stages
//     nowEpochMs: Date.now(),
//     ...overrides,
//   };
// }
