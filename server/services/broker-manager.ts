
import { Account } from "@shared/schema";
import { storage } from "../storage";

interface BrokerConfig {
  id: string;
  name: string;
  type: "REST" | "FIX" | "WEBSOCKET" | "MT5";
  apiUrl: string;
  credentials: {
    apiKey?: string;
    apiSecret?: string;
    accountId?: string;
    login?: string;
    password?: string;
    server?: string;
    environment?: "demo" | "live";
  };
  symbols: string[];
  features: {
    supportsBacktesting: boolean;
    supportsLiveTrading: boolean;
    supportsHistoricalData: boolean;
    maxPositions: number;
    minPositionSize: number;
  };
}

interface BrokerConnection {
  brokerId: string;
  status: "CONNECTED" | "DISCONNECTED" | "ERROR" | "CONNECTING";
  lastPing: Date;
  latency: number;
  errorMessage?: string;
}

class BrokerManager {
  private connections = new Map<string, BrokerConnection>();
  private configs = new Map<string, BrokerConfig>();

  constructor() {
    this.initializeBrokers();
  }

  private initializeBrokers() {
    // cTrader Configuration
    this.configs.set("ctrader", {
      id: "ctrader",
      name: "cTrader",
      type: "REST",
      apiUrl: "https://demo.ctraderapi.com",
      credentials: {
        login: "",
        password: "",
        server: "",
        environment: "demo"
      },
      symbols: ["EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", "EURGBP", "EURJPY", "GBPJPY"],
      features: {
        supportsBacktesting: true,
        supportsLiveTrading: true,
        supportsHistoricalData: true,
        maxPositions: 200,
        minPositionSize: 1000
      }
    });

    // Initialize cTrader connection as disconnected initially
    this.connections.set("ctrader", {
      brokerId: "ctrader",
      status: "DISCONNECTED",
      lastPing: new Date(),
      latency: 0
    });
  }

  async connectBroker(brokerId: string, credentials: any): Promise<boolean> {
    const config = this.configs.get(brokerId);
    if (!config) {
      throw new Error(`Unknown broker: ${brokerId}`);
    }

    this.connections.set(brokerId, {
      brokerId,
      status: "CONNECTING",
      lastPing: new Date(),
      latency: 0
    });

    try {
      if (brokerId === "ctrader") {
        // Update cTrader config with user credentials
        config.credentials = {
          ...config.credentials,
          login: credentials.login,
          password: credentials.password,
          server: credentials.server
        };

        // Try to connect to cTrader using the integration service
        const { ctraderIntegration } = await import('./ctrader-integration');
        const isConnected = await ctraderIntegration.connectWithCredentials(
          credentials.login,
          credentials.password,
          credentials.server
        );

        if (isConnected) {
          this.connections.set(brokerId, {
            brokerId,
            status: "CONNECTED",
            lastPing: new Date(),
            latency: Math.floor(Math.random() * 50) + 10
          });
          
          return true;
        } else {
          this.connections.set(brokerId, {
            brokerId,
            status: "ERROR",
            lastPing: new Date(),
            latency: 0,
            errorMessage: "Failed to connect to cTrader. Check credentials and API access."
          });
          return false;
        }
      }

      // For other broker types (currently none)
      const isValid = this.validateCredentials(brokerId, credentials);
      
      if (isValid) {
        this.connections.set(brokerId, {
          brokerId,
          status: "CONNECTED",
          lastPing: new Date(),
          latency: Math.floor(Math.random() * 50) + 10
        });
        
        console.log(`Connected to broker: ${config.name}`);
        return true;
      } else {
        this.connections.set(brokerId, {
          brokerId,
          status: "ERROR",
          lastPing: new Date(),
          latency: 0,
          errorMessage: "Invalid credentials"
        });
        return false;
      }
    } catch (error) {
      this.connections.set(brokerId, {
        brokerId,
        status: "ERROR",
        lastPing: new Date(),
        latency: 0,
        errorMessage: error instanceof Error ? error.message : "Connection failed"
      });
      return false;
    }
  }

  private validateCredentials(brokerId: string, credentials: any): boolean {
    // Mock validation - always return true for demo
    return true;
  }

  async disconnectBroker(brokerId: string): Promise<void> {
    const connection = this.connections.get(brokerId);
    if (connection) {
      this.connections.set(brokerId, {
        ...connection,
        status: "DISCONNECTED",
        lastPing: new Date()
      });
    }
  }

