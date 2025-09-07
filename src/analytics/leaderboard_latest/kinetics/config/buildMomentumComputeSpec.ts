import { MomentumComputationSpec } from "../types/KineticsComputeSpecTypes";
import { MomentumStrategyKey, MomentumStrategyRegistry } from "./strategies/momentum/retistry_2";

/* ----------------------------------------------------------------------------
	 🚀 Builder: Momentum Computation Strategy
---------------------------------------------------------------------------- */

export function buildMomentumComputeSpec({
	momentumStrategyName,
}: {
	momentumStrategyName: MomentumStrategyKey;
}): MomentumComputationSpec {
	return MomentumStrategyRegistry[momentumStrategyName];
}
