// Placeholder for screener configuration types
export interface ScreenerConfig {
    id: string;
    name: string;
    filters: FilterConfig[];
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}

export interface FilterConfig {
    field: string;
    operator: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
    value: number | string;
}