// src/interfaces/strategies/strategyRegistry.interface.ts

import { RestApiQuoteFetchStrategy } from "./RestApiQuoteFetchStrategy.interface";

/**
 * A type-safe registry that maps string keys to RestApiQuoteFetchStrategy instances.
 * Allows each vendor to define its own variant using concrete types.
 */
export type strategyRegistryType<Strategy extends RestApiQuoteFetchStrategy<any>> = Record<string, Strategy>;
