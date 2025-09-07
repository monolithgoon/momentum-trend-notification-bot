/**
 * LeaderboardCfg — config & kinetics derivation
 */

export type LeaderboardCfg = {
  windows: { velocity: number; acceleration: number; contextWindows: number };
  lookbackCap?: number;
  limits: { maxLeaderboardLength: number; chunkSize: number };
  features: { previewSkipsPersist: boolean };
};

export type KineticsCfg = {
  velWindowSamples: number;
  accWindowSamples: number;
  longestWindowSamples: number;
  minSamplesForAccel: number;
  lookbackSamples: number;
};

export function deriveKineticsCfg(
  windows: { velocity: number; acceleration: number; contextWindows: number },
  lookbackCap?: number
): KineticsCfg {
  const vel = windows.velocity ?? 20;
  const acc = windows.acceleration ?? 20;
  const ctx = windows.contextWindows ?? 6;
  const longest = Math.max(vel, acc);
  const minForAccel = longest + 1;
  const defaultLookback = longest * ctx;
  const lookback = Math.max(minForAccel, (lookbackCap ?? defaultLookback));
  return {
    velWindowSamples: vel,
    accWindowSamples: acc,
    longestWindowSamples: longest,
    minSamplesForAccel: minForAccel,
    lookbackSamples: lookback,
  };
}
