// KineticsCalculator.ts
// Finite-safe velocity/acceleration with predictable fallbacks.

export type KineticsCalcOpts = {
	/** OLS slope window for velocity (bars) */
	velWindow?: number;
	/** OLS slope window for acceleration (bars); effectively slope(velocity) */
	accWindow?: number;
	/** Value returned when inputs are degenerate (NaN/Infinity/insufficient data) */
	fallback?: number;
	/** If true, sort history ascending by timestamp before computing */
	sortByTimeAsc?: boolean;
};

type SeriesPoint = {
	timestamp__ld_tick: number;
	[k: string]: number; // e.g., "change_pct__ld_tick", "volume__ld_tick"
};

export class KineticsCalculator_2 {
	private readonly data: SeriesPoint[];
	private readonly velWindow: number;
	private readonly accWindow: number;
	private readonly fallback: number;

	constructor(history: SeriesPoint[], opts: KineticsCalcOpts = {}) {
		const { velWindow = 20, accWindow = 20, fallback = 0, sortByTimeAsc = true } = opts;

		this.velWindow = velWindow;
		this.accWindow = accWindow;
		this.fallback = fallback;

		// Defensive copy + optional sort (time-ascending)
		const src = sortByTimeAsc
			? [...history].sort((a, b) => a.timestamp__ld_tick - b.timestamp__ld_tick)
			: [...history];

		this.data = src;
	}

	/** Safe number: coerce NaN/±Infinity/undefined to fallback */
	private makeFInite(n: unknown): number {
		return Number.isFinite(n as number) ? (n as number) : this.fallback;
	}

	/**
	 * recentWindowSlope()
	 *
	 * Purpose:
	 *   Measure the short-term trend (velocity) of a time series field by fitting a straight line
	 *   to the most recent N observations (the "trailing window") and returning its slope.
	 *
	 * Why:
	 *   - Captures the *current* direction and steepness of movement without being diluted by older data.
	 *   - Forms the basis for:
	 *       • Velocity metrics (slope of price, % change, or volume over the trailing window)
	 *       • Acceleration metrics (slope-of-slope, i.e., change in velocity over time)
	 *   - Used in leaderboard kinetics to detect ramps, slowdowns, or reversals.
	 *
	 * How:
	 *   1) Extract the last N data points for the given field.
	 *   2) Assign evenly spaced x-values (0, 1, ..., N-1) representing bar positions.
	 *   3) Apply ordinary least squares (OLS) regression to find the best-fit line.
	 *   4) Return the slope of that line:
	 *        > Positive slope  → trending up
	 *        > Negative slope  → trending down
	 *        > Near zero slope → flat
	 *
	 * Example:
	 *   Window = 20 bars, field = "change_pct__ld_tick":
	 *     - Uptrend over last 20 bars → positive velocity score.
	 *     - Downtrend → negative velocity score.
	 *     - Flat/noisy series → near-zero velocity.
	 */

	private recentWindowSlope(key: string, window: number): number {
		const n = this.data.length;
		if (window <= 1 || n < window) return this.fallback;

		// Extract tail
		let sumX = 0,
			sumY = 0,
			sumXX = 0,
			sumXY = 0;
		// Normalize x to 0..window-1 for numerical stability
		for (let i = n - window, x = 0; i < n; i++, x++) {
			const yRaw = this.data[i]?.[key];
			const y = Number.isFinite(yRaw) ? (yRaw as number) : NaN;
			if (!Number.isFinite(y)) return this.fallback; // bail on corrupt input
			sumX += x;
			sumY += y;
			sumXX += x * x;
			sumXY += x * y;
		}
		const denom = window * sumXX - sumX * sumX; // window * Σx^2 - (Σx)^2
		if (denom === 0) return this.fallback;

		const slope = (window * sumXY - sumX * sumY) / denom;
		return this.makeFInite(slope);
	}

	/** Velocity = slope over `velWindow` */
	computeVelocity(key: string): number {
		return this.recentWindowSlope(key, this.velWindow);
	}

	/**
	 * Acceleration = slope(velocity) over `accWindow`
	 * Implementation: compute velocity for each point within a sliding window, then OLS slope of that velocity series.
	 * For performance, we approximate: slope over the last `accWindow` bars using the same recentWindowSlope on the key’s
	 * first differences (Δy). That’s equivalent (up to a constant) and cheaper than nested regressions.
	 */
	computeAcceleration(key: string): number {
		const n = this.data.length;
		const w = this.accWindow;
		if (w <= 1 || n < w + 1) return this.fallback;

		// Build Δy series on the tail (size w+ (w-1) ideally; we only need the last w deltas)
		const start = n - (w + 1); // need w+1 points to get w deltas
		let sumX = 0,
			sumDY = 0,
			sumXX = 0,
			sumXDY = 0;

		for (let i = 0, x = 0; i < w; i++, x++) {
			const a = this.data[start + i]?.[key];
			const b = this.data[start + i + 1]?.[key];
			const dy = Number.isFinite(a) && Number.isFinite(b) ? (b as number) - (a as number) : NaN;
			if (!Number.isFinite(dy)) return this.fallback;
			sumX += x;
			sumDY += dy;
			sumXX += x * x;
			sumXDY += x * dy;
		}

		const denom = w * sumXX - sumX * sumX;
		if (denom === 0) return this.fallback;

		const slopeDy = (w * sumXDY - sumX * sumDY) / denom;
		return this.makeFInite(slopeDy);
	}
}
