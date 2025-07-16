// src/interfaces/strategies/strategyRegistry.interface.ts

import { FetchStrategy } from "./fetchStrategy.interface";

/**
 * A type-safe registry that maps string keys to FetchStrategy instances.
 * Allows each vendor to define its own variant using concrete types.
 */
export type StrategyRegistry<Strategy extends FetchStrategy<any>> = Record<string, Strategy>;
