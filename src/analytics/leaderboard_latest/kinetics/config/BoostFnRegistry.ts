/* ============================================================================
   Boosts: Custom scoring signals derived from velocity and acceleration
   ---------------------------------------------------------------------------
   These boost formulas are designed to shape the priority of each
   enriched (metric × horizon) result, depending on the character of the move.

   Together, they form a scoring toolkit that can later be used to
   filter, rank, or surface particularly interesting momentum patterns.

   ⚙️ Boosts defined below:
   ----------------------------------------------------------------------------
   1. velocity_boost:
      - Emphasizes high velocity, slightly adjusted by acceleration.
      - Ideal for fast-moving trends that are still gaining steam.

   2. momentum_boost:
      - Balanced signal that equally rewards velocity + acceleration.
      - Encourages strong consistent trends over noise.

   3. breakout_bias:
      - Detects aggressive spikes by multiplying velocity and acceleration.
      - Tends to reward explosive moves more than steady ones.

   4. stability_adjusted_boost:
      - De-emphasizes moves with high negative acceleration (i.e. slowing).
      - Useful for preserving gains in stable upward trends.
============================================================================ */

type KineticsBoostFn = (v: number, a: number) => number;

type NamedBoostFn = {
	name: string;
	formula: KineticsBoostFn;
};

// /kinetics/config/BoostRegistry.ts
export const BOOST_FN_REGISTRY: Record<string, NamedBoostFn> = {
	velocity_boost: { name: "velocity_boost", formula: (v, a) => v * 1.5 + a },
	momentum_boost: { name: "momentum_boost", formula: (v, a) => v + a },
	breakout_bias: { name: "breakout_bias", formula: (v, a) => v * a },
	stability_adjusted_boost: {
		name: "stability_adjusted_boost",
		formula: (v, a) => (a < 0 ? v * 0.8 : v + a * 0.5),
	},
};

// /kinetics/strategies/strategyBoostMap.ts
export const KINETICS_STRATEGY_BOOSTS_FNS: Record<string, NamedBoostFn[]> = {
	momentum: [BOOST_FN_REGISTRY.velocity_boost, BOOST_FN_REGISTRY.momentum_boost],
	breakout: [BOOST_FN_REGISTRY.breakout_bias],
	trend_grind: [BOOST_FN_REGISTRY.stability_adjusted_boost],
	smooth_rise: [BOOST_FN_REGISTRY.velocity_boost, BOOST_FN_REGISTRY.stability_adjusted_boost],
};
