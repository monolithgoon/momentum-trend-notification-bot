import { NotifierService } from "@services/notifier/NotifierService";
import { TelegramNotifier } from "@services/notifier/TelegramService";

let shuttingDown = false;
export default async function gracefulDaemonShutdown(reason: string, code: number = 1) {
	if (shuttingDown) return;

	shuttingDown = true;

	console.warn(`Graceful shutdown initiated: ${reason}`);

	try {
		const notifier = new NotifierService(new TelegramNotifier());
		await notifier.notify(`App shutting down: ${reason}`);
	} catch (error) {
		console.error(`Failed to notify notification service during shutdown`);
	}

	process.exit(code);
}
