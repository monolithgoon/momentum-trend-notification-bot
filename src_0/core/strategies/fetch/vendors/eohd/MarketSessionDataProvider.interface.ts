export interface MarketSessionDataProvider {
  fetchPreMarketMovers(): Promise<any[]>;
  getRTHData(): Promise<any[]>;
  getAfterMarketData(): Promise<any[]>;
}