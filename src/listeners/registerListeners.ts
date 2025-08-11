import { registerLeaderboardListener_2 } from "./leaderboardListener_2";
import { registerNotificationListeners } from "./registerNotificationListeners";
import { registerWebSocketListener } from "./websocketListener";

export function registerAllListeners() {
	registerLeaderboardListener_2();
	registerWebSocketListener();
	registerNotificationListeners();
}
