import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";

interface Position {
  id: string;
  symbol: string;
  side: string;
  quantity: string;
  avgPrice: string;
  currentPrice: string | null;
  unrealizedPnL: string | null;
  stopLoss: string | null;
  takeProfit: string | null;
  strategyId: string | null;
  isOpen?: boolean; // Added to align with the filter
}

interface OpenPositionsProps {
  positions: Position[];
}

export default function OpenPositions({ positions }: OpenPositionsProps) {
  const { toast } = useToast();

  if (!positions || !Array.isArray(positions)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Open Positions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading positions...</div>
        </CardContent>
      </Card>
    );
  }

  const filteredPositions = positions.filter(position => position.isOpen);

  const handleClosePosition = async (positionId: string) => {
    try {
      await apiRequest("POST", `/api/positions/${positionId}/close`);
      toast({
        title: "Position Closed",
        description: "Position has been closed successfully",
      });

      // Invalidate dashboard data to refresh
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to close position",
        variant: "destructive",
      });
    }
  };

  const getStrategyName = (strategyId: string | null) => {
    // This would normally come from a strategies lookup
    const strategyNames: Record<string, string> = {
      "breakout": "Breakout Volatility",
      "mean-reversion": "Mean Reversion",
      "trend-follow": "Trend Follow",
    };
    return strategyNames[strategyId || ""] || "Unknown Strategy";
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Open Positions</CardTitle>
          <div className="text-sm text-muted-foreground">
            Live updates every <span className="text-foreground">500ms</span>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-muted">
              <tr className="text-left text-sm text-muted-foreground">
                <th className="p-4">Symbol</th>
                <th className="p-4">Strategy</th>
                <th className="p-4">Side</th>
                <th className="p-4">Size</th>
                <th className="p-4">Entry</th>
                <th className="p-4">Current</th>
                <th className="p-4">Unrealized P&L</th>
                <th className="p-4">SL/TP</th>
                <th className="p-4">Actions</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {filteredPositions.map((position, index) => {
                const pnl = parseFloat(position.unrealizedPnL || "0");
                return (
                  <tr
                    key={position.id}
                    className="border-b border-border hover:bg-muted/50"
                    data-testid={`position-row-${index}`}
                  >
                    <td className="p-4 font-mono font-medium" data-testid={`position-symbol-${index}`}>
                      {position.symbol}
                    </td>
                    <td className="p-4 text-muted-foreground" data-testid={`position-strategy-${index}`}>
                      {getStrategyName(position.strategyId)}
                    </td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          position.side === "BUY"
                            ? "bg-green-500/20 text-green-400"
                            : "bg-red-500/20 text-red-400"
                        }`}
                        data-testid={`position-side-${index}`}
                      >
                        {position.side === "BUY" ? "LONG" : "SHORT"}
                      </span>
                    </td>
                    <td className="p-4 font-mono" data-testid={`position-quantity-${index}`}>
                      {parseFloat(position.quantity).toFixed(2)}
                    </td>
                    <td className="p-4 font-mono" data-testid={`position-entry-${index}`}>
                      {parseFloat(position.avgPrice).toFixed(4)}
                    </td>
                    <td className="p-4 font-mono" data-testid={`position-current-${index}`}>
                      {position.currentPrice ? parseFloat(position.currentPrice).toFixed(4) : "--"}
                    </td>
                    <td
                      className={`p-4 font-mono ${pnl >= 0 ? 'profit' : 'loss'}`}
                      data-testid={`position-pnl-${index}`}
                    >
                      {pnl >= 0 ? '+' : ''}${pnl.toFixed(2)}
                    </td>
                    <td className="p-4 font-mono text-xs">
                      <div data-testid={`position-sl-${index}`}>
                        SL: {position.stopLoss ? parseFloat(position.stopLoss).toFixed(4) : "--"}
                      </div>
                      <div data-testid={`position-tp-${index}`}>
                        TP: {position.takeProfit ? parseFloat(position.takeProfit).toFixed(4) : "--"}
                      </div>
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleClosePosition(position.id)}
                        className="text-destructive hover:text-destructive/80"
                        data-testid={`button-close-position-${index}`}
                      >
                        <i className="fas fa-times"></i>
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredPositions.length === 0 && (
                <tr>
                  <td colSpan={9} className="p-8 text-center text-muted-foreground">
                    No open positions
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