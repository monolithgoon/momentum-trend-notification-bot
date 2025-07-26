// src/config/index.ts
import { ENV } from "./env";
import { APP_CONSTANTS } from "./constants";

export const APP_CONFIG = {
  ...ENV,
  ...APP_CONSTANTS,
};

export type AppConfig = typeof APP_CONFIG;

// AA00ET8BB9
