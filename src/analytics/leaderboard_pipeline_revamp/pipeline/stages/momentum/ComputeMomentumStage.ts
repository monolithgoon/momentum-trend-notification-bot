/* ----------------------------------------------------------------------------
   ⚡ ComputeMomentumStage
   Contract:
     input : ["kineticsBySymbol"]
     output: ["momentumBySymbol"]

   - Reads MomentumComputationSpec from ctx.config?.momentum
   - Pluggable normalizer via the Normalizer interface (no-op by default)
---------------------------------------------------------------------------- */

import {
	PipelineContext,
	IKineticsEnvelope,
	MomentumEnvelope,
	MomentumVector,
	Span,
	Direction,
	MomentumComputationSpec,
} from "../../context/PipelineContext";
import { Stage } from "../../__deprecated__contracts/StageContract";

/* Normalizer contract — wire your math module here */
type Normalizer = (value: number, series: number[], strategy: string, opts?: { direction?: Direction }) => number;
const identityNorm: Normalizer = (v) => v;

export class ComputeMomentumStage implements Stage<"kineticsBySymbol", "momentumBySymbol"> {
	name = "ComputeMomentumStage" as const;
	contract = {
		input: ["kineticsBySymbol"] as const,
		output: ["momentumBySymbol"] as const,
	};

	constructor(private readonly normalize: Normalizer = identityNorm) {}

	async run(ctx: Pick<PipelineContext, "kineticsBySymbol"> & Partial<PipelineContext>) {
		const spec: MomentumComputationSpec = ctx.config?.momentum ?? {
			priceWeight: 1,
			volumeWeight: 1,
			includeAccelerationChk: false,
			normalizeChk: false,
			boostFormula: (v, a) => v * a,
			baseMetricKeys: { priceMetricKey: "price_pct_change", volumeMetricKey: "volume_change" },
		};

		const priceKey = spec.baseMetricKeys.priceMetricKey;
		const volumeKey = spec.baseMetricKeys.volumeMetricKey;

		const momentumBySymbol = new Map<string, MomentumEnvelope>();

		for (const [symbol, kin] of (ctx.kineticsBySymbol ?? new Map()).entries()) {
			const priceMap = kin.byMetric[priceKey];
			const volumeMap = kin.byMetric[volumeKey];
			if (!priceMap || !volumeMap) {
				momentumBySymbol.set(symbol, { bySpan: {} });
				continue;
			}

			const spans: Span[] = Array.from(
				new Set<number>([...Object.keys(priceMap).map(Number), ...Object.keys(volumeMap).map(Number)])
			).sort((a, b) => a - b);

			// Build series for normalization once
			const pVelSeries = spans.map((s) => priceMap[s]?.velocity ?? 0);
			const vVelSeries = spans.map((s) => volumeMap[s]?.velocity ?? 0);
			const pAccSeries = spans.map((s) => priceMap[s]?.acceleration ?? 0);
			const vAccSeries = spans.map((s) => volumeMap[s]?.acceleration ?? 0);

			const normEnabled = !!spec.normalizeChk;
			const strategy =
				typeof spec.normalizeChk === "object" && spec.normalizeChk.strategy
					? spec.normalizeChk.strategy
					: "Z_SCORE";
			const direction: Direction =
				typeof spec.normalizeChk === "object" && spec.normalizeChk.direction ? spec.normalizeChk.direction : "asc";

			const bySpan: Record<number, MomentumVector> = {};

			for (const span of spans) {
				let pVel = priceMap[span]?.velocity ?? 0;
				let vVel = volumeMap[span]?.velocity ?? 0;
				let pAcc = priceMap[span]?.acceleration ?? 0;
				let vAcc = volumeMap[span]?.acceleration ?? 0;

				if (normEnabled) {
					pVel = this.normalize(pVel, pVelSeries, strategy, { direction });
					vVel = this.normalize(vVel, vVelSeries, strategy, { direction });
					if (spec.includeAccelerationChk) {
						pAcc = this.normalize(pAcc, pAccSeries, strategy, { direction });
						vAcc = this.normalize(vAcc, vAccSeries, strategy, { direction });
					}
				}

				const base = spec.boostFormula ? spec.boostFormula(pVel, vVel) : pVel * vVel;
				const withAcc = spec.includeAccelerationChk
					? base + (spec.boostFormula ? spec.boostFormula(pAcc, vAcc) : pAcc * vAcc)
					: base;
				const momentumScore = withAcc * (spec.priceWeight ?? 1) * (spec.volumeWeight ?? 1);

				bySpan[span] = {
					span,
					momentumScore,
					breakdown: {
						priceVelocity: pVel,
						priceAcceleration: pAcc,
						volumeVelocity: vVel,
						volumeAcceleration: vAcc,
						baseMomentum: base,
					},
				};
			}

			momentumBySymbol.set(symbol, { bySpan });
		}

		return { momentumBySymbol };
	}
}
