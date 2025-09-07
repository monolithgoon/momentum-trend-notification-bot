/* ----------------------------------------------------------------------------
   🧰 Logger (minimal)
---------------------------------------------------------------------------- */

export type Logger = {
  info: (msg: string, meta?: unknown) => void;
  warn: (msg: string, meta?: unknown) => void;
  error: (msg: string, meta?: unknown) => void;
  debug?: (msg: string, meta?: unknown) => void;
};

export const consoleLogger: Logger = {
  info: (m, meta) => console.log(m, meta ?? ""),
  warn: (m, meta) => console.warn(m, meta ?? ""),
  error: (m, meta) => console.error(m, meta ?? ""),
  debug: (m, meta) => console.debug?.(m, meta ?? ""),
};
