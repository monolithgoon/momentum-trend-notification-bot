import { LeaderboardRestTickerSnapshot } from "@core/data/snapshots/rest_api/types/LeaderboardRestTickerSnapshot.interface";

/**
 * Calculates the velocity (rate of percent change per second) from ticker history
 * using linear regression for improved stability. Returns 0 if insufficient data.
 * Expects history to be ordered with most recent first.
 *
 * @param history Array of snapshots [{timestamp, change_pct}, ...], most recent first.
 * @param minPoints Minimum number of points to use regression (default: 3).
 */


export function computePercChangeVelocity(history: LeaderboardRestTickerSnapshot[], minPoints: number = 3): number {
	if (history.length < minPoints) return 0;

	// Use last N points (reverse to oldest first for regression)
	const slice = history.slice(0, minPoints).reverse();
	const times = slice.map((h) => h.ld_timestamp / 1000);
	const changes = slice.map((h) => h.ld_change_pct);

	// Linear regression: velocity = slope of best-fit line
	const n = times.length;
	const meanTime = times.reduce((a, b) => a + b, 0) / n;
	const meanChange = changes.reduce((a, b) => a + b, 0) / n;

	let numerator = 0,
		denominator = 0;
	for (let i = 0; i < n; i++) {
		numerator += (times[i] - meanTime) * (changes[i] - meanChange);
		denominator += (times[i] - meanTime) ** 2;
	}
	if (denominator === 0) return 0;
	return numerator / denominator; // change_pct per second
}

/**
 * Calculates acceleration (rate of change of velocity per second) using second finite differences.
 * More robust than using only 3 points. Returns 0 if insufficient data.
 * Expects history to be ordered with most recent first.
 *
 * @param history Array of snapshots [{timestamp, change_pct}, ...], most recent first.
 * @param minPoints Minimum number of points for acceleration (default: 4).
 */

export function computePercChangeAcceleration(history: LeaderboardRestTickerSnapshot[], minPoints: number = 4): number {
	if (history.length < minPoints) return 0;

	// Use last N points (reverse to oldest first)
	const slice = history.slice(0, minPoints).reverse();
	const times = slice.map((h) => h.ld_timestamp / 1000);
	const changes = slice.map((h) => h.ld_change_pct);

	// Second finite difference for acceleration
	// acceleration ≈ (Δv2 - Δv1) / Δt
	// Δv1 = (c2 - c1) / (t2 - t1), Δv2 = (c3 - c2) / (t3 - t2)
	const n = times.length;
	let totalAccel = 0,
		count = 0;
	for (let i = 0; i < n - 2; i++) {
		const dt1 = times[i + 1] - times[i];
		const dt2 = times[i + 2] - times[i + 1];
		if (dt1 <= 0 || dt2 <= 0) continue;
		const v1 = (changes[i + 1] - changes[i]) / dt1;
		const v2 = (changes[i + 2] - changes[i + 1]) / dt2;
		const totalTime = times[i + 2] - times[i];
		if (totalTime > 0) {
			totalAccel += (v2 - v1) / totalTime;
			count++;
		}
	}
	if (count === 0) return 0;
	return totalAccel / count;
}

// TODO -> move to own file??
// Allowed numeric fields for acceleration calculation
export type kineticsComputationField = "ld_change_pct" | "ld_volume" | "ld_pct_change_velocity" | "ld_pct_change_acceleration";

function computeFieldAcceleration(
	history: LeaderboardRestTickerSnapshot[],
	field: kineticsComputationField,
	minPoints: number = 4
): number {
	if (history.length < minPoints) return 0;

	// Use last N points (reverse to oldest first)
	const slice = history.slice(0, minPoints).reverse();
	const times = slice.map((h) => h.ld_timestamp / 1000);
	const values = slice.map((h) => Number(h[field]));

	// Second finite difference for acceleration
	const n = times.length;
	let totalAccel = 0,
		count = 0;
	for (let i = 0; i < n - 2; i++) {
		const dt1 = times[i + 1] - times[i];
		const dt2 = times[i + 2] - times[i + 1];
		if (dt1 <= 0 || dt2 <= 0) continue;
		const v1 = (values[i + 1] - values[i]) / dt1;
		const v2 = (values[i + 2] - values[i + 1]) / dt2;
		const totalTime = times[i + 2] - times[i];
		if (totalTime > 0) {
			totalAccel += (v2 - v1) / totalTime;
			count++;
		}
	}
	if (count === 0) return 0;
	return totalAccel / count;
}

export const kineticsCalculators = {
	computePercChangeVelocity,
	computePercChangeAcceleration,
	computeFieldAcceleration,
};

