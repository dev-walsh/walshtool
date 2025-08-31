import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, TrendingUp, Brain, BarChart3, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

interface TradingSignal {
  id: string;
  symbol: string;
  side: "BUY" | "SELL";
  strength: number;
  confidence: number;
  source: string;
  indicators: { [key: string]: number };
  reasoning: string;
  timestamp: string;
  expiresAt: string;
}

interface SignalProvider {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
}

interface SymbolSignalsData {
  signals: TradingSignal[];
  consensus: {
    side: "BUY" | "SELL";
    strength: number;
    confidence: number;
    reasoning: string;
  };
}

export default function Signals() {
  const [selectedSymbol, setSelectedSymbol] = useState("all");
  const queryClient = useQueryClient();

  const { data: signals, isLoading: signalsLoading } = useQuery<TradingSignal[]>({
    queryKey: ["signals"],
    queryFn: () => apiRequest("GET", "/api/signals"),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: providers, isLoading: providersLoading } = useQuery<SignalProvider[]>({
    queryKey: ["signal-providers"],
    queryFn: () => apiRequest("GET", "/api/signals/providers"),
  });

  const { data: symbolSignals, isLoading: symbolSignalsLoading } = useQuery<SymbolSignalsData>({
    queryKey: ["signals", selectedSymbol],
    queryFn: async () => {
      if (selectedSymbol === "all") return null;
      return apiRequest("GET", `/api/signals/${selectedSymbol}`);
    },
    enabled: selectedSymbol !== "all",
  });

  const toggleProviderMutation = useMutation({
    mutationFn: async ({ providerId, enabled }: { providerId: string; enabled: boolean }) => {
      return apiRequest("POST", `/api/signals/providers/${providerId}/toggle`, { enabled });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["signal-providers"] });
      queryClient.invalidateQueries({ queryKey: ["signals"] });
    },
  });

  const toggleProvider = (providerId: string, enabled: boolean) => {
    toggleProviderMutation.mutate({ providerId, enabled });
  };

  const getSignalIcon = (source: string) => {
    switch (source) {
      case "Technical Analysis": return <BarChart3 className="h-4 w-4" />;
      case "Market Sentiment": return <TrendingUp className="h-4 w-4" />;
      case "ML Price Prediction": return <Brain className="h-4 w-4" />;
      default: return <Zap className="h-4 w-4" />;
    }
  };

  const getStrengthColor = (strength: number) => {
    if (strength >= 80) return "bg-green-500";
    if (strength >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  const uniqueSymbols = [...new Set((signals || []).map(s => s.symbol))];

  if (signalsLoading || providersLoading || symbolSignalsLoading) {
    return (
      <div className="p-4 md:p-6 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading signals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <h1 className="text-2xl md:text-3xl font-bold">Trading Signals</h1>
        <Select value={selectedSymbol} onValueChange={setSelectedSymbol}>
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Symbols"/>
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Symbols</SelectItem>
            {uniqueSymbols.map(symbol => (
              <SelectItem key={symbol} value={symbol}>{symbol}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="active" className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="active" className="text-xs sm:text-sm">Active Signals</TabsTrigger>
          <TabsTrigger value="providers" className="text-xs sm:text-sm">Signal Providers</TabsTrigger>
          <TabsTrigger value="consensus" className="text-xs sm:text-sm">Consensus View</TabsTrigger>
        </TabsList>

        <TabsContent value="active" className="space-y-6">
          <div className="grid gap-4">
            {!signals || signals.length === 0 ? (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No active signals found</p>
                </CardContent>
              </Card>
            ) : (
              signals?.map((signal) => (
                <Card key={signal.id} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        {getSignalIcon(signal.source)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-lg">{signal.symbol}</span>
                            <Badge variant={signal.side === "BUY" ? "default" : "destructive"} className="flex items-center gap-1">
                              {signal.side === "BUY" ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                              {signal.side}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{signal.source}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm text-muted-foreground">Generated at</p>
                        <p className="font-medium">{formatTime(signal.timestamp)}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
                      <div>
                        <p className="text-sm text-muted-foreground">Strength</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className={`h-full rounded-full ${getStrengthColor(signal.strength)}`}
                              style={{ width: `${signal.strength}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{signal.strength}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Confidence</p>
                        <div className="flex items-center gap-2">
                          <div className="flex-1 bg-muted rounded-full h-2">
                            <div
                              className="h-full rounded-full bg-blue-500"
                              style={{ width: `${signal.confidence}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium">{signal.confidence}%</span>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Expires</p>
                        <p className="font-medium">{formatTime(signal.expiresAt)}</p>
                      </div>
                    </div>

                    <div className="border-t pt-3">
                      <p className="text-sm">{signal.reasoning}</p>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="providers" className="space-y-6">
          <div className="grid gap-4">
            {providers && Array.isArray(providers) && providers.length > 0 ? providers.map((provider) => (
              <Card key={provider.id}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{provider.name}</CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">{provider.description}</p>
                    </div>
                    <Switch
                      checked={provider.enabled}
                      onCheckedChange={(enabled) => toggleProvider(provider.id, enabled)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4">
                    <Badge variant={provider.enabled ? "default" : "secondary"}>
                      {provider.enabled ? "Active" : "Disabled"}
                    </Badge>
                    <span className="text-sm text-muted-foreground">
                      {signals?.filter(s => s.source === provider.name).length || 0} active signals
                    </span>
                  </div>
                </CardContent>
              </Card>
            )) : (
              <Card>
                <CardContent className="p-6 text-center">
                  <p className="text-muted-foreground">No signal providers available</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="consensus" className="space-y-6">
          {selectedSymbol !== "all" && symbolSignals?.consensus ? (
            <Card>
              <CardHeader>
                <CardTitle>Consensus Signal for {selectedSymbol}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={symbolSignals.consensus.side === "BUY" ? "default" : "destructive"}
                      className="flex items-center gap-1 text-lg px-3 py-1"
                    >
                      {symbolSignals.consensus.side === "BUY" ?
                        <ArrowUp className="h-4 w-4" /> :
                        <ArrowDown className="h-4 w-4" />
                      }
                      {symbolSignals.consensus.side}
                    </Badge>
                    <div>
                      <p className="font-medium">Strength: {Math.round(symbolSignals.consensus.strength)}%</p>
                      <p className="text-sm text-muted-foreground">
                        Confidence: {Math.round(symbolSignals.consensus.confidence)}%
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground">{symbolSignals.consensus.reasoning}</p>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  {selectedSymbol === "all" ?
                    "Select a symbol to view consensus signal" :
                    "No consensus signal available for this symbol"
                  }
                </p>
              </CardContent>
            </Card>
          )}

          {selectedSymbol !== "all" && symbolSignals?.signals && (
            <Card>
              <CardHeader>
                <CardTitle>Individual Signals for {selectedSymbol}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {symbolSignals.signals.map((signal: TradingSignal) => (
                    <div key={signal.id} className="flex items-center justify-between p-3 border rounded">
                      <div className="flex items-center gap-3">
                        {getSignalIcon(signal.source)}
                        <div>
                          <p className="font-medium">{signal.source}</p>
                          <p className="text-sm text-muted-foreground">{signal.reasoning}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={signal.side === "BUY" ? "default" : "destructive"}>
                          {signal.side}
                        </Badge>
                        <span className="text-sm">
                          {signal.strength}% strength
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}