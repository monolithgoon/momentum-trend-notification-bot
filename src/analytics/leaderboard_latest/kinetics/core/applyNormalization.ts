import { NormalizationStrategies } from "../types/NormalizationStrategies";

/**
 * CORE CONTEXTUAL COMMENT — NormalizationStrategies.ts
 * ----------------------------------------------------
 * Provides strategies for scaling computed metrics into normalized ranges.
 * Examples: Z-score, Min-Max. New strategies can be added without changing calculation logic.
 */

export function applyNormalization(value: number, series: { v: number }[], strategy: NormalizationStrategies): number {
	if (strategy === NormalizationStrategies.Z_SCORE) {
		const mean = series.reduce((sum, p) => sum + p.v, 0) / series.length;
		const variance = series.reduce((sum, p) => sum + Math.pow(p.v - mean, 2), 0) / series.length;
		const stdDev = Math.sqrt(variance);
		return stdDev > 0 ? (value - mean) / stdDev : 0;
	}
	if (strategy === NormalizationStrategies.MIN_MAX) {
		const min = Math.min(...series.map((p) => p.v));
		const max = Math.max(...series.map((p) => p.v));
		return max > min ? (value - min) / (max - min) : 0;
	}
	return value;
}
