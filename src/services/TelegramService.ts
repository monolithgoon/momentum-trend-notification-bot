// src/services/notifier/TelegramNotifier.ts

import axios from "axios";
import { APP_CONFIG } from "../config";

export class TelegramNotifier {
  async send(message: string): Promise<void> {
    const { TELEGRAM_BOT_TOKEN, TELEGRAM_CHAT_ID } = APP_CONFIG;

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
