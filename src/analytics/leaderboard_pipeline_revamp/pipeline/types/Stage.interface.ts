/* ============================================================================
 * Stage.interface.ts
 * ----------------------------------------------------------------------------
 * Generic “stage” contract for the staged pipeline.
 * Each stage advertises exactly what it consumes (I) and produces (O).
 * Stages should be pure data transformers; side-effects live at boundaries.
 * ========================================================================== */

import { IPipelineContext } from "../context/PipelineContext.interface";

export type StageContract<
  I extends readonly (keyof IPipelineContext)[],
  O extends readonly (keyof IPipelineContext)[]
> = {
  input: I;
  output: O;
};

export interface Stage_4<
  I extends readonly (keyof IPipelineContext)[],
  O extends readonly (keyof IPipelineContext)[]
> {
  readonly name: string;
  contract: StageContract<I, O>;
  compute(
    ctx: Pick<IPipelineContext, I[number]> &
         Partial<Omit<IPipelineContext, I[number]>>
  ): Promise<Pick<IPipelineContext, O[number]>>;
}

/** 
 * Helper to define a stage with strong inference.
 * Keeps usage clean while enforcing contract.
 */
export function defineStage<
  I extends readonly (keyof IPipelineContext)[],
  O extends readonly (keyof IPipelineContext)[]
>(stage: Stage_4<I, O>): Stage_4<I, O> {
  return stage;
}
