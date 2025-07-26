// src/infrastructure/logger.ts
type LogLevelType = "info" | "warn" | "error" | "debug";

class Logger {
  constructor(private readonly context?: string) {}

  private formatLog(level: LogLevelType, message: string, data?: any) {
    const ts = new Date().toISOString();
    const ctx = this.context ? `[${this.context}]` : "";
    const base = `${ts} ${level.toUpperCase()} ${ctx} ${message}`;
    return data ? `${base} ${JSON.stringify(data)}` : base;
  }

  info(message: string, data?: any) {
    console.log(this.formatLog("info", message, data));
  }

  warn(message: string, data?: any) {
    console.warn(this.formatLog("warn", message, data));
  }

  error(message: string, data?: any) {
    console.error(this.formatLog("error", message, data));
  }

  debug(message: string, data?: any) {
    if (process.env.NODE_ENV !== "production") {
      console.debug(this.formatLog("debug", message, data));
    }
  }

  child(context: string): Logger {
    return new Logger(context);
  }
}

const logger = new Logger();
export default logger;

/**
 * GenericTickerSorter does not seem to do anything. Replace with GenericSorter

WTF role does SortedNormalizedTicker play?? 
I think my original intent was that NormalizedRestTickerSnapshot should not have its own ordinal_sort_position field by itself, and that any normalized ticker that needs that field needs to instad be a SortedNormalizedTicker
 */