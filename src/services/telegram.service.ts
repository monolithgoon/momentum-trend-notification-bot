// src/notifier.ts

import axios from "axios";
import { APP_CONFIG } from "../config";

export async function sendTelegramAlert(message: string) {
  if (!APP_CONFIG.TELEGRAM_BOT_TOKEN || !APP_CONFIG.TELEGRAM_CHAT_ID) return;

  try {
    await axios.post(
      `https://api.telegram.org/bot${APP_CONFIG.TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        chat_id: APP_CONFIG.TELEGRAM_CHAT_ID,
        text: `${message}`,
      }
    );
  } catch (err: any) {
    console.error("Failed to send Telegram alert:", err.message);
  }
}