/**
 * Returns an array of ticker names from an array of ticker snapshots.
 * The key for the ticker name must be provided and must exist on the snapshot type.
 * K must be a string key.
 */

export function getSnapshotTickerNames<T, K extends keyof T & string>(snapshots: T[], tickerNameKey: K): Array<T[K]> {
	return snapshots.map((snapshot) => snapshot[tickerNameKey]);
}
