/* ============================================================================
   CORE CONTEXTUAL COMMENT — index.ts
   ----------------------------------
   Public surface for normalization. Exposes:
   - Enum of strategy names
   - applyNormalization(value, series, strategy, opts)
   - Registry extension points
   - Optional precompute helpers
=========================================================================== */

import { NormalizationFn, PrecomputedStats, IScalarPoint, Direction } from "./types";
import { precomputeBasic, precomputeRobust, precomputeSorted } from "./utils";
import { BUILTIN_NORMALIZATION_FNS, NormalizationRegistry, TNormalizationKey } from "./strategies";

/** Default if caller passes `normalize: true` */
export const DEFAULT_NORMALIZATION: TNormalizationKey = NormalizationRegistry.Z_SCORE;

/** Registry (extendable at runtime) */
const registry = new Map<string, NormalizationFn>(Object.entries(BUILTIN_NORMALIZATION_FNS));

// export function registerNormalization(key: string, fn: NormalizationFn): void {
// 	registry.set(key, fn);
// }

// export function hasNormalization(key: string): boolean {
// 	return registry.has(key);
// }

// export function listNormalizationKeys(): string[] {
// 	return Array.from(registry.keys());
// }

export function applyNormalization(
	value: number,
	series: IScalarPoint[],
	strategy: TNormalizationKey | string,
	opts?: PrecomputedStats & { direction?: Direction }
): number {
	const fn = registry.get(strategy);
	if (!fn) throw new Error(`Unknown normalization strategy: ${strategy}`);
	return fn(value, series, opts);
}

export type { NormalizationFn, PrecomputedStats, IScalarPoint, Direction, TNormalizationKey };
export { BUILTIN_NORMALIZATION_FNS, precomputeBasic, precomputeRobust, precomputeSorted, NormalizationRegistry };
