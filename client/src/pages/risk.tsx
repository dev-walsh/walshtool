import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

// Define interfaces for risk data
interface RiskStatus {
  dailyLossUsed: number;
  dailyLossLimit: number;
  maxDrawdown: number;
  maxDrawdownLimit: number;
  totalExposure: number;
  maxExposure: number;
  positionCount: number;
  maxPositions: number;
}

interface RiskEvent {
  id: string;
  level: string;
  rule: string;
  action: string;
  details: any;
  createdAt: string;
}

export default function Risk() {
  const { data: riskStatus, isLoading } = useQuery<RiskStatus>({
    queryKey: ["/api/risk/status"],
    refetchInterval: 2000, // Update every 2 seconds
  });

  const { data: riskEventsData, isLoading: eventsLoading } = useQuery({
    queryKey: ["risk-events"],
    queryFn: () => apiRequest("GET", "/api/risk/events"),
    refetchInterval: 30000,
  });

  const riskEvents = Array.isArray(riskEventsData) ? riskEventsData : [];

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading risk data...</p>
        </div>
      </div>
    );
  }

  const getRiskLevel = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 80) return { level: "HIGH", color: "destructive" as const };
    if (percentage >= 60) return { level: "MEDIUM", color: "secondary" as const };
    return { level: "LOW", color: "default" as const };
  };

  return (
    <>
      <Header title="Risk & Rules" description="Monitor and configure risk management settings" />

      <div className="p-6 space-y-6">
        {/* Risk Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Daily Loss Limit</h3>
                <Badge variant={getRiskLevel(riskStatus?.dailyLossUsed || 0, riskStatus?.dailyLossLimit || 5000).color}>
                  {getRiskLevel(riskStatus?.dailyLossUsed || 0, riskStatus?.dailyLossLimit || 5000).level}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Used</span>
                  <span className="font-mono" data-testid="daily-loss-used">
                    ${riskStatus?.dailyLossUsed || 0} / ${riskStatus?.dailyLossLimit || 5000}
                  </span>
                </div>
                <Progress 
                  value={((riskStatus?.dailyLossUsed || 0) / (riskStatus?.dailyLossLimit || 5000)) * 100} 
                  className="h-2"
                  data-testid="daily-loss-progress"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Max Drawdown</h3>
                <Badge variant={getRiskLevel(riskStatus?.maxDrawdown || 0, riskStatus?.maxDrawdownLimit || 15).color}>
                  {getRiskLevel(riskStatus?.maxDrawdown || 0, riskStatus?.maxDrawdownLimit || 15).level}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Current</span>
                  <span className="font-mono" data-testid="max-drawdown-current">
                    -{(riskStatus?.maxDrawdown || 0).toFixed(1)}% / -{riskStatus?.maxDrawdownLimit || 15}%
                  </span>
                </div>
                <Progress 
                  value={((riskStatus?.maxDrawdown || 0) / (riskStatus?.maxDrawdownLimit || 15)) * 100} 
                  className="h-2"
                  data-testid="max-drawdown-progress"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Position Exposure</h3>
                <Badge variant={getRiskLevel(riskStatus?.totalExposure || 0, riskStatus?.maxExposure || 75000).color}>
                  {getRiskLevel(riskStatus?.totalExposure || 0, riskStatus?.maxExposure || 75000).level}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Total</span>
                  <span className="font-mono" data-testid="total-exposure">
                    ${(riskStatus?.totalExposure || 0).toLocaleString()} / ${(riskStatus?.maxExposure || 75000).toLocaleString()}
                  </span>
                </div>
                <Progress 
                  value={((riskStatus?.totalExposure || 0) / (riskStatus?.maxExposure || 75000)) * 100} 
                  className="h-2"
                  data-testid="total-exposure-progress"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-muted-foreground">Open Positions</h3>
                <Badge variant={getRiskLevel(riskStatus?.positionCount || 0, riskStatus?.maxPositions || 10).color}>
                  {getRiskLevel(riskStatus?.positionCount || 0, riskStatus?.maxPositions || 10).level}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Count</span>
                  <span className="font-mono" data-testid="position-count">
                    {riskStatus?.positionCount || 0} / {riskStatus?.maxPositions || 10}
                  </span>
                </div>
                <Progress 
                  value={((riskStatus?.positionCount || 0) / (riskStatus?.maxPositions || 10)) * 100} 
                  className="h-2"
                  data-testid="position-count-progress"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Risk Rules Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Risk Rules Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <h4 className="font-medium">Account Limits</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Daily Loss Limit</p>
                      <p className="text-sm text-muted-foreground">Maximum daily loss allowed</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">$5,000</p>
                      <Button variant="ghost" size="sm" data-testid="button-edit-daily-loss">
                        <i className="fas fa-edit"></i>
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Max Drawdown</p>
                      <p className="text-sm text-muted-foreground">Maximum equity drawdown</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">15%</p>
                      <Button variant="ghost" size="sm" data-testid="button-edit-max-drawdown">
                        <i className="fas fa-edit"></i>
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Max Exposure</p>
                      <p className="text-sm text-muted-foreground">Total position exposure limit</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">$75,000</p>
                      <Button variant="ghost" size="sm" data-testid="button-edit-max-exposure">
                        <i className="fas fa-edit"></i>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-medium">Position Limits</h4>
                <div className="space-y-3">
                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Max Positions</p>
                      <p className="text-sm text-muted-foreground">Maximum concurrent positions</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">10</p>
                      <Button variant="ghost" size="sm" data-testid="button-edit-max-positions">
                        <i className="fas fa-edit"></i>
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Max Lot Size</p>
                      <p className="text-sm text-muted-foreground">Maximum lot size per trade</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">1.0</p>
                      <Button variant="ghost" size="sm" data-testid="button-edit-max-lot-size">
                        <i className="fas fa-edit"></i>
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-muted rounded-lg">
                    <div>
                      <p className="font-medium">Risk Per Trade</p>
                      <p className="text-sm text-muted-foreground">Maximum risk percentage per trade</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono">2%</p>
                      <Button variant="ghost" size="sm" data-testid="button-edit-risk-per-trade">
                        <i className="fas fa-edit"></i>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Risk Events */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Risk Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {riskEvents?.length ? (
                riskEvents.map((event: any, index: number) => (
                  <div 
                    key={event.id} 
                    className="flex items-start space-x-3 p-4 bg-muted rounded-lg"
                    data-testid={`risk-event-${index}`}
                  >
                    <i className={`fas ${
                      event.level === "CRITICAL" ? "fa-exclamation-triangle text-destructive" :
                      event.level === "WARNING" ? "fa-exclamation-triangle text-warning" :
                      "fa-info-circle text-primary"
                    } mt-1`}></i>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-medium" data-testid={`risk-event-rule-${index}`}>{event.rule}</h4>
                        <span className="text-xs text-muted-foreground" data-testid={`risk-event-time-${index}`}>
                          {new Date(event.createdAt).toLocaleString()}
                        </span>
                      </div>
                      <p className="text-sm text-muted-foreground" data-testid={`risk-event-action-${index}`}>
                        Action: {event.action}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <i className="fas fa-shield-alt text-4xl mb-4"></i>
                  <h3 className="text-lg font-semibold mb-2">No Risk Events</h3>
                  <p>All risk parameters are within normal limits</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}