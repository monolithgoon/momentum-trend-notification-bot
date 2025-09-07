import { TNormalizationKey } from "@analytics/math/normalization/strategies";
import { IPerMetricComputePlanSpec } from "../types/KineticsComputeSpecTypes";
import { FIELD_KEYS } from "./KineticsFieldBindings";

/**
 * Validates that:
 * 1. All FIELD_KEYS.METRIC_FIELDS have corresponding compute plans.
 * 2. All compute plans use identical lookback spans AND normalization strategies.
 * Throws if any mismatches are found.
 */
export function assertIdenticalLookbackPlans(perMetricPlans: IPerMetricComputePlanSpec[]) {
	// ─────────────────────────────────────────────
	// STEP 1: Enforce every metric has a plan
	// ─────────────────────────────────────────────
	const expectedMetricKeys = Object.values(FIELD_KEYS.METRIC_FIELDS); // e.g., ["price_pct_change", "volume_change"]
	const providedKeys = new Set(perMetricPlans.map(p => p.metricFieldKey)); // Set { "price_pct_change", "volume_change" }

	const missingKeys = expectedMetricKeys.filter(key => !providedKeys.has(key));
	if (missingKeys.length > 0) {
		throw new Error(
			`Missing compute plans for metric(s): ${missingKeys.join(", ")}`
		);
	}

	// ─────────────────────────────────────────────
	// STEP 2: Use the first plan as the canonical reference
	// ─────────────────────────────────────────────
	const referencePlan = perMetricPlans[0];
	const referenceKey = referencePlan.metricFieldKey;

	// Build map of { lookbackSpan => normalizationStrategy } for reference
	// e.g., Map { 3 => "NONE", 5 => "Z_SCORE", 8 => "Z_SCORE" }
	const referenceMap = new Map<number, TNormalizationKey>();
	for (const { lookbackSpan, normalizeStrategy } of referencePlan.horizons) {
		referenceMap.set(lookbackSpan, normalizeStrategy as TNormalizationKey);
	}
  // Note: The string type is not explicitly defined here.
  // However, if `normalizeStrategy` is a string (from your data or types), 
  // you should ensure it matches the TNormalizationKey enum/type.
  // If you see "Argument of type 'string' is not assignable to parameter of type 'TNormalizationKey'", 
  // it means somewhere `normalizeStrategy` is a string, but the code expects a TNormalizationKey value.
  // Check the type of `normalizeStrategy` in your IPerMetricComputePlanSpec and horizons definitions.
	// ─────────────────────────────────────────────
	// STEP 3: Compare every other plan to the reference
	// ─────────────────────────────────────────────
	for (let i = 1; i < perMetricPlans.length; i++) {
		const currentPlan = perMetricPlans[i];
		const currentKey = currentPlan.metricFieldKey;

		const mismatches: string[] = [];

		// Build map of { lookbackSpan => normalizationStrategy } for current plan
		// e.g., Map { 3 => "NONE", 5 => "Z_SCORE", 8 => "MIN_MAX" }
		const currentMap = new Map<number, TNormalizationKey>();
		for (const { lookbackSpan, normalizeStrategy } of currentPlan.horizons) {
			currentMap.set(lookbackSpan, normalizeStrategy as TNormalizationKey);
		}

		// Gather all unique span values across reference and current
		// e.g., Set { 3, 5, 8 } (even if one is missing from either plan)
		const allSpans = new Set([...referenceMap.keys(), ...currentMap.keys()]);

		// ─────────────────────────────────────────────
		// STEP 4: Check each span for strategy mismatch or absence
		// ─────────────────────────────────────────────
		for (const span of allSpans) {
			const refNorm = referenceMap.get(span);     // expected strategy
			const curNorm = currentMap.get(span);       // actual strategy

			// If either strategy is undefined or they don't match, log it
			if (refNorm !== curNorm) {
				mismatches.push(
					`span ${span}: expected ${refNorm ?? "MISSING"}, found ${curNorm ?? "MISSING"}`
				);
			}
		}

		// ─────────────────────────────────────────────
		// STEP 5: Throw if any mismatches found
		// ─────────────────────────────────────────────
		if (mismatches.length > 0) {
			throw new Error(
				`NormalizationRegistry mismatch for metric "${currentKey}" compared to "${referenceKey}":\n` +
				mismatches.join("\n")
			);
		}
	}
}
