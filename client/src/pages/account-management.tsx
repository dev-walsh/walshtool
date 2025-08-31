
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import Header from "@/components/layout/header";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest } from "@/lib/queryClient";
import { 
  CreditCard, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Calendar,
  DollarSign,
  Users,
  Activity,
  Trash2,
  Archive
} from "lucide-react";
import { format } from "date-fns";

interface AccountInfo {
  id: string;
  type: "FREE" | "BASIC" | "PRO" | "ENTERPRISE";
  status: "ACTIVE" | "SUSPENDED" | "CANCELLED";
  createdAt: string;
  lastLogin: string;
  totalTrades: number;
  totalPnL: number;
}

interface Subscription {
  id: string;
  plan: string;
  status: "ACTIVE" | "CANCELLED" | "PAST_DUE";
  amount: number;
  currency: string;
  billingCycle: "MONTHLY" | "YEARLY";
  nextBilling: string;
  features: string[];
}

interface Invoice {
  id: string;
  number: string;
  date: string;
  amount: number;
  currency: string;
  status: "PAID" | "PENDING" | "FAILED";
  downloadUrl: string;
}

interface UsageStats {
  apiCalls: {
    current: number;
    limit: number;
    period: string;
  };
  strategiesCount: {
    current: number;
    limit: number;
  };
  backtesters: {
    current: number;
    limit: number;
  };
  storage: {
    used: number;
    limit: number;
    unit: string;
  };
}

