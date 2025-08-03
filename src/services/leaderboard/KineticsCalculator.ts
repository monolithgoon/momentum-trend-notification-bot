import { LeaderboardRestTickerSnapshot } from "@core/models/rest_api/models/LeaderboardRestTickerSnapshot.interface";

type VelocityFieldType = Extract<
	keyof LeaderboardRestTickerSnapshot,
	"pct_change_velocity__ld_tick" | "volume__ld_tick"
>;

type AccelerationFieldType = Extract<
	keyof LeaderboardRestTickerSnapshot,
	"pct_change_acceleration__ld_tick" | "volume__ld_tick"
>;

export class KineticsCalculator { 
	history: LeaderboardRestTickerSnapshot[];

	constructor(history: LeaderboardRestTickerSnapshot[]) {
		this.history = history;
	}

	/**
	 * Computes the average velocity for the specified field.
	 * Velocity is the rate of change between consecutive data points.
	 * @param field - Field to compute velocity for.
	 * @param minPoints - Minimum number of points required.
	 * @returns The average velocity, or 0 if not enough data.
	 */
	computeVelocity(field: VelocityFieldType, minPoints: number = 2): number {
		if (this.history.length < minPoints) return 0;
		const slice = this.history.slice(0, minPoints).reverse();
		const times = slice.map((h) => h.timestamp__ld_tick / 1000);
		const values = slice.map((h) => Number(h[field]));

		const n = times.length;
		let totalVel = 0,
			count = 0;
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

	/**
	 * Computes the average acceleration for the specified field.
	 * Acceleration is the rate of change of velocity between consecutive data points.
	 * @param field - Field to compute acceleration for.
	 * @param minPoints - Minimum number of points required.
	 * @returns The average acceleration, or 0 if not enough data.
	 */
	computeAcceleration(field: AccelerationFieldType, minPoints: number = 4): number {
		if (this.history.length < minPoints) return 0;
		const slice = this.history.slice(0, minPoints).reverse();
		const times = slice.map((h) => h.timestamp__ld_tick / 1000);
		const values = slice.map((h) => Number(h[field]));

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

	/**
	 * Computes the mean (average) velocity for the specified field.
	 * @param field - Field to compute mean velocity for.
	 * @param minPoints - Minimum number of points required.
	 * @returns The mean velocity, or 0 if not enough data.
	 */
	computeMeanVelocity(field: VelocityFieldType, minPoints: number = 2): number {
		const velocities = this.getVelocities(field, minPoints);
		if (velocities.length === 0) return 0;
		return velocities.reduce((sum, v) => sum + v, 0) / velocities.length;
	}

	/**
	 * Computes the standard deviation of velocity for the specified field.
	 * @param field - Field to compute std deviation for.
	 * @param minPoints - Minimum number of points required.
	 * @returns The standard deviation of velocity, or 0 if not enough data.
	 */
	computeStdVelocity(field: VelocityFieldType, minPoints: number = 2): number {
		const velocities = this.getVelocities(field, minPoints);
		if (velocities.length === 0) return 0;
		const mean = this.computeMeanVelocity(field, minPoints);
		const variance = velocities.reduce((sum, v) => sum + (v - mean) ** 2, 0) / velocities.length;
		return Math.sqrt(variance);
	}

	/**
	 * Computes the mean (average) acceleration for the specified field.
	 * @param field - Field to compute mean acceleration for.
	 * @param minPoints - Minimum number of points required.
	 * @returns The mean acceleration, or 0 if not enough data.
	 */
	computeMeanAcceleration(field: AccelerationFieldType, minPoints: number = 4): number {
		const accels = this.getAccelerations(field, minPoints);
		if (accels.length === 0) return 0;
		return accels.reduce((sum, a) => sum + a, 0) / accels.length;
	}

	/**
	 * Computes the standard deviation of acceleration for the specified field.
	 * @param field - Field to compute std deviation for.
	 * @param minPoints - Minimum number of points required.
	 * @returns The standard deviation of acceleration, or 0 if not enough data.
	 */
	computeStdAcceleration(field: AccelerationFieldType, minPoints: number = 4): number {
		const accels = this.getAccelerations(field, minPoints);
		if (accels.length === 0) return 0;
		const mean = this.computeMeanAcceleration(field, minPoints);
		const variance = accels.reduce((sum, a) => sum + (a - mean) ** 2, 0) / accels.length;
		return Math.sqrt(variance);
	}

	/**
	 * Gets the list of velocity values for the specified field.
	 * Used internally for mean and std deviation calculations.
	 * @param field - Field to compute velocities for.
	 * @param minPoints - Minimum number of points required.
	 * @returns Array of velocity values.
	 */
	private getVelocities(field: VelocityFieldType, minPoints: number = 2): number[] {
		if (this.history.length < minPoints) return [];
		const slice = this.history.slice(0, minPoints).reverse();
		const times = slice.map((h) => h.timestamp__ld_tick / 1000);
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

	/**
	 * Gets the list of acceleration values for the specified field.
	 * Used internally for mean and std deviation calculations.
	 * @param field - Field to compute accelerations for.
	 * @param minPoints - Minimum number of points required.
	 * @returns Array of acceleration values.
	 */
	private getAccelerations(field: AccelerationFieldType, minPoints: number = 4): number[] {
		if (this.history.length < minPoints) return [];
		const slice = this.history.slice(0, minPoints).reverse();
		const times = slice.map((h) => h.timestamp__ld_tick / 1000);
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
