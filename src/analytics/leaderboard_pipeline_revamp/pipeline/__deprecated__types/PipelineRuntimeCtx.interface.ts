/** Minimal runtime context shape. Extend as needed per project. */

export interface IPipelineRuntimeCtx {
  readonly correlationId?: string;
  readonly nowEpochMs?: number;

  // Optional pluggable services
  readonly logger?: {
    debug: (msg: string, meta?: unknown) => void;
    info: (msg: string, meta?: unknown) => void;
    warn: (msg: string, meta?: unknown) => void;
    error: (msg: string, meta?: unknown) => void;
  };

  readonly metrics?: {
    incr: (key: string, val?: number) => void;
    gauge: (key: string, val: number) => void;
    timing: (key: string, ms: number) => void;
  };

  // Config / scoring matrices can be exposed via ctx to keep stages pure
  readonly config?: Record<string, unknown>;
}
