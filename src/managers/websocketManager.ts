import WebSocket from "ws";
import { WebSocketClientInterface } from "../interfaces/webSocketClient.interface";

export class WebSocketManager {
	private ws: WebSocket | null = null;
	private readonly reconnectDelay = 5000;

	constructor(private wsClient: WebSocketClientInterface) {}

	connect = () => {
		console.log(`[${this.wsClient.socketClientName}] Connecting to ${this.wsClient.socketUrl}`);
		this.ws = new WebSocket(this.wsClient.socketUrl);

		this.ws.on("open", this.handleOpen);
		this.ws.on("message", this.handleMessage);
		this.ws.on("error", this.handleError);
		this.ws.on("close", this.handleClose);
	};

	disconnect = () => {
		this.ws?.close();
	};

	private sendMessage = (payload: string) => {
		this.ws?.send(payload);
	};

	private handleOpen = () => {
		const authMessage = JSON.stringify(this.wsClient.getAuthMessage());
		console.log(`[${this.wsClient.socketClientName}] Connected. Sending auth...`, { authMessage });
		this.sendMessage(authMessage);
	};

	private handleMessage = (data: WebSocket.RawData) => {
		try {
			const parsed = JSON.parse(data.toString());
			this.wsClient.handleServerMessage(parsed, this.sendMessage);
		} catch (error) {
			console.error("❌ Failed to parse WebSocket message:", data.toString());
		}
	};

	private handleError = (err: Error) => {
		console.error(`[${this.wsClient.socketClientName}] WebSocket error:`, err);
	};

	private handleClose = () => {
		console.warn(
			`[${this.wsClient.socketClientName}] Disconnected. Reconnecting in ${this.reconnectDelay / 1000}s...`
		);
		setTimeout(this.connect, this.reconnectDelay);
	};
}
// This class manages the WebSocket connection, handling authentication, message processing, and reconnection logic.
// It uses the WebSocketClientInterface to interact with different WebSocket clients, allowing for flexible
