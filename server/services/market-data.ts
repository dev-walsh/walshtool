interface MarketData {
  symbol: string;
  price: number;
  bid: number;
  ask: number;
  spread: number;
  timestamp: string; // Changed to string for ISO format
  volume: number;
}

type PriceUpdateCallback = (update: MarketData) => void;

class MarketDataService {
  private prices: Map<string, MarketData> = new Map();
  private callbacks: PriceUpdateCallback[] = [];
  private isRunning = false;
  private updateInterval: NodeJS.Timeout | null = null;

  async start(): Promise<void> {
    this.isRunning = true;
    console.log("Market Data Service started with mock data");

    // Initialize with forex pairs and realistic prices
    const symbolPrices = {
      "EURUSD": 1.0850,
      "GBPUSD": 1.2650,
      "USDJPY": 149.50,
      "USDCHF": 0.8750,
      "AUDUSD": 0.6750,
      "USDCAD": 1.3450,
      "NZDUSD": 0.6150,
      "EURGBP": 0.8580,
      "EURJPY": 162.25,
      "GBPJPY": 189.15
    };

    Object.entries(symbolPrices).forEach(([symbol, basePrice]) => {
      const spread = this.getSpread(symbol);
      const mid = basePrice + (Math.random() - 0.5) * 0.01; // Small random variation

      this.prices.set(symbol, {
        symbol,
        price: mid,
        bid: mid - spread / 2,
        ask: mid + spread / 2,
        spread,
        timestamp: new Date().toISOString(),
        volume: Math.floor(Math.random() * 1000000) + 100000,
      });
    });

    // Start mock data generation immediately
    this.startMockDataGeneration();
  }

  private startMockDataGeneration(): void {
    this.updateInterval = setInterval(() => {
      if (!this.isRunning) return;

      // Update prices for all symbols
      this.prices.forEach((marketData, symbol) => {
        const currentPrice = marketData.price;
        const volatility = this.getVolatility(symbol);
        const trend = (Math.random() - 0.5) * 0.1; // Small trend component
        const noise = (Math.random() - 0.5) * volatility;

        let newPrice = currentPrice + trend + noise;

        // Ensure price stays within reasonable bounds
        const bounds = this.getPriceBounds(symbol);
        newPrice = Math.max(bounds.min, Math.min(bounds.max, newPrice));

        const spread = this.getSpread(symbol);

        const updatedData: MarketData = {
          symbol,
          price: newPrice,
          bid: newPrice - spread / 2,
          ask: newPrice + spread / 2,
          spread,
          timestamp: new Date().toISOString(),
          volume: Math.floor(Math.random() * 500000) + 50000,
        };

        this.prices.set(symbol, updatedData);
        this.notifyCallbacks(updatedData);
      });
    }, 1000); // Update every second
  }

  private getVolatility(symbol: string): number {
    const volatilities: { [key: string]: number } = {
      "EURUSD": 0.0005,
      "GBPUSD": 0.0008,
      "USDJPY": 0.05,
      "USDCHF": 0.0004,
      "AUDUSD": 0.0007,
      "USDCAD": 0.0006,
      "NZDUSD": 0.0008,
      "EURGBP": 0.0003,
      "EURJPY": 0.08,
      "GBPJPY": 0.12,
    };
    return volatilities[symbol] || 0.0005;
  }

  private getSpread(symbol: string): number {
    const spreads: { [key: string]: number } = {
      "EURUSD": 0.0001,
      "GBPUSD": 0.0002,
      "USDJPY": 0.002,
      "USDCHF": 0.0002,
      "AUDUSD": 0.0002,
      "USDCAD": 0.0002,
      "NZDUSD": 0.0003,
      "EURGBP": 0.0001,
      "EURJPY": 0.003,
      "GBPJPY": 0.004,
    };
    return spreads[symbol] || 0.0002;
  }

  private getPriceBounds(symbol: string): { min: number; max: number } {
    const bounds: { [key: string]: { min: number; max: number } } = {
      "EURUSD": { min: 1.05, max: 1.12 },
      "GBPUSD": { min: 1.20, max: 1.35 },
      "USDJPY": { min: 140, max: 155 },
      "USDCHF": { min: 0.85, max: 0.92 },
      "AUDUSD": { min: 0.65, max: 0.72 },
      "USDCAD": { min: 1.30, max: 1.40 },
      "NZDUSD": { min: 0.58, max: 0.68 },
      "EURGBP": { min: 0.84, max: 0.88 },
      "EURJPY": { min: 155, max: 170 },
      "GBPJPY": { min: 180, max: 200 },
    };
    return bounds[symbol] || { min: 0.5, max: 2.0 };
  }

  // Placeholder for potential future WebSocket integration with SSL handling
  // private handleWebSocketConnection(): void {
  //   // Logic to establish WebSocket connection with proper SSL configuration
  // }

  // Placeholder for handling messages from WebSocket
  // private handlePriceUpdate(update: any): void {
  //   // Logic to process incoming market data
  // }

  getLatestPrice(symbol: string): MarketData | null {
    return this.prices.get(symbol) || null;
  }

  onPriceUpdate(callback: PriceUpdateCallback): void {
    this.callbacks.push(callback);
  }

  getAllPrices(): MarketData[] {
    return Array.from(this.prices.values());
  }

  getSymbols(): string[] {
    return Array.from(this.prices.keys());
  }

  async stop(): Promise<void> {
    this.isRunning = false;
    if (this.updateInterval) {
      clearInterval(this.updateInterval);
      this.updateInterval = null;
    }
    console.log("Market Data Service stopped");
  }

  private notifyCallbacks(update: MarketData): void {
    this.callbacks.forEach(callback => {
      try {
        callback(update);
      } catch (error) {
        console.error("Price update callback error:", error);
      }
    });
  }
}

export const marketDataService = new MarketDataService();