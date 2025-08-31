import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface Trade {
  id: string;
  symbol: string;
  side: string;
  quantity: string;
  avgFillPrice?: string;
  createdAt?: string;
}

interface RecentTradesProps {
  trades: Trade[];
}

export default function RecentTrades({ trades }: RecentTradesProps) {
  if (!trades || !Array.isArray(trades)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Trades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading trades...</div>
        </CardContent>
      </Card>
    );
  }
  // Mock some P&L calculations for display
  const tradesWithPnL = trades.map((trade, index) => ({
    ...trade,
    pnl: [127.45, 89.23, -45.67, 234.12][index] || (Math.random() - 0.5) * 200,
    time: new Date(trade.createdAt || Date.now()).toLocaleTimeString('en-US', { hour12: false })
  }));

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Recent Trades</CardTitle>
          <Link href="/logs">
            <Button variant="ghost" size="sm" data-testid="button-view-all-trades">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-4">Symbol</th>
                <th className="p-4">Side</th>
                <th className="p-4">Size</th>
                <th className="p-4">P&L</th>
                <th className="p-4">Time</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {tradesWithPnL.slice(0, 4).map((trade, index) => (
                <tr 
                  key={trade.id} 
                  className="border-b border-border"
                  data-testid={`trade-row-${index}`}
                >
                  <td className="p-4 font-mono" data-testid={`trade-symbol-${index}`}>
                    {trade.symbol}
                  </td>
                  <td className="p-4">
                    <span 
                      className={`px-2 py-1 rounded text-xs ${
                        trade.side === "BUY" 
                          ? "bg-green-500/20 text-green-400" 
                          : "bg-red-500/20 text-red-400"
                      }`}
                      data-testid={`trade-side-${index}`}
                    >
                      {trade.side}
                    </span>
                  </td>
                  <td className="p-4 font-mono" data-testid={`trade-size-${index}`}>
                    {parseFloat(trade.quantity).toFixed(2)}
                  </td>
                  <td 
                    className={`p-4 font-mono ${trade.pnl >= 0 ? 'profit' : 'loss'}`}
                    data-testid={`trade-pnl-${index}`}
                  >
                    {trade.pnl >= 0 ? '+' : ''}${trade.pnl.toFixed(2)}
                  </td>
                  <td className="p-4 text-muted-foreground" data-testid={`trade-time-${index}`}>
                    {trade.time}
                  </td>
                </tr>
              ))}
              {tradesWithPnL.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-muted-foreground">
                    No recent trades
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
