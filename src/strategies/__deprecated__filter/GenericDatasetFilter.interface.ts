/**
 * A generic interface for scan filters.
 *
 * T is the shape of each data item in the dataset being filtered.
 * TConfig is the shape of the configuration object used for filtering logic.
 */
export interface GenericDatasetFilter<TConfig = unknown, TIn = any> {
	/** Human-readable name of the filter (e.g. "Volume Filter") */
	name: string;

	/** Optional description for logging or diagnostics */
	description?: string;

	/**
	 * Applies the filtering logic.
	 *
	 * @param data Array of items to filter (TIn[])
	 * @param config Configuration options used by the filter
	 * @returns Filtered subset of the data
	 */
	runFilter(data: TIn[], config: TConfig): TIn[];
}
