import { EVENTS } from "@config/constants";
import { MarketScanPayload } from "src/strategies/scan_2/MarketScanPayload.interface";

export interface EventPayloadMap {
  [EVENTS.MARKET_SCAN_COMPLETE]: MarketScanPayload;

  [EVENTS.LEADERBOARD_UPDATE]: {
    tag: string;
    total: number;
    topTicker?: string;
  };

  [EVENTS.LEADERBOARD_FAILED_UPDATE]: {
    correlationId: string;
    error: unknown;
  };

  // Add more events here as needed...
}
