/* ----------------------------------------------------------------------------
   🗺️ Stage Schema + Mermaid
---------------------------------------------------------------------------- */

/**
 * 📘 Semantic / Policy Notes
 *
 * - Purpose:
 *   This module translates strongly-typed stage contracts into a human-readable,
 *   graphable form (Mermaid) for quick pipeline inspection. It is NOT part of
 *   the runtime business logic; it is a *meta* view for validation, debugging,
 *   and developer communication.
 *
 * - StageSchema:
 *   Defines a minimal "contract snapshot" of a stage. The snapshot is
 *   intentionally shallow (name, inputs, outputs) to avoid leaking
 *   implementation detail into diagrams or schema registries.
 *
 * - Determinism Policy:
 *   Stage inputs/outputs must remain consistent across refactors. This
 *   structure ensures that what the runtime contract declares is the same
 *   thing the visualization engine reports. If a stage’s declared I/O
 *   diverges from its actual implementation, the mismatch must be caught
 *   upstream (unit tests or runtime checks).
 *
 * - Mermaid Output:
 *   Mermaid graphs here are deliberately one-way (TD: top-down) to emphasize
 *   pipeline flow. Inputs are drawn as “loose nodes” flowing into the stage
 *   node, and outputs flow outward.
 *   👉 Policy: Stages should avoid producing anonymous / unnamed outputs,
 *      because those will appear as dangling edges with no semantic anchor.
 *
 * - Usage Guidance:
 *   1. Call `toStageSchema()` for one-off inspection of a stage contract.
 *   2. Call `generateMermaid(stages)` to produce a diagram of the whole
 *      pipeline; paste into a Mermaid-compatible renderer (Markdown preview,
 *      online live editor, or IDE plugin).
 *   3. Use this primarily in dev tooling, CLI audits, or docs generation.
 *
 * - Anti-Goals:
 *   ❌ Do not use this for runtime validation (see runtime schema checks).
 *   ❌ Do not mutate stage contracts here; contracts are read-only metadata.
 *   ❌ Do not overload this module with stage-specific logic; keep it generic.
 */

import { Stage } from "./StageContract";

/**
 * A structural DTO that describes the "surface area" of a stage:
 *   - `name`   → human-readable identifier
 *   - `inputs` → expected input keys from PipelineContext
 *   - `outputs`→ produced output keys in PipelineContext
 */
export type StageSchema = {
  name: string;
  inputs: string[];
  outputs: string[];
};

/**
 * Derive a StageSchema from a Stage by snapshotting its declared contract.
 * No runtime context is read here — only static contract metadata.
 */
export function toStageSchema(stage: Stage<any, any>): StageSchema {
  return {
    name: stage.name,
    inputs: [...stage.contract.input] as string[],
    outputs: [...stage.contract.output] as string[],
  };
}

/**
 * Render a list of stages into a Mermaid flowchart (top-down).
 *
 * Example (inline I/O data):
 *
 * ```mermaid
 * graph TD
 *     snapshots --> S0
 *     S0["ComputeKinetics"] --> kineticsBySymbol
 *     kineticsBySymbol --> S1
 *     S1["ComputeMomentum"] --> momentumBySymbol
 * ```
 *
 * - Each stage node is labeled with its `name`.
 * - Inputs appear as upstream nodes.
 * - Outputs appear as downstream nodes.
 */
export function generateMermaid(stages: Stage<any, any>[]): string {
  const lines: string[] = ["graph TD"];
  stages.forEach((s, i) => {
    const id = `S${i}`;
    lines.push(`    ${id}["${s.name}"]`);
    s.contract.input.forEach(inp => lines.push(`    ${inp} --> ${id}`));
    s.contract.output.forEach(out => lines.push(`    ${id} --> ${out}`));
  });
  return lines.join("\n");
}
