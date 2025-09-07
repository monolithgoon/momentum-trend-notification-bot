import { defineStage } from "../../types/Stage.interface";
import { DEFAULT_KINETICS_CONFIG, IKineticsConfigSpec } from "./types/KineticsConfig.interface";
import { buildKineticsComputeSpecFromConfig } from "./types/buildKineticsComputeSpecFromConfig";
import { IKineticsEnvelope } from "./types/KineticsComputeResult.type";
import { TKineticsSnapshot, TBaseSnapshot, TEnrichedSnapshot } from "../../types/Snapshots.type";
import { KineticsEngine } from "@analytics/leaderboard_latest/kinetics/core/KineticsEngine";
import { KineticsEngine_2 } from "./KineticsEngine";

/**
 * Stage: ComputeKineticsStage_5
 * ---------------------------------------------------------------------------
 * SEMANTIC ROLE:
 * - Enrich incoming snapshots with kinetics (velocity, acceleration)
 * - Compute momentum at the same stage for consistency
 * - Provide a full IKineticsEnvelope even for insufficient history (empty case)
 *
 * POLICY:
 * - Always return a valid envelope per symbol
 * - Respect injectedCfg but fall back to DEFAULT_KINETICS_CONFIG
 * - Uniform horizons across metrics to ensure comparability
 */
export const ComputeKineticsStage_5 = defineStage({
	name: "ComputeKineticsStage",
	contract: {
		input: ["incomingBatch", "historyBySymbol", "config", "tickerSymbolFieldKey", "timestampFieldKey"] as const,
		output: ["kineticsBySymbol", "kineticsBatch"] as const,
	},

	async compute(ctx) {
		// 1️⃣ Resolve compute spec. config (fallback → DEFAULT)
		// const injectedCfg = (ctx.config.computeSpec.kinetics ?? {}) as Partial<IKineticsConfigSpec>;
		// const cfgSpec: IKineticsConfigSpec = {
		// 	...DEFAULT_KINETICS_CONFIG,
		// 	...injectedCfg,
		// 	metrics: { ...DEFAULT_KINETICS_CONFIG.metrics, ...injectedCfg.metrics },
		// 	horizons: { ...DEFAULT_KINETICS_CONFIG.horizons, ...injectedCfg.horizons },
		// 	weights: { ...DEFAULT_KINETICS_CONFIG.weights, ...injectedCfg.weights },
		// };

		// Get compute spec. from pipeline context
		const cfgSpec: IKineticsConfigSpec = ctx.config.computeSpec.kinetics;

		// 2️⃣ Derive pipeline compute spec (vel, accel)
		const computeSpec = buildKineticsComputeSpecFromConfig(cfgSpec);

		// 3️⃣ Prepare snapshot+history maps
		const readySnapshots: TBaseSnapshot[] = [];
		const readyHistory: Record<string, TBaseSnapshot[]> = {};
		const kinetics_results_map = new Map<string, IKineticsEnvelope>();

		for (const snapshot of ctx.incomingBatch ?? []) {
			/* ============================================================================
         Example: PerMetricComputePlan → ResolvedComputePlan Transformation
         ---------------------------------------------------------------------------
         Conceptual: Each metric (price/volume) combined with lookbackSpans expands into
         concrete jobs. This stage executes those directly by calling
         computeVelocity_2 / computeAcceleration_2.

         User Spec (cfgSpec):
           lookbackSpans: [3,5]
           metrics: { priceKey: "pct_change__ld_tick", volumeKey: "volume__ld_tick" }

         Runtime Expansion:
           [
             { metricKey: "pct_change__ld_tick", lookbackSpan: 3 },
             { metricKey: "pct_change__ld_tick", lookbackSpan: 5 },
             { metricKey: "volume__ld_tick",     lookbackSpan: 3 },
             { metricKey: "volume__ld_tick",     lookbackSpan: 5 },
           ]
      ============================================================================ */

			const tickerSymbol: string = String(snapshot[ctx.tickerSymbolFieldKey]);
			const ts = snapshot[ctx.timestampFieldKey];
			let history = ctx.historyBySymbol?.[tickerSymbol] ?? [];

			// Sort ascending if needed
			if (
				history.length > 1 &&
				Number(history[0][ctx.timestampFieldKey]) > Number(history[history.length - 1][ctx.timestampFieldKey])
			) {
				history = [...history].sort((a, b) => Number(a[ctx.timestampFieldKey]) - Number(b[ctx.timestampFieldKey]));
			}

			// Append current snapshot if newer than last in history
			const lastTs = history[history.length - 1]?.[ctx.timestampFieldKey] as number | undefined;
			if (lastTs == null || lastTs < (ts as number)) {
				history = [...history, snapshot];
			}

			// Not enough history → empty envelope
			if (history.length < ctx.config.computeSpec.minSnapshotsNeeded) {
				kinetics_results_map.set(tickerSymbol, { byMetric: {} });
				continue;
			}

			readySnapshots.push(snapshot);
			readyHistory[tickerSymbol] = [...history];
		}

		// REMOVE
		// 4️⃣ Compute via KineticsPipeline
		const kEngine = new KineticsEngine<TBaseSnapshot & Record<string, unknown>>({
			pipelineComputeSpec: computeSpec,
			tickerSymbolFieldKey: ctx.tickerSymbolFieldKey,
			timestampFieldKey: ctx.timestampFieldKey,
		});

		// REMOVE
		const computed = kEngine.processBatch(readySnapshots, readyHistory);

		const engine = new KineticsEngine_2({
			pipelineComputeSpec: computeSpec,
			tickerSymbolFieldKey: ctx.tickerSymbolFieldKey,
			timestampFieldKey: ctx.timestampFieldKey,
		});

		const kinetics = engine.processBatch(readySnapshots, readyHistory);

		// 5️⃣ Build envelope map
		for (const [symbol, snapshot] of kinetics.entries()) {
			// Ensure all nested properties are present and not undefined
			const envelope: IKineticsEnvelope = {
				byMetric: Object.fromEntries(
					Object.entries(snapshot.derivedProps.computedKinetics.byMetric ?? {}).map(
						([metricKey, metricEnvelope]) => [
							metricKey,
							{
								byLookbackSpan: Object.fromEntries(
									Object.entries(metricEnvelope.byLookbackSpan ?? {}).flatMap(([span, point]) =>
										point !== undefined ? [[span, point]] : []
									)
								),
							},
						]
					)
				),
			};
			kinetics_results_map.set(symbol, envelope);
		}

		// // 6️⃣ Project envelopes → TKineticsSnapshot[]
		// const kineticsBatch: TKineticsSnapshot[] = (ctx.incomingBatch ?? []).map((snap) => {
		// 	const symbol = String(snap[ctx.tickerSymbolFieldKey]); // safe: tickerSymbolFieldKey always string
		// 	return {
		// 		...snap,
		// 		derivedProps: {
		// 			computedKinetics: kinetics_results_map.get(symbol) ?? { byMetric: {} },
		// 		},
		// 	};
		// });

		// 6️⃣ Project envelopes → TEnrichedSnapshot[]
		const kineticsBatch: TEnrichedSnapshot[] = (ctx.incomingBatch ?? []).map((snap) => {
			const symbol = String(snap[ctx.tickerSymbolFieldKey]); // safe: tickerSymbolFieldKey always string

			return {
				...snap,
				derivedProps: {
					...(snap.derivedProps ?? {}), // preserve any prior enrichments
					computedKinetics: kinetics_results_map.get(symbol) ?? { byMetric: {} },
				},
			};
		});

		return { kineticsBySymbol: kinetics_results_map, kineticsBatch };
	},
});