type VelocityField = "ld_pct_change_velocity" | "ld_volume";
type AccelerationField = "ld_pct_change_acceleration" | "ld_volume";

export class KineticsCalculator {
  history: LeaderboardRestTickerSnapshot[];

  constructor(history: LeaderboardRestTickerSnapshot[]) {
    this.history = history;
  }

  computeVelocity(field: VelocityField, minPoints: number = 2): number {
    if (this.history.length < minPoints) return 0;
    const slice = this.history.slice(0, minPoints).reverse();
    const times = slice.map((h) => h.ld_timestamp / 1000);
    const values = slice.map((h) => Number(h[field]));

    const n = times.length;
    let totalVel = 0, count = 0;
    for (let i = 0; i < n - 1; i++) {
      const dt = times[i + 1] - times[i];
      if (dt <= 0) continue;
      const v = (values[i + 1] - values[i]) / dt;
      totalVel += v;
      count++;
    }
    if (count === 0) return 0;
    return totalVel / count;
  }

  computeAcceleration(field: AccelerationField, minPoints: number = 4): number {
    if (this.history.length < minPoints) return 0;
    const slice = this.history.slice(0, minPoints).reverse();
    const times = slice.map((h) => h.ld_timestamp / 1000);
    const values = slice.map((h) => Number(h[field]));

    const n = times.length;
    let totalAccel = 0, count = 0;
    for (let i = 0; i < n - 2; i++) {
      const dt1 = times[i + 1] - times[i];
      const dt2 = times[i + 2] - times[i + 1];
      if (dt1 <= 0 || dt2 <= 0) continue;
      const v1 = (values[i + 1] - values[i]) / dt1;
      const v2 = (values[i + 2] - values[i + 1]) / dt2;
      const totalTime = times[i + 2] - times[i];
      if (totalTime > 0) {
        totalAccel += (v2 - v1) / totalTime;
        count++;
      }
    }
    if (count === 0) return 0;
    return totalAccel / count;
  }

  computeMeanVelocity(field: VelocityField, minPoints: number = 2): number {
    const velocities = this.getVelocities(field, minPoints);
    if (velocities.length === 0) return 0;
    return velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
  }

  computeStdVelocity(field: VelocityField, minPoints: number = 2): number {
    const velocities = this.getVelocities(field, minPoints);
    if (velocities.length === 0) return 0;
    const mean = this.computeMeanVelocity(field, minPoints);
    const variance = velocities.reduce((sum, v) => sum + (v - mean) ** 2, 0) / velocities.length;
    return Math.sqrt(variance);
  }

  computeMeanAcceleration(field: AccelerationField, minPoints: number = 4): number {
    const accels = this.getAccelerations(field, minPoints);
    if (accels.length === 0) return 0;
    return accels.reduce((sum, a) => sum + a, 0) / accels.length;
  }

  computeStdAcceleration(field: AccelerationField, minPoints: number = 4): number {
    const accels = this.getAccelerations(field, minPoints);
    if (accels.length === 0) return 0;
    const mean = this.computeMeanAcceleration(field, minPoints);
    const variance = accels.reduce((sum, a) => sum + (a - mean) ** 2, 0) / accels.length;
    return Math.sqrt(variance);
  }

  private getVelocities(field: VelocityField, minPoints: number = 2): number[] {
    if (this.history.length < minPoints) return [];
    const slice = this.history.slice(0, minPoints).reverse();
    const times = slice.map((h) => h.ld_timestamp / 1000);
    const values = slice.map((h) => Number(h[field]));

    const n = times.length;
    const velocities: number[] = [];
    for (let i = 0; i < n - 1; i++) {
      const dt = times[i + 1] - times[i];
      if (dt <= 0) continue;
      const v = (values[i + 1] - values[i]) / dt;
      velocities.push(v);
    }
    return velocities;
  }

  private getAccelerations(field: AccelerationField, minPoints: number = 4): number[] {
    if (this.history.length < minPoints) return [];
    const slice = this.history.slice(0, minPoints).reverse();
    const times = slice.map((h) => h.ld_timestamp / 1000);
    const values = slice.map((h) => Number(h[field]));

    const n = times.length;
    const accels: number[] = [];
    for (let i = 0; i < n - 2; i++) {
      const dt1 = times[i + 1] - times[i];
      const dt2 = times[i + 2] - times[i + 1];
      if (dt1 <= 0 || dt2 <= 0) continue;
      const v1 = (values[i + 1] - values[i]) / dt1;
      const v2 = (values[i + 2] - values[i + 1]) / dt2;
      const totalTime = times[i + 2] - times[i];
      if (totalTime > 0) {
        accels.push((v2 - v1) / totalTime);
      }
    }
    return accels;
  }
}