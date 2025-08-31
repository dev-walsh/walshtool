import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";

interface Alert {
  id: string;
  level: string;
  title: string;
  message: string;
  createdAt?: string;
  timestamp?: string; // Added for compatibility with the change snippet
}

interface RecentAlertsProps {
  alerts: Alert[];
}

export default function RecentAlerts({ alerts }: RecentAlertsProps) {
  if (!alerts || !Array.isArray(alerts)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Alerts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading alerts...</div>
        </CardContent>
      </Card>
    );
  }
  const getAlertIcon = (level: string) => {
    switch (level?.toLowerCase()) {
      case "critical": return "fas fa-exclamation-triangle text-destructive";
      case "warning": return "fas fa-exclamation-triangle text-warning";
      case "info": default: return "fas fa-info-circle text-primary";
    }
  };

  const formatTimeAgo = (dateString?: string) => {
    if (!dateString) return "Unknown";

    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return "Just now";
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)} hours ago`;
    return `${Math.floor(diffMins / 1440)} days ago`;
  };

  // Default alerts if none provided
  const defaultAlerts = [
    {
      id: "1",
      level: "INFO",
      title: "Strategy Performance Alert",
      message: "Trend Follow Pullback strategy hit 5 consecutive losses. Consider reviewing parameters.",
      createdAt: new Date(Date.now() - 2 * 60000).toISOString()
    },
    {
      id: "2",
      level: "WARNING",
      title: "Broker Connection Warning",
      message: "MT5 Bridge experiencing intermittent disconnections. Attempting to reconnect.",
      createdAt: new Date(Date.now() - 5 * 60000).toISOString()
    },
    {
      id: "3",
      level: "INFO",
      title: "Daily Profit Target",
      message: "Daily profit target of $2,000 achieved. Risk management scaled back position sizes.",
      createdAt: new Date(Date.now() - 60 * 60000).toISOString()
    }
  ];

  const displayAlerts = alerts.length > 0 ? alerts : defaultAlerts;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Recent Alerts</CardTitle>
          <Link href="/logs">
            <Button variant="ghost" size="sm" data-testid="button-view-all-alerts">
              View All
            </Button>
          </Link>
        </div>
      </CardHeader>

      <CardContent>
        <div className="space-y-4">
          {displayAlerts.slice(0, 3).map((alert, index) => (
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
                  <span className="text-xs text-muted-foreground" data-testid={`alert-time-${index}`}>
                    {formatTimeAgo(alert.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground" data-testid={`alert-message-${index}`}>
                  {alert.message}
                </p>
              </div>
            </div>
          ))}
          {displayAlerts.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No recent alerts
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}