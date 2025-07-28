/**
 * 
 * A generic function to remove duplicates from an array of objects,
 * based on a specific key (like "ticker", "id", etc).
 *
 * 📌 What the types mean:
 * - <T>: a generic object type (like { ticker: string, volume: number })
 * - T extends Record<string, any>: T must be an object, not a string/number
 * - arr: T[] — the input array of objects
 * - field: keyof T — must be a valid key of the object (e.g. "ticker")
 * - returns: a deduplicated array of objects (T[])
 *
 * ✅ Only keeps the last occurrence of each unique value by that field.
 *
 * 📌 Example:
 *
 * const data = [
 *   { ticker: "AAPL", volume: 100 },
 *   { ticker: "TSLA", volume: 200 },
 *   { ticker: "AAPL", volume: 300 },
 * ];
 *
 * const result = dedupeByField(data, "ticker");
 *
 * // ✅ result will be:
 * [
 *   { ticker: "AAPL", volume: 300 }, // last "AAPL" replaces earlier one
 *   { ticker: "TSLA", volume: 200 },
 * ]
 *
 * 🔍 How it works:
 * - Creates a Map() to store objects by their `ticker` value.
 * - If a ticker already exists in the Map, it gets replaced by the newer one.
 * - Finally, we convert the Map values back into an array using [...seen.values()].
 *
 * @param arr The input array
 * @param field The key to deduplicate on
 * @returns A deduplicated array

 */

export function dedupeByField<T extends Record<string, any>>(arr: T[], field: keyof T): T[] {
	const seen = new Map<string | number, T>();

	for (const item of arr) {
		const key = item[field];
		if (typeof key === "string" || typeof key === "number") {
			seen.set(key, item); // overwrite older items with same key
		}
	}

	return [...seen.values()];
}
