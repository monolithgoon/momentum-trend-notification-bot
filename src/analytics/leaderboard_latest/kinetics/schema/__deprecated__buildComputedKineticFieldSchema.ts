// buildKineticFieldSchema.ts
import { FIELD_KEYS } from "../types/FieldKeys";
import { IKineticsComputePlanSpec } from "../types/KineticsComputeSpecTypes";

type KKey = (typeof FIELD_KEYS.METRIC_FIELDS)[keyof typeof FIELD_KEYS.METRIC_FIELDS];

type MapShape<LB extends number> = {
	velocity: Record<LB, string>;
	acceleration: Record<LB, string>;
	boosts: Record<string, Record<LB, string>>;
};

type LookbackFrom<C extends IKineticsComputePlanSpec> = C["metricsConfig"][number]["horizons"][number]["lookbackSpan"];

/* ---------------------------------------------------------
   1️⃣ Metric metadata (minimal, centralized)
   - Prefix controls the base of generated keys
   - Boost names enumerate per-metric boost families
--------------------------------------------------------- */
const METRIC_PREFIX: Record<KKey, string> = {
	[FIELD_KEYS.METRIC_FIELDS.PRICE_PCT_CHANGE]: "pct_change",
	[FIELD_KEYS.METRIC_FIELDS.VOLUME_CHANGE]: "volume",
} as const;

const METRIC_BOOSTS: Record<KKey, readonly string[]> = {
	[FIELD_KEYS.METRIC_FIELDS.PRICE_PCT_CHANGE]: ["velocity_boost"],
	[FIELD_KEYS.METRIC_FIELDS.VOLUME_CHANGE]: ["momentum_boost"],
} as const;

/* ---------------------------------------------------------
   2️⃣ Key builder
   - Standardizes the output field naming convention
--------------------------------------------------------- */
const makeKey = (prefix: string, part: string, L: number) => `${prefix}_${part}_L${L}__ld_tick`;

/* ---------------------------------------------------------
   3️⃣ Generator
   - Builds a schema map tightly coupled to cfg lookbacks
   - Returns a value that TS verifies with `satisfies`
--------------------------------------------------------- */
export function buildKineticFieldSchema<C extends IKineticsComputePlanSpec>(cfg: C) {
	type LB = LookbackFrom<C>;

	// unique lookbacks from cfg (drives the schema)
	const lookbackWindows = Array.from(new Set(cfg.metricsConfig.flatMap((m) => m.horizons.map((h) => h.lookbackSpan)))) as LB[];

	const result = {} as Record<KKey, MapShape<LB>>;

	(Object.values(FIELD_KEYS.METRIC_FIELDS) as KKey[]).forEach((metricKey) => {
		const prefix = METRIC_PREFIX[metricKey];
		const boostNames = METRIC_BOOSTS[metricKey];
		const velocity = {} as Record<LB, string>;
		const acceleration = {} as Record<LB, string>;
		const boosts: Record<string, Record<LB, string>> = {};

		lookbackWindows.forEach((L) => {
			velocity[L] = makeKey(prefix, "velocity", L);
			acceleration[L] = makeKey(prefix, "acceleration", L);
			boostNames.forEach((b) => {
				(boosts[b] ||= {} as Record<LB, string>)[L] = makeKey(prefix, b, L);
			});
		});

		result[metricKey] = { velocity, acceleration, boosts } as MapShape<LB>;
	});

	return result satisfies Record<KKey, MapShape<LB>>;
}

/**
 * USAGE
 * 
 * import { kineticsConfigSpec } from "../config/kineticsConfigSpec";
 * import { buildKineticFieldSchema } from "./buildKineticFieldSchema";
 *
 * // if you want 3|5|8 as a literal union, declare the config as const:
 * export const kineticMetricFieldsMap = buildKineticFieldSchema(kineticsConfigSpec as const);
 * // otherwise, LB is just `number` (still fine, just less precise)
 *
 */
