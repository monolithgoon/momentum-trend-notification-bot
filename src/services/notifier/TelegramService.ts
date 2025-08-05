import axios from "axios";
import { APP_CONFIG_2 } from "src/config_2/app_config";

export class TelegramNotifier {
  async send(message: string): Promise<void> {
    const TELEGRAM_BOT_TOKEN = APP_CONFIG_2.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = APP_CONFIG_2.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) return;

    try {
      await axios.post(
        `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
        {
          chat_id: TELEGRAM_CHAT_ID,
          text: message,
        }
      );
    } catch (err: any) {
      console.error("Failed to send Telegram alert:", err.message);
    }
  }
}
