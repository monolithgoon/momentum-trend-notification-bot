import { registerLeaderboardListener } from "./leaderboardListener";
import { registerWebSocketListener } from "./websocketListener";

export function registerAllListeners() {
	registerLeaderboardListener();
	registerWebSocketListener();
}
