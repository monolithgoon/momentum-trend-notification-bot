// src/strategies/fetch-strategy/polygon/polygonFetchStrategyRegistry.ts

import { PolygonFetchStrategy_2 } from '../data_vendors/polygon/types/polygonFetchStrategy.interface';
import { PolygonPreMarketFetchStrategy } from "../data_vendors/polygon/strategies/polygonPreMarketStrategy"
// import { PolygonRecentIpoTopStrategy } from './PolygonRecentIpoTopStrategy';
// import { PolygonCryptoPrivatePlacementStrategy } from './PolygonCryptoPrivatePlacementStrategy';
// import { PolygonReverseSplitPositiveNewsStrategy } from './PolygonReverseSplitPositiveNewsStrategy';

export const polygonFetchStrategyRegistry: Record<string, PolygonFetchStrategy_2> = {
  'Pre-market top movers': new PolygonPreMarketFetchStrategy(),
//   'Recent IPO Top Moving': new PolygonRecentIpoTopStrategy(),
//   'Crypto Stocks with private placement': new PolygonCryptoPrivatePlacementStrategy(),
//   'Recent reverse splits with +ve news': new PolygonReverseSplitPositiveNewsStrategy(),
};

// This type will be a union of all allowed keys
export type PolygonStrategyKey = keyof typeof polygonFetchStrategyRegistry;
