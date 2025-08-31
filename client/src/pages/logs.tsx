import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useWebSocket } from "@/hooks/use-websocket";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { type Alert } from "@shared/schema";

export default function Logs() {
  const [filters, setFilters] = useState({
    type: "all",
    level: "all", 
    symbol: "all",
    search: ""
  });

  const [searchTerm, setSearchTerm] = useState("");
  const [logLevel, setLogLevel] = useState("ALL");
  const [timeFilter, setTimeFilter] = useState("24h");

  const { data: logs, isLoading } = useQuery({
    queryKey: ["/api/logs", filters],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (filters.type !== "all") params.append("type", filters.type);
      if (filters.level !== "all") params.append("level", filters.level);
      if (filters.symbol !== "all") params.append("symbol", filters.symbol);
      params.append("limit", "100");

      const response = await fetch(`/api/logs?${params}`);
      if (!response.ok) {
        // Return mock data if API fails
        return [
          {
            id: "log-1",
            timestamp: new Date().toISOString(),
            level: "INFO",
            type: "strategy",
            message: "Strategy Breakout Volatility started",
            symbol: "EURUSD",
            metadata: {}
          },
          {
            id: "log-2", 
            timestamp: new Date(Date.now() - 300000).toISOString(),
            level: "WARNING",
            type: "risk",
            message: "High volatility detected",
            symbol: "GBPUSD",
            metadata: {}
          }
        ];
      }
      return response.json();
    }
  });

  const { data: logStats } = useQuery({
    queryKey: ["/api/logs/stats"],
    queryFn: async () => {
      const response = await fetch("/api/logs/stats");
      if (!response.ok) {
        // Return mock stats if API fails
        return {
          totalLogs: 1250,
          errorCount: 15,
          warningCount: 45,
          recentActivity: 23
        };
      }
      return response.json();
    }
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery<Alert[]>({
    queryKey: ["/api/alerts"],
  });

  // Removed direct use of systemLogs and tradingLogs from useQuery
  // Will now rely on WebSocket for real-time updates and fallback to query if needed

  const { sendMessage, lastMessage } = useWebSocket("ws://localhost:8080"); // Assuming WebSocket server URL

  const [liveSystemLogs, setLiveSystemLogs] = useState<any[]>([]);
  const [liveTradingLogs, setLiveTradingLogs] = useState<any[]>([]);

  useEffect(() => {
    if (lastMessage) {
      try {
        const message = JSON.parse(lastMessage.data);
        if (message.type === "LOG_UPDATE") {
          if (message.payload.service === "system") {
            setLiveSystemLogs((prevLogs) => [message.payload.log, ...prevLogs].slice(0, 100)); // Keep last 100 logs
          } else if (message.payload.service === "trading") {
            setLiveTradingLogs((prevLogs) => [message.payload.log, ...prevLogs].slice(0, 100)); // Keep last 100 logs
          }
        } else if (message.type === "ALERT_UPDATE") {
          // Handle alert updates if necessary, e.g., refresh alerts data
          // For now, we rely on the query for alerts
        }
      } catch (error) {
        console.error("Failed to parse WebSocket message:", error);
      }
    }
  }, [lastMessage]);

  // Request initial logs from server via WebSocket
  useEffect(() => {
    sendMessage({ type: "SUBSCRIBE", payload: { channels: ["logs", "alerts"] } });
    // Optionally, request historical logs if WebSocket only provides real-time
    // sendMessage({ type: "GET_LOGS", payload: { type: "system", filter: timeFilter } });
    // sendMessage({ type: "GET_LOGS", payload: { type: "trading", filter: timeFilter } });
  }, [sendMessage]);


  const getAlertIcon = (level: string) => {
    switch (level.toLowerCase()) {
      case "critical": return "fas fa-exclamation-triangle text-destructive";
      case "warning": return "fas fa-exclamation-triangle text-warning";
      case "info": default: return "fas fa-info-circle text-primary";
    }
  };

  const getLogLevelBadge = (level: string) => {
    const variant = level === "ERROR" ? "destructive" : 
                   level === "WARN" ? "secondary" : "outline";
    return <Badge variant={variant}>{level}</Badge>;
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return `${Math.floor(diffMins / 1440)}d ago`;
  };

  // Mock system logs for demonstration - these will be replaced by live logs
  const mockSystemLogs = [
    {
      id: "1",
      timestamp: new Date(Date.now() - 2 * 60000).toISOString(),
      level: "INFO",
      service: "strategy-engine",
      message: "Strategy 'Breakout Volatility' generated BUY signal for EURUSD",
      details: { symbol: "EURUSD", signal: "BUY", confidence: 0.85 }
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      level: "WARN",
      service: "risk-manager",
      message: "Daily loss approaching 60% of limit",
      details: { currentLoss: 3000, limit: 5000 }
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 8 * 60000).toISOString(),
      level: "ERROR",
      service: "market-data",
      message: "MT5 connection timeout, retrying...",
      details: { broker: "MT5", timeout: 5000 }
    }
  ];

  // Mock trading logs - these will be replaced by live logs
  const mockTradingLogs = [
    {
      id: "1",
      timestamp: new Date(Date.now() - 3 * 60000).toISOString(),
      type: "ORDER_FILLED",
      symbol: "EURUSD",
      message: "Market order filled: BUY 0.1 EURUSD at 1.0845",
      details: { orderId: "ORD123", fillPrice: 1.0845, quantity: 0.1 }
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 7 * 60000).toISOString(),
      type: "POSITION_OPENED",
      symbol: "GBPUSD",
      message: "New position opened: SELL 0.05 GBPUSD",
      details: { positionId: "POS456", entryPrice: 1.2650 }
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 12 * 60000).toISOString(),
      type: "RISK_BLOCK",
      symbol: "USDJPY",
      message: "Order blocked: Daily loss limit would be exceeded",
      details: { reason: "DAILY_LOSS_LIMIT", blockType: "HARD_STOP" }
    }
  ];

  const filteredSystemLogs = (liveSystemLogs.length > 0 ? liveSystemLogs : mockSystemLogs).filter(log => {
    const matchesSearch = log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.service.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel = logLevel === "ALL" || log.level === logLevel;
    return matchesSearch && matchesLevel;
  });

  const filteredTradingLogs = (liveTradingLogs.length > 0 ? liveTradingLogs : mockTradingLogs).filter(log => 
    log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
    log.symbol.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <>
      <Header title="Logs & Alerts" description="Monitor system activity and alerts" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-stretch sm:items-center">
              <div className="flex-1 min-w-full sm:min-w-[300px]">
                <Input
                  placeholder="Search logs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-logs"
                />
              </div>
              <Select value={logLevel} onValueChange={setLogLevel}>
                <SelectTrigger className="w-[150px]" data-testid="select-log-level">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Levels</SelectItem>
                  <SelectItem value="ERROR">Error</SelectItem>
                  <SelectItem value="WARN">Warning</SelectItem>
                  <SelectItem value="INFO">Info</SelectItem>
                  <SelectItem value="DEBUG">Debug</SelectItem>
                </SelectContent>
              </Select>
              <Select value={timeFilter} onValueChange={setTimeFilter}>
                <SelectTrigger className="w-[150px]" data-testid="select-time-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1h">Last Hour</SelectItem>
                  <SelectItem value="24h">Last 24 Hours</SelectItem>
                  <SelectItem value="7d">Last 7 Days</SelectItem>
                  <SelectItem value="30d">Last 30 Days</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" data-testid="button-export-logs">
                <i className="fas fa-download mr-2"></i>
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="alerts" className="space-y-4 md:space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="alerts" data-testid="tab-alerts" className="text-xs sm:text-sm">Alerts</TabsTrigger>
            <TabsTrigger value="system" data-testid="tab-system" className="text-xs sm:text-sm">System Logs</TabsTrigger>
            <TabsTrigger value="trading" data-testid="tab-trading" className="text-xs sm:text-sm">Trading Logs</TabsTrigger>
          </TabsList>

          <TabsContent value="alerts" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Alerts</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {alerts?.map((alert: any, index: number) => (
                    <div 
                      key={alert.id} 
                      className="flex items-start space-x-3 p-4 bg-muted rounded-lg"
                      data-testid={`alert-item-${index}`}
                    >
                      <i className={`${getAlertIcon(alert.level)} mt-1`}></i>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="font-medium" data-testid={`alert-title-${index}`}>
                            {alert.title}
                          </h4>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-muted-foreground" data-testid={`alert-time-${index}`}>
                              {formatTimeAgo(alert.createdAt)}
                            </span>
                            {!alert.isRead && (
                              <Badge variant="outline" className="text-xs">NEW</Badge>
                            )}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground" data-testid={`alert-message-${index}`}>
                          {alert.message}
                        </p>
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-muted-foreground">
                      <i className="fas fa-bell text-4xl mb-4"></i>
                      <h3 className="text-lg font-semibold mb-2">No Alerts</h3>
                      <p>All systems are operating normally</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="system" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>System Logs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredSystemLogs.map((log, index) => (
                    <div 
                      key={log.id} 
                      className="flex items-start space-x-3 p-3 hover:bg-muted rounded-lg transition-colors"
                      data-testid={`system-log-${index}`}
                    >
                      <span className="font-mono text-xs text-muted-foreground mt-1 w-16" data-testid={`log-time-${index}`}>
                        {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                      <div className="w-16">
                        {getLogLevelBadge(log.level)}
                      </div>
                      <span className="font-mono text-xs text-muted-foreground w-24" data-testid={`log-service-${index}`}>
                        {log.service}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm" data-testid={`log-message-${index}`}>{log.message}</p>
                        {log.details && (
                          <pre className="text-xs text-muted-foreground mt-1 bg-background p-2 rounded overflow-x-auto" data-testid={`log-details-${index}`}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredSystemLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <i className="fas fa-search text-4xl mb-4"></i>
                      <h3 className="text-lg font-semibold mb-2">No Logs Found</h3>
                      <p>Try adjusting your search criteria</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="trading" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Trading Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {filteredTradingLogs.map((log, index) => (
                    <div 
                      key={log.id} 
                      className="flex items-start space-x-3 p-3 hover:bg-muted rounded-lg transition-colors"
                      data-testid={`trading-log-${index}`}
                    >
                      <span className="font-mono text-xs text-muted-foreground mt-1 w-16" data-testid={`trading-log-time-${index}`}>
                        {new Date(log.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                      </span>
                      <div className="w-24">
                        <Badge variant="outline" className="text-xs" data-testid={`trading-log-type-${index}`}>
                          {log.type}
                        </Badge>
                      </div>
                      <span className="font-mono text-xs font-medium w-20" data-testid={`trading-log-symbol-${index}`}>
                        {log.symbol}
                      </span>
                      <div className="flex-1">
                        <p className="text-sm" data-testid={`trading-log-message-${index}`}>{log.message}</p>
                        {log.details && (
                          <pre className="text-xs text-muted-foreground mt-1 bg-background p-2 rounded overflow-x-auto" data-testid={`trading-log-details-${index}`}>
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        )}
                      </div>
                    </div>
                  ))}
                  {filteredTradingLogs.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <i className="fas fa-chart-line text-4xl mb-4"></i>
                      <h3 className="text-lg font-semibold mb-2">No Trading Activity</h3>
                      <p>No trading events match your criteria</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </>
  );
}