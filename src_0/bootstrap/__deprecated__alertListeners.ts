// REMOVE - DEPRECATED -> NO LONGER USING REDIS
// import { RedisAlertService } from "@/services/alerts/RedisAlertService";
import { TelegramNotifier } from "src/services/notifier/TelegramService";
import { NotifierService } from "src/services/notifier/NotifierService";
import { connectRedis } from "@infrastructure/__deprecated__redis/redis.service";

// Optional: if you have a typed AlertPayload
// import { AlertPayload } from "@/types/alerts/AlertPayload";

export async function initializeAlertListeners() {
  await connectRedis();

  const telegramNotifier = new TelegramNotifier();
  const notifierService = new NotifierService(telegramNotifier);
  // const redisAlertService = new RedisAlertService();

  // await redisAlertService.subscribe(async (alert) => {
  //   const readableMessage = formatAlertMessage(alert);
  //   await notifierService.notify(readableMessage);
  // });
}

function formatAlertMessage(alert: any): string {
  // Customize based on alert type
  return `🚨 Alert: ${alert.type} on ${alert.ticker} at ${new Date(alert.timestamp).toLocaleTimeString()}`;
}
