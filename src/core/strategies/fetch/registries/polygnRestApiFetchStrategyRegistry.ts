// src/strategies/fetch-strategy/polygon/polygnRestApiFetchStrategyRegistry.ts

import { PolygonRestApiQuoteFetchStrategy } from '../vendors/polygon/types/PolygonRestApiQuoteFetchStrategy.interface';
import { PolygonPreMarketQuoteFetchStrategy } from "../vendors/polygon/strategies/PolygonPreMarketQuoteFetchStrategy"
// import { PolygonRecentIpoTopStrategy } from './PolygonRecentIpoTopStrategy';
// import { PolygonCryptoPrivatePlacementStrategy } from './PolygonCryptoPrivatePlacementStrategy';
// import { PolygonReverseSplitPositiveNewsStrategy } from './PolygonReverseSplitPositiveNewsStrategy';

export const polygnRestApiFetchStrategyRegistry: Record<string, PolygonRestApiQuoteFetchStrategy> = {
  'Pre-market top movers': new PolygonPreMarketQuoteFetchStrategy(),
//   'Recent IPO Top Moving': new PolygonRecentIpoTopStrategy(),
//   'Crypto Stocks with private placement': new PolygonCryptoPrivatePlacementStrategy(),
//   'Recent reverse splits with +ve news': new PolygonReverseSplitPositiveNewsStrategy(),
};

// This type will be a union of all allowed keys
export type PolygonStrategyKey = keyof typeof polygnRestApiFetchStrategyRegistry;
