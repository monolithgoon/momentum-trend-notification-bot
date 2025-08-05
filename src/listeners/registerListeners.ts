import { registerLeaderboardListener } from "./leaderboardListener";
import { registerNotificationListeners } from "./registerNotificationListeners";
import { registerWebSocketListener } from "./websocketListener";

export function registerAllListeners() {
	registerLeaderboardListener();
	registerWebSocketListener();
	registerNotificationListeners();
}
