
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface SystemStatus {
  service: string;
  status: string;
  latency?: number;
  metadata?: any;
}

interface SystemHealthProps {
  health: SystemStatus[];
}

export default function SystemHealth({ health }: SystemHealthProps) {
  if (!health || !Array.isArray(health)) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>System Health & Broker Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading system health...</div>
        </CardContent>
      </Card>
    );
  }

  const getStatusVariant = (status: string) => {
    switch (status.toLowerCase()) {
      case "online": return "default";
      case "warning": case "reconnecting": return "secondary";
      case "error": case "offline": return "destructive";
      default: return "outline";
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case "online": return "Connected";
      case "warning": return "Warning";
      case "error": return "Error";
      case "offline": return "Offline";
      default: return status;
    }
  };

  // Default system components with fallback data
  const systemComponents = [
    {
      name: "OANDA (Demo)",
      status: "ONLINE",
      latency: 23,
      lastTick: "14:35:42"
    },
    {
      name: "MT5 Bridge",
      status: "WARNING",
      latency: null,
      lastTick: "14:33:15"
    },
    {
      name: "Strategy Engine",
      status: health.find(h => h.service === "strategy-engine")?.status || "ONLINE",
      latency: health.find(h => h.service === "strategy-engine")?.latency || 0,
      cpu: "12%",
      memory: "1.2GB"
    },
    {
      name: "Risk Manager",
      status: health.find(h => h.service === "risk-manager")?.status || "ONLINE",
      latency: health.find(h => h.service === "risk-manager")?.latency || 0,
      checksPerMin: health.find(h => h.service === "risk-manager")?.metadata?.checksPerMinute || 847,
      blocks: health.find(h => h.service === "risk-manager")?.metadata?.blocks || 0
    }
  ];

  return (
    <Card>
      <CardHeader className="pb-4">
        <CardTitle>System Health & Broker Status</CardTitle>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {systemComponents.map((component, index) => (
            <div key={component.name} className="p-4 border rounded-lg space-y-3" data-testid={`system-component-${index}`}>
              {/* Header with name and status */}
              <div className="flex items-center justify-between">
                <h4 className="font-semibold text-sm" data-testid={`component-name-${index}`}>
                  {component.name}
                </h4>
                <Badge 
                  variant={getStatusVariant(component.status)}
                  className="text-xs"
                  data-testid={`component-status-${index}`}
                >
                  {getStatusText(component.status)}
                </Badge>
              </div>

              {/* Metrics */}
              <div className="space-y-2">
                {component.latency !== null && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Latency</span>
                    <span className="font-mono font-medium" data-testid={`component-latency-${index}`}>
                      {component.latency}ms
                    </span>
                  </div>
                )}
                
                {component.lastTick && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Last Tick</span>
                    <span className="font-mono font-medium" data-testid={`component-last-tick-${index}`}>
                      {component.lastTick}
                    </span>
                  </div>
                )}
                
                {component.cpu && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">CPU</span>
                    <span className="font-mono font-medium" data-testid={`component-cpu-${index}`}>
                      {component.cpu}
                    </span>
                  </div>
                )}
                
                {component.memory && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Memory</span>
                    <span className="font-mono font-medium" data-testid={`component-memory-${index}`}>
                      {component.memory}
                    </span>
                  </div>
                )}
                
                {component.checksPerMin && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Checks/min</span>
                    <span className="font-mono font-medium" data-testid={`component-checks-${index}`}>
                      {component.checksPerMin.toLocaleString()}
                    </span>
                  </div>
                )}
                
                {typeof component.blocks === "number" && (
                  <div className="flex justify-between text-xs">
                    <span className="text-muted-foreground">Blocks</span>
                    <span className="font-mono font-medium" data-testid={`component-blocks-${index}`}>
                      {component.blocks}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
