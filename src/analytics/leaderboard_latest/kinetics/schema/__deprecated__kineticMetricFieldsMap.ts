import { KineticsMetricFieldKeyType, FIELD_KEYS } from "../types/FieldKeys";

/**
 * Mapping from metric types to output field names by horizon (lookbackSpan).
 * These are the fields we will WRITE computed values into.
 */
export const kineticMetricFieldsMap: Record<
  KineticsMetricFieldKeyType,
  {
    velocity: Record<number, string>;
    acceleration: Record<number, string>;
    boosts: Record<string, Record<number, string>>;
  }
> = {
  [FIELD_KEYS.METRIC_FIELDS.PRICE_PCT_CHANGE]: {
    velocity: {
      3: "pct_change_velocity_L3__ld_tick",
      5: "pct_change_velocity_L5__ld_tick",
      8: "pct_change_velocity_L8__ld_tick",
    },
    acceleration: {
      3: "pct_change_acceleration_L3__ld_tick",
      5: "pct_change_acceleration_L5__ld_tick",
      8: "pct_change_acceleration_L8__ld_tick",
    },
    boosts: {
      velocity_boost: {
        3: "pct_change_velocity_boost_L3__ld_tick",
        5: "pct_change_velocity_boost_L5__ld_tick",
        8: "pct_change_velocity_boost_L8__ld_tick",
      },
    },
  },
  
  [FIELD_KEYS.METRIC_FIELDS.VOLUME_CHANGE]: {
    velocity: {
      3: "volume_velocity_L3__ld_tick",
      5: "volume_velocity_L5__ld_tick",
      8: "volume_velocity_L8__ld_tick",
    },
    acceleration: {
      3: "volume_acceleration_L3__ld_tick",
      5: "volume_acceleration_L5__ld_tick",
      8: "volume_acceleration_L8__ld_tick",
    },
    boosts: {
      momentum_boost: {
        3: "volume_momentum_boost_L3__ld_tick",
        5: "volume_momentum_boost_L5__ld_tick",
        8: "volume_momentum_boost_L8__ld_tick",
      },
    },
  },
};