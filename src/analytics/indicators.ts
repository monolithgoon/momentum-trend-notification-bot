import { APP_CONFIG } from "@config/index";

export function calculateEMA(values: number[], period: number): number {
  if (values.length < period) return 0;
  const k = 2 / (period + 1);
  let ema = values.slice(0, period).reduce((a, b) => a + b) / period;

  for (let i = period; i < values.length; i++) {
    ema = values[i] * k + ema * (1 - k);
  }

  return ema;
}

export function calculateATR(highs: number[], lows: number[], closes: number[], period: number): number {
  const trs: number[] = [];
  for (let i = 1; i < highs.length; i++) {
    const high = highs[i];
    const low = lows[i];
    const prevClose = closes[i - 1];
    trs.push(Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose)));
  }
  const atr = trs.slice(-period).reduce((a, b) => a + b, 0) / period;
  return atr;
}

export function calculateTrendCount(closes: number[]): number {
  let count = 0;
  for (let i = 1; i < closes.length; i++) {
    if (closes[i] > closes[i - 1]) count++;
  }
  return count;
}

export function calculateVolumeSpike(volumes: number[], lookback: number, multiplier: number): boolean {
  if (volumes.length < lookback + 1) return false;
  const recentVolume = volumes[volumes.length - 1];
  const avgVolume =
    volumes.slice(-lookback - 1, -1).reduce((a, b) => a + b, 0) / lookback;
  return recentVolume > avgVolume * multiplier;
}

// Function to check if a symbol is trending above the Keltner Channel using tick data
export async function isTrendingAboveKC(ticks: any[]): Promise<boolean> {
	if (!ticks || ticks.length < APP_CONFIG.TREND_WINDOW + APP_CONFIG.EMA_LENGTH + 1) return false;

	const closes = ticks.map((t) => t.close ?? t.c); // support both REST + websocket formats
	const highs = ticks.map((t) => t.high ?? t.h);
	const lows = ticks.map((t) => t.low ?? t.l);
	const volumes = ticks.map((t) => t.volume ?? t.v);

	const closesSlice = closes.slice(-APP_CONFIG.EMA_LENGTH - 1);
	const highsSlice = highs.slice(-APP_CONFIG.EMA_LENGTH - 1);
	const lowsSlice = lows.slice(-APP_CONFIG.EMA_LENGTH - 1);

	const ema = calculateEMA(closesSlice, APP_CONFIG.EMA_LENGTH);
	const atr = calculateATR(highsSlice, lowsSlice, closesSlice, APP_CONFIG.EMA_LENGTH);
	const upperKC = ema + APP_CONFIG.KC_MULTIPLIER * atr;

	const latestClose = closes[closes.length - 1];
	const trendCount = calculateTrendCount(closes.slice(-APP_CONFIG.TREND_WINDOW));
	const volumeSpike = calculateVolumeSpike(volumes, APP_CONFIG.VOLUME_LOOKBACK, APP_CONFIG.VOLUME_SPIKE_MULTIPLIER);

	return latestClose > upperKC && trendCount >= APP_CONFIG.TREND_THRESHOLD && volumeSpike;
}

