/** Logger port — minimal structured logging */
export interface Logger {
  info(msg: string, meta?: any): void;
  warn(msg: string, meta?: any): void;
  error(msg: string, meta?: any): void;
}
