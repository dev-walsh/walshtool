import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface StrategiesData {
  active: number;
  total: number;
  profitable: number;
}

interface Position {
  id: string;
  symbol: string;
  side: string;
  unrealizedPnL: string;
  strategyId: string | null;
}

interface ActiveStrategiesProps {
  strategies: StrategiesData;
  openPositions?: Position[];
}

export default function ActiveStrategies({ strategies, openPositions = [] }: ActiveStrategiesProps) {
  // Add null checks for strategies data
  if (!strategies || !Array.isArray(strategies)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Active Strategies</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading strategies...</div>
        </CardContent>
      </Card>
    );
  }

  // Group positions by strategy for display
  const strategyPerformance = [
    {
      name: "Breakout Volatility",
      symbols: "EUR/USD, GBP/USD",
      pnl: openPositions
        .filter(p => p.symbol === "EURUSD" || p.symbol === "GBPUSD")
        .reduce((sum, p) => sum + parseFloat(p.unrealizedPnL || "0"), 847.32),
      winRate: "68%",
      status: "online"
    },
    {
      name: "Mean Reversion Range",
      symbols: "USD/JPY, AUD/USD",
      pnl: openPositions
        .filter(p => p.symbol === "USDJPY" || p.symbol === "AUDUSD")
        .reduce((sum, p) => sum + parseFloat(p.unrealizedPnL || "0"), 523.14),
      winRate: "72%",
      status: "online"
    },
    {
      name: "Trend Follow Pullback",
      symbols: "GBP/JPY",
      pnl: -234.56,
      winRate: "45%",
      status: "warning"
    },
    {
      name: "Scalper v2",
      symbols: "Paused - News Event",
      pnl: 0,
      winRate: "Paused",
      status: "offline"
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Active Strategies</CardTitle>
          <Link href="/strategies">
            <Button variant="ghost" size="sm" data-testid="button-add-strategy">
              <i className="fas fa-plus mr-1"></i>
              Add Strategy
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {strategyPerformance.map((strategy, index) => (
            <div 
              key={strategy.name} 
              className="flex items-center justify-between p-4 bg-muted rounded-lg"
              data-testid={`strategy-item-${index}`}
            >
              <div className="flex items-center space-x-4">
                <div className={`w-2 h-2 rounded-full status-${strategy.status}`}></div>
                <div>
                  <h4 className="font-medium" data-testid={`strategy-name-${index}`}>{strategy.name}</h4>
                  <p className="text-sm text-muted-foreground" data-testid={`strategy-symbols-${index}`}>
                    {strategy.symbols}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p 
                  className={`font-mono ${strategy.pnl >= 0 ? 'profit' : 'loss'}`}
                  data-testid={`strategy-pnl-${index}`}
                >
                  {strategy.pnl >= 0 ? '+' : ''}${strategy.pnl.toFixed(2)}
                </p>
                <p className="text-sm text-muted-foreground" data-testid={`strategy-winrate-${index}`}>
                  {strategy.winRate} Win Rate
                </p>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}