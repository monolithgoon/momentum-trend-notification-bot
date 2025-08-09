import { appEvents } from "@config/appEvents";
import { MarketScanPayload } from "src/types/events/MarketScanEventPayload.interface";

export interface EventPayloadMap {
  [appEvents.MARKET_SCAN_COMPLETE]: MarketScanPayload;

  [appEvents.LEADERBOARD_UPDATE]: {
    leaderboardTag: string;
    total: number;
    topTicker?: string;
  };

  [appEvents.LEADERBOARD_UPDATE_FAIL]: {
    correlationId: string;
    error: unknown;
  };

  // Add more events here as needed...
}