  async executeOrder(brokerId: string, order: any): Promise<any> {
    const connection = this.connections.get(brokerId);
    const config = this.configs.get(brokerId);

    if (!connection || connection.status !== "CONNECTED") {
      throw new Error(`Broker ${brokerId} is not connected`);
    }

    if (!config) {
      throw new Error(`Unknown broker: ${brokerId}`);
    }

    // Route order based on broker type
    switch (config.type) {
      case "REST":
        return this.executeRestOrder(config, order);
      case "WEBSOCKET":
        return this.executeWebSocketOrder(config, order);
      case "FIX":
        return this.executeFixOrder(config, order);
      default:
        throw new Error(`Unsupported broker type: ${config.type}`);
    }
  }

  private async executeRestOrder(config: BrokerConfig, order: any): Promise<any> {
    // Mock REST API order execution
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return {
      orderId: `${config.id}-${Date.now()}`,
      status: "FILLED",
      executedPrice: order.price || 1.0850,
      executedQuantity: order.quantity,
      executionTime: new Date(),
      commission: 7
    };
  }

  private async executeWebSocketOrder(config: BrokerConfig, order: any): Promise<any> {
    // Mock WebSocket order execution
    await new Promise(resolve => setTimeout(resolve, 50));
    
    return {
      orderId: `${config.id}-${Date.now()}`,
      status: "FILLED",
      executedPrice: order.price || 1.0850,
      executedQuantity: order.quantity,
      executionTime: new Date(),
      commission: 5
    };
  }

  private async executeFixOrder(config: BrokerConfig, order: any): Promise<any> {
    // Mock FIX protocol order execution
    await new Promise(resolve => setTimeout(resolve, 25));
    
    return {
      orderId: `${config.id}-${Date.now()}`,
      status: "FILLED",
      executedPrice: order.price || 1.0850,
      executedQuantity: order.quantity,
      executionTime: new Date(),
      commission: 3
    };
  }

  

  getBrokerConfig(brokerId: string): BrokerConfig | undefined {
    return this.configs.get(brokerId);
  }

  getBrokerConnection(brokerId: string): BrokerConnection | undefined {
    return this.connections.get(brokerId);
  }

  getAllBrokers(): BrokerConfig[] {
    return Array.from(this.configs.values());
  }

  getAllConnections(): BrokerConnection[] {
    return Array.from(this.connections.values());
  }

  async getAccountInfo(brokerId: string): Promise<any> {
    const connection = this.connections.get(brokerId);
    if (!connection || connection.status !== "CONNECTED") {
      throw new Error(`Broker ${brokerId} is not connected`);
    }

    if (brokerId === "ctrader") {
      const { ctraderIntegration } = await import('./ctrader-integration');
      const result = await ctraderIntegration.getAccountInfo();
      if (result.success) {
        return result.account;
      } else {
        throw new Error(result.error);
      }
    }

    // Mock account info for other brokers
    return {
      accountId: `${brokerId}-account`,
      balance: 50000 + Math.random() * 10000,
      equity: 50000 + Math.random() * 15000,
      margin: Math.random() * 5000,
      freeMargin: 45000 + Math.random() * 10000,
      currency: "USD"
    };
  }

  async getPositions(brokerId: string): Promise<any[]> {
    const connection = this.connections.get(brokerId);
    if (!connection || connection.status !== "CONNECTED") {
      throw new Error(`Broker ${brokerId} is not connected`);
    }

    // Mock positions
    return [
      {
        symbol: "EURUSD",
        side: "BUY",
        quantity: 10000,
        openPrice: 1.0850,
        currentPrice: 1.0865,
        pnl: 150,
        swap: -2.5
      },
      {
        symbol: "GBPUSD",
        side: "SELL",
        quantity: 5000,
        openPrice: 1.2650,
        currentPrice: 1.2635,
        pnl: 75,
        swap: -1.8
      }
    ];
  }

  // Health monitoring
  async monitorConnections(): Promise<void> {
    for (const [brokerId, connection] of this.connections) {
      if (connection.status === "CONNECTED") {
        try {
          const start = Date.now();
          await this.pingBroker(brokerId);
          const latency = Date.now() - start;
          
          this.connections.set(brokerId, {
            ...connection,
            lastPing: new Date(),
            latency
          });
        } catch (error) {
          this.connections.set(brokerId, {
            ...connection,
            status: "ERROR",
            errorMessage: "Ping failed"
          });
        }
      }
    }
  }

  private async pingBroker(brokerId: string): Promise<void> {
    // Mock ping
    await new Promise(resolve => setTimeout(resolve, Math.random() * 100));
  }
}

export const brokerManager = new BrokerManager();
