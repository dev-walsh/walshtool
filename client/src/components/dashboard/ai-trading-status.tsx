
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Bot, TrendingUp, Zap } from "lucide-react";

export function AITradingStatus() {
  const { data: aiStatus } = useQuery({
    queryKey: ["/api/ai-trading/status"],
    refetchInterval: 5000,
  });

  const { data: mt5Status } = useQuery({
    queryKey: ["/api/mt5/status"],
    refetchInterval: 10000,
  });

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium flex items-center">
          <Bot className="mr-2 h-4 w-4" />
          AI Trading Engine
        </CardTitle>
        <Badge variant={aiStatus?.active ? "default" : "secondary"}>
          {aiStatus?.active ? "ACTIVE" : "STOPPED"}
        </Badge>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">MT5 Connection</span>
            <Badge variant={mt5Status?.mt5Connected ? "default" : "destructive"}>
              {mt5Status?.mt5Connected ? "Connected" : "Disconnected"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Account Mode</span>
            <Badge variant={mt5Status?.isDemoMode ? "secondary" : "destructive"}>
              {mt5Status?.isDemoMode ? "Demo" : "Live"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">AI Model</span>
            <Badge variant={aiStatus?.apiConfigured ? "default" : "secondary"}>
              {aiStatus?.apiConfigured ? "DeepSeek" : "Not Configured"}
            </Badge>
          </div>

          {mt5Status?.accountInfo && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground">Account Balance</div>
              <div className="text-lg font-semibold">
                ${mt5Status.accountInfo.balance?.toFixed(2)} {mt5Status.accountInfo.currency}
              </div>
            </div>
          )}
          
          {!mt5Status?.mt5Connected && (
            <div className="flex items-center text-amber-600 text-xs">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Install MetaTrader 5 and ensure it's running
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