export default function AccountManagement() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const queryClient = useQueryClient();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const { data: accountInfo, error: accountError } = useQuery<AccountInfo>({
    queryKey: ["/api/account/info"],
    queryFn: async () => {
      return apiRequest("GET", "/api/account/info");
    },
    retry: 1,
  });

  const { data: subscription, error: subscriptionError } = useQuery<Subscription>({
    queryKey: ["/api/account/subscription"],
    queryFn: async () => {
      return apiRequest("GET", "/api/account/subscription");
    },
    retry: 1,
  });

  const { data: invoices, error: invoicesError } = useQuery<Invoice[]>({
    queryKey: ["/api/account/invoices"],
    queryFn: async () => {
      return apiRequest("GET", "/api/account/invoices");
    },
    retry: 1,
  });

  const { data: usageStats, error: usageError } = useQuery<UsageStats>({
    queryKey: ["/api/account/usage"],
    queryFn: async () => {
      return apiRequest("GET", "/api/account/usage");
    },
    retry: 1,
  });

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("POST", "/api/account/subscription/cancel");
    },
    onSuccess: () => {
      toast({
        title: "Subscription Cancelled",
        description: "Your subscription has been cancelled successfully.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/account/subscription"] });
    },
    onError: (error: any) => {
      toast({
        title: "Cancellation Failed",
        description: error.message || "Failed to cancel subscription.",
        variant: "destructive",
      });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async () => {
      return apiRequest("DELETE", "/api/account");
    },
    onSuccess: () => {
      toast({
        title: "Account Deleted",
        description: "Your account has been permanently deleted.",
      });
      logout();
    },
    onError: (error: any) => {
      toast({
        title: "Deletion Failed",
        description: error.message || "Failed to delete account.",
        variant: "destructive",
      });
    },
  });

  const exportDataMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch("/api/account/export", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${localStorage.getItem("auth_token")}`,
        },
      });
      
      if (!response.ok) {
        throw new Error("Failed to export data");
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `account-data-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
    onSuccess: () => {
      toast({
        title: "Data Exported",
        description: "Your account data has been downloaded successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Export Failed",
        description: error.message || "Failed to export account data.",
        variant: "destructive",
      });
    },
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      ACTIVE: "default",
      CANCELLED: "destructive",
      SUSPENDED: "secondary",
      PAID: "default",
      PENDING: "secondary",
      FAILED: "destructive",
      PAST_DUE: "destructive",
    };
    return <Badge variant={variants[status] || "outline"}>{status}</Badge>;
  };

  const getUsagePercentage = (current: number, limit: number) => {
    return Math.min((current / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="min-h-screen bg-background">
      <Header title="Account Management" description="Manage your account, billing, and subscription" />
      
      <div className="container mx-auto p-6">
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="billing" className="flex items-center gap-2">
              <CreditCard className="h-4 w-4" />
              Billing
            </TabsTrigger>
            <TabsTrigger value="usage" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Usage
            </TabsTrigger>
            <TabsTrigger value="data" className="flex items-center gap-2">
              <Archive className="h-4 w-4" />
              Data & Privacy
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Account Type</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{accountInfo?.type || "FREE"}</p>
                      <p className="text-xs text-muted-foreground">
                        Since {accountInfo?.createdAt ? format(new Date(accountInfo.createdAt), 'MMM yyyy') : 'N/A'}
                      </p>
                    </div>
                    {getStatusBadge(accountInfo?.status || "ACTIVE")}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Trades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold">{accountInfo?.totalTrades?.toLocaleString() || 0}</p>
                      <p className="text-xs text-muted-foreground">Lifetime executions</p>
                    </div>
                    <Activity className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total P&L</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className={`text-2xl font-bold ${(accountInfo?.totalPnL || 0) >= 0 ? 'text-green-500' : 'text-red-500'}`}>
                        ${accountInfo?.totalPnL?.toLocaleString() || '0.00'}
                      </p>
                      <p className="text-xs text-muted-foreground">All-time performance</p>
                    </div>
                    <DollarSign className="h-8 w-8 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium">Username</p>
                    <p className="text-sm text-muted-foreground">{user?.username}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Email</p>
                    <p className="text-sm text-muted-foreground">{user?.email}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Account ID</p>
                    <p className="text-sm text-muted-foreground font-mono">{accountInfo?.id}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium">Last Login</p>
                    <p className="text-sm text-muted-foreground">
                      {accountInfo?.lastLogin ? format(new Date(accountInfo.lastLogin), 'PPp') : 'N/A'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            {subscription && (
              <Card>
                <CardHeader>
                  <CardTitle>Current Subscription</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-semibold">{subscription.plan} Plan</h3>
                      <p className="text-sm text-muted-foreground">
                        ${subscription.amount}/{subscription.billingCycle.toLowerCase()}
                      </p>
                    </div>
                    <div className="text-right">
                      {getStatusBadge(subscription.status)}
                      <p className="text-sm text-muted-foreground mt-1">
                        Next billing: {format(new Date(subscription.nextBilling), 'PPP')}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="font-medium">Plan Features</h4>
                    <ul className="text-sm text-muted-foreground space-y-1">
                      {subscription.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="flex gap-2 pt-4">
                    <Button variant="outline">Upgrade Plan</Button>
                    <Button 
                      variant="destructive" 
                      onClick={() => cancelSubscriptionMutation.mutate()}
                      disabled={cancelSubscriptionMutation.isPending}
                    >
                      {cancelSubscriptionMutation.isPending ? "Cancelling..." : "Cancel Subscription"}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle>Billing History</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices?.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.number}</TableCell>
                        <TableCell>{format(new Date(invoice.date), 'PPP')}</TableCell>
                        <TableCell>${invoice.amount} {invoice.currency}</TableCell>
                        <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                        <TableCell>
                          <Button variant="ghost" size="sm" asChild>
                            <a href={invoice.downloadUrl} download>
                              <Download className="h-4 w-4" />
                            </a>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>API Usage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>API Calls ({usageStats?.apiCalls.period})</span>
                      <span>{usageStats?.apiCalls.current}/{usageStats?.apiCalls.limit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getUsageColor(
                          getUsagePercentage(usageStats?.apiCalls.current || 0, usageStats?.apiCalls.limit || 1)
                        )}`}
                        style={{ 
                          width: `${getUsagePercentage(usageStats?.apiCalls.current || 0, usageStats?.apiCalls.limit || 1)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Strategies</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Active Strategies</span>
                      <span>{usageStats?.strategiesCount.current}/{usageStats?.strategiesCount.limit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getUsageColor(
                          getUsagePercentage(usageStats?.strategiesCount.current || 0, usageStats?.strategiesCount.limit || 1)
                        )}`}
                        style={{ 
                          width: `${getUsagePercentage(usageStats?.strategiesCount.current || 0, usageStats?.strategiesCount.limit || 1)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Backtest Runners</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Concurrent Backtests</span>
                      <span>{usageStats?.backtesters.current}/{usageStats?.backtesters.limit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getUsageColor(
                          getUsagePercentage(usageStats?.backtesters.current || 0, usageStats?.backtesters.limit || 1)
                        )}`}
                        style={{ 
                          width: `${getUsagePercentage(usageStats?.backtesters.current || 0, usageStats?.backtesters.limit || 1)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Storage</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Data Storage</span>
                      <span>{usageStats?.storage.used} / {usageStats?.storage.limit} {usageStats?.storage.unit}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getUsageColor(
                          getUsagePercentage(usageStats?.storage.used || 0, usageStats?.storage.limit || 1)
                        )}`}
                        style={{ 
                          width: `${getUsagePercentage(usageStats?.storage.used || 0, usageStats?.storage.limit || 1)}%` 
                        }}
                      ></div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Data & Privacy Tab */}
          <TabsContent value="data" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Data Export</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Download a complete copy of your account data including trades, strategies, and settings.
                </p>
                <Button 
                  onClick={() => exportDataMutation.mutate()}
                  disabled={exportDataMutation.isPending}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exportDataMutation.isPending ? "Exporting..." : "Export Account Data"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border-destructive">
              <CardHeader>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    These actions are permanent and cannot be undone. Please proceed with caution.
                  </AlertDescription>
                </Alert>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h4 className="font-medium">Delete Account</h4>
                      <p className="text-sm text-muted-foreground">
                        Permanently delete your account and all associated data.
                      </p>
                    </div>
                    <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
                      <DialogTrigger asChild>
                        <Button variant="destructive">
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Account
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Are you absolutely sure?</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-4">
                          <p className="text-sm text-muted-foreground">
                            This action cannot be undone. This will permanently delete your account and remove all data from our servers.
                          </p>
                          <Alert variant="destructive">
                            <AlertTriangle className="h-4 w-4" />
                            <AlertDescription>
                              All your trading strategies, historical data, and account settings will be permanently lost.
                            </AlertDescription>
                          </Alert>
                          <div className="flex justify-end gap-2">
                            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
                              Cancel
                            </Button>
                            <Button 
                              variant="destructive" 
                              onClick={() => {
                                deleteAccountMutation.mutate();
                                setShowDeleteDialog(false);
                              }}
                              disabled={deleteAccountMutation.isPending}
                            >
                              {deleteAccountMutation.isPending ? "Deleting..." : "Delete Account"}
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
