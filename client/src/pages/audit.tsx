import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function Audit() {
  const [searchTerm, setSearchTerm] = useState("");
  const [actionFilter, setActionFilter] = useState("ALL");
  const [selectedAuditItem, setSelectedAuditItem] = useState<any>(null);

  const { data: auditTrail, isLoading } = useQuery({
    queryKey: ["/api/audit", actionFilter],
  });

  // Mock audit trail data for demonstration
  const mockAuditTrail = [
    {
      id: "1",
      timestamp: new Date(Date.now() - 5 * 60000).toISOString(),
      actor: "john.trader@example.com",
      action: "STRATEGY_STARTED",
      resource: "Strategy: Breakout Volatility",
      resourceId: "strategy-123",
      changes: {
        status: { from: "STOPPED", to: "RUNNING" },
        isEnabled: { from: false, to: true }
      },
      metadata: {
        ipAddress: "192.168.1.100",
        userAgent: "Mozilla/5.0...",
        sessionId: "sess_abc123"
      }
    },
    {
      id: "2",
      timestamp: new Date(Date.now() - 15 * 60000).toISOString(),
      actor: "system",
      action: "RISK_LIMIT_EXCEEDED",
      resource: "Risk Manager",
      resourceId: "risk-manager",
      changes: {
        action: "TRADE_BLOCKED",
        reason: "Daily loss limit approaching"
      },
      metadata: {
        currentLoss: 2800,
        limit: 5000,
        percentage: 56
      }
    },
    {
      id: "3",
      timestamp: new Date(Date.now() - 30 * 60000).toISOString(),
      actor: "admin@example.com",
      action: "ACCOUNT_CREATED",
      resource: "Trading Account",
      resourceId: "acc-456",
      changes: {
        accountNumber: "101-004-12345-002",
        broker: "OANDA",
        mode: "PAPER"
      },
      metadata: {
        ipAddress: "192.168.1.101",
        approval: "auto-approved"
      }
    },
    {
      id: "4",
      timestamp: new Date(Date.now() - 45 * 60000).toISOString(),
      actor: "john.trader@example.com",
      action: "EMERGENCY_STOP",
      resource: "System",
      resourceId: "system",
      changes: {
        allStrategies: "STOPPED",
        allPositions: "CLOSED",
        emergencyMode: true
      },
      metadata: {
        reason: "Manual trigger",
        ipAddress: "192.168.1.100"
      }
    },
    {
      id: "5",
      timestamp: new Date(Date.now() - 60 * 60000).toISOString(),
      actor: "system",
      action: "POSITION_CLOSED",
      resource: "Position: EURUSD",
      resourceId: "pos-789",
      changes: {
        status: { from: "OPEN", to: "CLOSED" },
        pnl: 127.45,
        reason: "Take profit hit"
      },
      metadata: {
        strategy: "Breakout Volatility",
        closingPrice: 1.0900
      }
    }
  ];

  const getActionBadge = (action: string) => {
    if (action.includes("CREATED") || action.includes("STARTED")) {
      return <Badge variant="default">{action}</Badge>;
    }
    if (action.includes("EMERGENCY") || action.includes("EXCEEDED")) {
      return <Badge variant="destructive">{action}</Badge>;
    }
    if (action.includes("STOPPED") || action.includes("CLOSED")) {
      return <Badge variant="secondary">{action}</Badge>;
    }
    return <Badge variant="outline">{action}</Badge>;
  };

  const getActionIcon = (action: string) => {
    if (action.includes("CREATED")) return "fas fa-plus-circle text-green-500";
    if (action.includes("STARTED")) return "fas fa-play-circle text-blue-500";
    if (action.includes("STOPPED") || action.includes("CLOSED")) return "fas fa-stop-circle text-gray-500";
    if (action.includes("EMERGENCY")) return "fas fa-exclamation-triangle text-red-500";
    if (action.includes("EXCEEDED")) return "fas fa-shield-alt text-yellow-500";
    return "fas fa-info-circle text-blue-500";
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

  const filteredAuditTrail = mockAuditTrail.filter(item => {
    const matchesSearch = item.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.actor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = actionFilter === "ALL" || item.action.includes(actionFilter);
    return matchesSearch && matchesAction;
  });

  return (
    <>
      <Header title="Audit Trail" description="Track all system changes and user actions" />

      <div className="p-6 space-y-6">
        {/* Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="flex-1 min-w-[300px]">
                <Input
                  placeholder="Search audit trail..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  data-testid="input-search-audit"
                />
              </div>
              <Select value={actionFilter} onValueChange={setActionFilter}>
                <SelectTrigger className="w-[200px]" data-testid="select-action-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Actions</SelectItem>
                  <SelectItem value="STRATEGY">Strategy Actions</SelectItem>
                  <SelectItem value="POSITION">Position Actions</SelectItem>
                  <SelectItem value="ACCOUNT">Account Actions</SelectItem>
                  <SelectItem value="RISK">Risk Actions</SelectItem>
                  <SelectItem value="EMERGENCY">Emergency Actions</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" data-testid="button-export-audit">
                <i className="fas fa-download mr-2"></i>
                Export
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Audit Trail */}
        <Card>
          <CardHeader>
            <CardTitle>Activity Log</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredAuditTrail.map((item, index) => (
                <div 
                  key={item.id} 
                  className="flex items-start space-x-4 p-4 border rounded-lg hover:bg-muted cursor-pointer transition-colors"
                  onClick={() => setSelectedAuditItem(item)}
                  data-testid={`audit-item-${index}`}
                >
                  <i className={`${getActionIcon(item.action)} mt-1`}></i>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <h4 className="font-medium truncate" data-testid={`audit-resource-${index}`}>
                          {item.resource}
                        </h4>
                        {getActionBadge(item.action)}
                      </div>
                      <span className="text-xs text-muted-foreground" data-testid={`audit-time-${index}`}>
                        {formatTimeAgo(item.timestamp)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground" data-testid={`audit-actor-${index}`}>
                        by {item.actor === "system" ? "System" : item.actor}
                      </span>
                      <span className="text-muted-foreground">
                        {new Date(item.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="mt-2">
                      {Object.entries(item.changes).map(([key, value]: [string, any]) => (
                        <div key={key} className="text-xs text-muted-foreground">
                          <span className="font-medium">{key}:</span>{" "}
                          {typeof value === "object" && value.from && value.to ? (
                            <>
                              <span className="line-through">{value.from}</span> → <span className="font-medium">{value.to}</span>
                            </>
                          ) : (
                            <span>{JSON.stringify(value)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {filteredAuditTrail.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <i className="fas fa-clipboard-list text-4xl mb-4"></i>
                  <h3 className="text-lg font-semibold mb-2">No Audit Records Found</h3>
                  <p>No activities match your search criteria</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Audit Detail Dialog */}
        <Dialog open={!!selectedAuditItem} onOpenChange={() => setSelectedAuditItem(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Audit Record Details</DialogTitle>
            </DialogHeader>
            {selectedAuditItem && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Timestamp</p>
                    <p className="font-mono" data-testid="audit-detail-timestamp">
                      {new Date(selectedAuditItem.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Actor</p>
                    <p data-testid="audit-detail-actor">{selectedAuditItem.actor}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Action</p>
                    <div data-testid="audit-detail-action">{getActionBadge(selectedAuditItem.action)}</div>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Resource ID</p>
                    <p className="font-mono" data-testid="audit-detail-resource-id">
                      {selectedAuditItem.resourceId}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Changes</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto" data-testid="audit-detail-changes">
                    {JSON.stringify(selectedAuditItem.changes, null, 2)}
                  </pre>
                </div>

                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-2">Metadata</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto" data-testid="audit-detail-metadata">
                    {JSON.stringify(selectedAuditItem.metadata, null, 2)}
                  </pre>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}