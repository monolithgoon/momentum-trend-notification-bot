/* ----------------------------------------------------------------------------
   🤝 Stage Contract
   - Each stage declares inputs it requires and outputs it produces
   - run() only sees its declared inputs; returns only its declared outputs
---------------------------------------------------------------------------- */

/**
 * 📘 Semantic / Policy Notes
 *
 * - Purpose:
 *   The Stage contract enforces *information hygiene* in the pipeline:
 *   every stage must explicitly declare what it consumes (`input`) and
 *   what it produces (`output`). This avoids hidden dependencies, implicit
 *   side-effects, and context bloat.
 *
 * - Input/Output Discipline:
 *   1. `input` keys MUST correspond to properties in IPipelineContext
 *      that are required for the stage to operate.
 *   2. `output` keys MUST correspond to properties in IPipelineContext
 *      that the stage guarantees to populate.
 *   3. Anything not declared is invisible: a stage cannot "snoop" on
 *      unrelated context fields nor pollute the pipeline with extra values.
 *
 * - run() Policy:
 *   The `run` function receives ONLY its declared inputs (strongly typed).
 *   It MAY also see other context fields as `Partial<>` (optional), but
 *   must not rely on them — this keeps contracts truthful and enforceable.
 *
 * - Type Naming:
 *   - Current: `I` (input keys), `O` (output keys).
 *   - Alternative: `TIn` / `TOut`.
 *     - ✅ Pros: more explicit, easier for newcomers to parse.
 *     - ⚠️ Cons: slightly noisier in generic signatures.
 *   👉 Policy: Both are valid; prefer `TIn`/`TOut` if prioritizing clarity
 *      in public-facing APIs, stick with `I`/`O` if prioritizing brevity
 *      in internal/core code. (If your team already found `I`/`O` confusing,
 *      go with `TIn`/`TOut`.)
 *
 * - Enforcement:
 *   - Contracts should be *total truth*: any drift between what a stage
 *     declares vs what it actually uses/produces must be caught in
 *     integration tests.
 *   - Stages are meant to be **pure transforms**: no global state, no hidden
 *     dependencies, only declared I/O.
 *
 * - Anti-Goals:
 *   ❌ Do not use `any` or `unknown` for I/O keys; defeats type safety.
 *   ❌ Do not mutate IPipelineContext directly inside `run`; only return the
 *      declared outputs.
 *   ❌ Do not overload contracts with validation/business rules; keep them
 *      declarative and minimal.
 */

import { IPipelineContext } from "../context/PipelineContext.interface";

/**
 * Describes the contract for a pipeline stage:
 * - `input`: The required context keys this stage consumes.
 * - `output`: The context keys this stage guarantees to produce.
 */
export type StageContract<TIn extends keyof IPipelineContext, TOut extends keyof IPipelineContext> = {
	input: readonly TIn[];
	output: readonly TOut[];
};

/**
 * Represents a pipeline stage with a contract and a transformation function.
 * - `name`: Identifier for the stage.
 * - `contract`: The declared input/output contract.
 * - `run`: Executes the stage, receiving only declared inputs (strongly typed),
 *   and returns only the declared outputs.
 */
export interface Stage<TIn extends keyof IPipelineContext, TOut extends keyof IPipelineContext> {
	readonly name: string;
	contract: StageContract<TIn, TOut>;
	/**
	 * Executes the stage logic.
	 * @param ctx - The pipeline context, containing all declared inputs (required) and other context fields (optional).
	 * @returns A Promise resolving to an object containing only the declared outputs.
	 */
	run(
		ctx: Pick<IPipelineContext, TIn> & Partial<Omit<IPipelineContext, TIn>>
	): Promise<Pick<IPipelineContext, TOut>>;
}
