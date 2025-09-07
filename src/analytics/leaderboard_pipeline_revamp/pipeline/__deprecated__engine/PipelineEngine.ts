/* ----------------------------------------------------------------------------
   🚂 Pipeline Engine (Option A)
   - Runtime contract validation (before/after each stage)
   - Optional schema + Mermaid export
---------------------------------------------------------------------------- */

import { Logger } from "@infrastructure/logger";
import { IPipelineContext } from "../context/PipelineContext.interface";
import { Stage } from "../__deprecated__contracts/StageContract";
import { toStageSchema, generateMermaid } from "../__deprecated__contracts/StageSchema";

export class PipelineEngine {
  constructor(
    private readonly stages: Stage<any, any>[],
    private readonly log: Logger
  ) {}

  async run(
    ctx: IPipelineContext,
    opts: { exportSchema?: boolean; mermaid?: boolean; validateContracts?: boolean } = {}
  ): Promise<IPipelineContext> {
    let cur: IPipelineContext = { ...ctx };

    for (const s of this.stages) {
      const t0 = Date.now();

      // Validate input contract
      if (opts.validateContracts) {
        const missing = s.contract.input.filter((k) => !(k in cur) || (cur as any)[k] == null);
        if (missing.length) {
          throw new Error(`[contract] Stage "${s.name}" missing inputs: ${missing.join(", ")}`);
        }
      }

      // Narrow the context to declared inputs (plus allow config/etc via Partial)
      const scoped = s.contract.input.reduce((acc, k) => {
        (acc as any)[k] = (cur as any)[k];
        return acc;
      }, {} as any);
      Object.assign(scoped, cur); // allow read-only access to other optional fields (e.g., config)

      const outputs = await s.run(scoped);

      // Merge outputs into context
      cur = { ...cur, ...outputs };

      // Validate output contract
      if (opts.validateContracts) {
        const missing = s.contract.output.filter((k) => !(k in cur) || (cur as any)[k] == null);
        if (missing.length) {
          throw new Error(`[contract] Stage "${s.name}" did not produce: ${missing.join(", ")}`);
        }
      }

      this.log.info({ ms: Date.now() - t0 }, `[stage] ${s.name} ok`);
    }

    if (opts.exportSchema) {
      const schema = this.stages.map(toStageSchema);
      this.log.info(schema, `[schema] pipeline`);
      if (opts.mermaid) {
        this.log.info({ mermaid: generateMermaid(this.stages) }, `[schema] mermaid`);
      }
    }

    return cur;
  }
}
