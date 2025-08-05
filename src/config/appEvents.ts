export const appEvents = {
	MARKET_SCAN_COMPLETE: "market_scan:complete",
  LEADERBOARD_UPDATE: "leaderboard.update",
  LEADERBOARD_UPDATE_FAIL: "leaderboard.fail",
	// Add more as needed...
} as const;

export type AppEvent = (typeof appEvents)[keyof typeof appEvents];
