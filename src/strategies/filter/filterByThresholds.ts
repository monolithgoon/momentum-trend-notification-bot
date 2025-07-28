// src/core/generics/ThresholdOperator.ts
export type ThresholdOperator = ">" | "<" | ">=" | "<=" | "=";

// src/core/generics/AdvancedThresholdConfig.ts
// import { ThresholdOperator } from "./ThresholdOperator";
export type ThresholdRule = {
	operation: ThresholdOperator;
	value: number;
};

// REMOVE - DEPRECATED
// export type AdvancedThresholdConfig<T> = Partial<Record<keyof T, ThresholdRule>>;

// src/core/generics/NumericKeys.ts
export type NumericKeys<T> = {
	[K in keyof T]: T[K] extends number ? K : never;
}[keyof T];

// src/core/generics/StrictThresholdConfig.ts
export type StrictThresholdConfig<T> = Partial<Record<NumericKeys<T>, number>>;

/**
 * Allows threshold rules only on numeric fields of T.
 * For example: { volume: { operation: ">", value: 1000000 } }
 */
export type AdvancedThresholdConfig<T> = Partial<Record<NumericKeys<T>, ThresholdRule>>;

/**
 * Filters an array of objects based on numeric threshold rules.
 *
 * @template T - The type of objects in the input array. Should be a record with string keys and any values.
 * @param data - An array of objects to be filtered.
 * @param config - An object specifying threshold rules for one or more fields. Each field maps to a rule
 *   containing a comparison operator (">", "<", ">=", "<=", or "=") and a numeric value. Only objects that
 *   satisfy every rule in the config are included in the returned array.
 * @returns A new array containing only the objects that meet all specified threshold conditions.
 *
 * The `config` parameter is an object where each key corresponds to a property of the items in the data array,
 * and the value is a `ThresholdRule` specifying the comparison operation and threshold value for that field.
 * If a field in the config is not present in an item, or if the value is not a number, the item is excluded.
 *
 * @examples
 * const data = [
 *   { volume: 1200000, change_pct: 3.1 },
 *   { volume: 800000, change_pct: 2.0 },
 *   { volume: 1500000, change_pct: 2.7 }
 * ];
 *
 * const config = {
 *   volume: { operation: ">", value: 1000000 },
 *   change_pct: { operation: ">=", value: 2.5 }
 * };
 *
 * const result = filterByThresholds(data, config);
 *
 * // result: [
 * //   { volume: 1200000, change_pct: 3.1 },
 * //   { volume: 1500000, change_pct: 2.7 }
 * // ]
 */

export function filterByThresholds<T extends Record<string, any>>(data: T[], config: AdvancedThresholdConfig<T>): T[] {
	return data.filter((item) =>
		Object.entries(config).every(([field, rule]) => {
			const value = item[field as keyof T];

			if (typeof value !== "number" || !rule) return false;

			const { operation, value: threshold } = rule as ThresholdRule;

			switch (operation) {
				case ">":
					return value > threshold;
				case "<":
					return value < threshold;
				case ">=":
					return value >= threshold;
				case "<=":
					return value <= threshold;
				case "=":
					return value === threshold;
				default:
					return false;
			}
		})
	);
}
