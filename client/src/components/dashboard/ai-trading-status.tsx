
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

  const { data: ctraderStatus } = useQuery({
    queryKey: ["/api/brokers/connections"],
    refetchInterval: 10000,
  });

  const { data: ctraderAccount } = useQuery({
    queryKey: ["/api/brokers/ctrader/account"],
    refetchInterval: 10000,
    enabled: ctraderStatus?.[0]?.status === "CONNECTED",
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
            <span className="text-sm text-muted-foreground">cTrader Connection</span>
            <Badge 
              variant={ctraderStatus?.[0]?.status === "CONNECTED" ? "default" : "destructive"}
              className={ctraderStatus?.[0]?.status === "CONNECTED" ? "bg-green-600 hover:bg-green-700" : ""}
            >
              {ctraderStatus?.[0]?.status === "CONNECTED" ? "CONNECTED" : "DISCONNECTED"}
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Account Mode</span>
            <Badge variant="secondary">
              Demo
            </Badge>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">AI Model</span>
            <Badge variant={aiStatus?.apiConfigured ? "default" : "secondary"}>
              {aiStatus?.apiConfigured ? "DeepSeek" : "Not Configured"}
            </Badge>
          </div>

          {ctraderStatus?.[0]?.status === "CONNECTED" && ctraderAccount && (
            <div className="pt-2 border-t">
              <div className="text-xs text-muted-foreground">Account Balance</div>
              <div className="text-lg font-semibold">
                ${ctraderAccount.balance?.toFixed(2)} {ctraderAccount.currency}
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Demo Account • Equity: ${ctraderAccount.equity?.toFixed(2)}
              </div>
            </div>
          )}
          
          {ctraderStatus?.[0]?.status !== "CONNECTED" && (
            <div className="flex items-center text-amber-600 text-xs">
              <AlertTriangle className="mr-1 h-3 w-3" />
              Connect to cTrader in Broker Connections
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
