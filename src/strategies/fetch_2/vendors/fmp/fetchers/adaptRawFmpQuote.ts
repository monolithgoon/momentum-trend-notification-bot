/**
 * Adapter to unify raw FMP quote payloads across different endpoints.
 *
 * - Movers endpoints: `changesPercentage`
 * - Quote endpoints:  `changePercentage`
 * - Other fields differ in presence (volume, marketCap, MAs, etc.)
 */

export interface IFmpQuoteRaw {
  symbol: string;
  name?: string;
  price?: number;
  change?: number;
  changesPercentage?: number; // unified field
  volume?: number;
  marketCap?: number;
  exchange?: string;
  priceAvg50?: number;
  priceAvg200?: number;
  dayLow?: number;
  dayHigh?: number;
  yearLow?: number;
  yearHigh?: number;
  open?: number;
  previousClose?: number;
  timestamp?: number;
  [key: string]: any; // passthrough
}

export function adaptRawFmpQuote(raw: any): IFmpQuoteRaw {
  if (!raw) return {} as IFmpQuoteRaw;

  return {
    ...raw,
    changesPercentage: raw.changesPercentage ?? raw.changePercentage ?? null,
    priceAvg50: raw.priceAvg50 ?? raw["50DayMA"] ?? null,
    priceAvg200: raw.priceAvg200 ?? raw["200DayMA"] ?? null,
  };
}
