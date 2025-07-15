export interface FetchStrategy<TSnapshot> {
	fetch(): Promise<TSnapshot[]>;
}
