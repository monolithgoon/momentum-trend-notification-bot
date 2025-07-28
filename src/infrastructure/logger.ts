type LogLevel = "info" | "warn" | "error";

interface LogMeta {
  [key: string]: any;
}

/**
 * Creates a child logger instance with an extended or overridden context.
 *
 * This method is different from the other logging methods (`info`, `warn`, `error`)
 * because it does not log a message. Instead, it returns a new `TinyLogger` instance
 * with the specified context, allowing you to create hierarchical or contextual loggers
 * for different parts of your application.
 *
 * @param context - The context string to associate with the new logger instance.
 * @returns A new `TinyLogger` instance with the provided context.
 */

class TinyLogger {
  constructor(private readonly context?: string) {}

  private log(level: LogLevel, meta: LogMeta, message: string) {
    const logEntry = {
      level,
      timestamp: new Date().toISOString(),
      context: this.context,
      message,
      ...meta,
    };

    const serialized = JSON.stringify(logEntry);
    console[level === "error" ? "error" : "log"](serialized);
  }

  info(meta: LogMeta, message: string) {
    this.log("info", meta, message);
  }

  warn(meta: LogMeta, message: string) {
    this.log("warn", meta, message);
  }

  error(meta: LogMeta, message: string | Error) {
    const errorMeta = typeof message === "string" ? { errorMessage: message } : { error: message.message, stack: message.stack };
    this.log("error", { ...meta, ...errorMeta }, "Error occurred");
  }

  // 
  child(context: string): TinyLogger {
    return new TinyLogger(context);
  }
}

const logger = new TinyLogger();

export default logger;
