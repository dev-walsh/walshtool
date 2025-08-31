import { useQuery } from "@tanstack/react-query";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useState } from "react";
import { type Account, type SystemStatus } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

const brokerFormSchema = z.object({
  brokerId: z.string().min(1, "Broker ID is required"),
  login: z.string().min(1, "MT5 Login is required"),
  password: z.string().min(1, "MT5 Password is required"),
  server: z.string().min(1, "MT5 Server is required"),
  mode: z.enum(["live", "demo"]),
});

type BrokerFormData = z.infer<typeof brokerFormSchema>;

export default function Brokers() {
  const { toast } = useToast();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isRemoteConfigOpen, setIsRemoteConfigOpen] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [accountInfo, setAccountInfo] = useState<Account[]>([]);
  const [remoteHost, setRemoteHost] = useState("");
  const [remotePort, setRemotePort] = useState("8765");

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: brokerConnections, isLoading: isLoadingConnections } = useQuery({
    queryKey: ["/api/brokers/connections"],
    refetchInterval: 10000,
  });

  const { data: ctraderAccounts } = useQuery({
    queryKey: ["/api/brokers/ctrader/accounts"],
    refetchInterval: 10000,
  });

  const { data: systemHealth } = useQuery<SystemStatus[]>({
    queryKey: ["/api/system/status"],
    refetchInterval: 5000,
  });

  const form = useForm<BrokerFormData>({
    resolver: zodResolver(brokerFormSchema),
    defaultValues: {
      brokerId: "mt5",
      login: "",
      password: "",
      server: "",
      mode: "demo",
    },
  });

  const onSubmit = async (values: z.infer<typeof brokerFormSchema>) => {
    try {
      setConnecting(true);
      console.log("Submitting MT5 connection with values:", values);

      const response = await fetch("/api/brokers/mt5/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          login: values.login,
          password: values.password,
          server: values.server,
          mode: values.mode,
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        console.log("Successfully connected to MT5");
        toast({
          title: "Connection Successful",
          description: "Successfully connected to MT5 broker.",
        });
        setIsCreateDialogOpen(false);
        form.reset();
        await fetchAccountInfo(); // Refresh account info
      } else {
        console.error("Failed to connect to MT5:", result.error || result);
        toast({
          title: "Connection Failed",
          description: result.error || 'Failed to connect to MT5. Please check your credentials.',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Connection error:", error);
      toast({
        title: "Connection Error",
        description: error.message || 'Network error occurred. Please try again.',
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variant = status === "ONLINE" ? "default" :
                   status === "WARNING" ? "secondary" : "destructive";
    return <Badge variant={variant}>{status}</Badge>;
  };

  const displayConnections = [
    {
      name: "MT5",
      type: "MT5 Integration",
      status: "ONLINE", // Placeholder, will be updated by fetchAccountInfo
      latency: "15ms", // Placeholder
      lastTick: "Live", // Placeholder
      accountCount: accountInfo.length,
      totalBalance: accountInfo.reduce((total, acc) => total + (acc.balance || 0), 0),
      currency: accountInfo.length > 0 ? accountInfo[0].currency : 'USD'
    }
  ];

  const fetchAccountInfo = async () => {
    try {
      const response = await fetch('/api/brokers/mt5/account');
      const account = await response.json();

      if (account && account.login) {
        setAccountInfo([{
          id: account.login.toString(),
          broker: 'MT5',
          mode: 'LIVE', // Assuming live mode for fetched accounts
          balance: account.balance,
          equity: account.equity,
          currency: account.currency,
          status: 'Active' // Assuming active status for fetched accounts
        }]);
        setIsConnected(true); // Set connected state based on fetched account info
      } else {
        setIsConnected(false); // Ensure disconnected state if no account info
        setAccountInfo([]); // Clear account info if no account found
      }
    } catch (error) {
      console.error('Error fetching account info:', error);
      setIsConnected(false); // Set disconnected state on error
      setAccountInfo([]); // Clear account info on error
    }
  };

  // Initial fetch for account info when component mounts
  useState(() => {
    fetchAccountInfo();
  }, []);

  const downloadMT5Bridge = async () => {
    try {
      const response = await fetch('/api/brokers/mt5/download-bridge');
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'mt5_bridge_server.py';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast({
          title: "Download Started",
          description: "MT5 Bridge Server file has been downloaded successfully.",
        });
      } else {
        throw new Error('Failed to download file');
      }
    } catch (error) {
      console.error('Download error:', error);
      toast({
        title: "Download Failed",
        description: "Failed to download MT5 Bridge Server file. Please try again.",
        variant: "destructive",
      });
    }
  };

  const configureRemoteConnection = async () => {
    try {
      if (!remoteHost || !remotePort) {
        toast({
          title: "Invalid Input",
          description: "Please enter both host and port.",
          variant: "destructive",
        });
        return;
      }

      setConnecting(true);
      const response = await fetch('/api/brokers/mt5/configure-remote', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          host: remoteHost,
          port: parseInt(remotePort),
        }),
      });

      const result = await response.json();

      if (response.ok && result.success) {
        toast({
          title: "Remote Connection Configured",
          description: "Successfully configured remote MT5 connection. You can now test the connection.",
        });
        setIsRemoteConfigOpen(false);
        await fetchAccountInfo(); // Test connection immediately
      } else {
        toast({
          title: "Configuration Failed",
          description: result.error || 'Failed to configure remote connection.',
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Remote config error:', error);
      toast({
        title: "Configuration Error",
        description: "Network error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setConnecting(false);
    }
  };


  if (isLoading || isLoadingConnections) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading broker data...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header title="Brokers" description="Manage broker connections and trading accounts" />

      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Broker Connections</h3>
            <p className="text-muted-foreground">Monitor and configure your broker integrations</p>
          </div>

          <div className="flex gap-2">
            <Dialog open={isRemoteConfigOpen} onOpenChange={setIsRemoteConfigOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" data-testid="button-configure-remote">
                  <i className="fas fa-cog mr-2"></i>
                  Configure Remote MT5
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Configure Remote MT5 Connection</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="remote-host">Host/IP Address</Label>
                    <Input
                      id="remote-host"
                      type="text"
                      placeholder="Enter your external IP or domain"
                      value={remoteHost}
                      onChange={(e) => setRemoteHost(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label htmlFor="remote-port">Port</Label>
                    <Input
                      id="remote-port"
                      type="number"
                      placeholder="8765"
                      value={remotePort}
                      onChange={(e) => setRemotePort(e.target.value)}
                    />
                  </div>
                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setIsRemoteConfigOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={configureRemoteConnection} disabled={connecting}>
                      {connecting ? "Configuring..." : "Configure Connection"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button data-testid="button-add-broker" onClick={() => {
                  form.reset(); // Reset form when opening dialog
                  setIsCreateDialogOpen(true);
                }}>
                  <i className="fas fa-plug mr-2"></i>
                  Connect MT5
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Connect to MT5</DialogTitle>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="brokerId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Broker</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value} disabled>
                            <FormControl>
                              <SelectTrigger data-testid="select-broker">
                                <SelectValue placeholder="MT5" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="mt5">MT5</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="login"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Login/Account Number</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="Enter MT5 account number"
                              {...field}
                              data-testid="input-login"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input
                              type="password"
                              placeholder="Enter MT5 password"
                              {...field}
                              data-testid="input-password"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="server"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Server</FormLabel>
                          <FormControl>
                            <Input
                              type="text"
                              placeholder="e.g., MetaQuotes-Demo or your broker's server"
                              {...field}
                              data-testid="input-server"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="mode"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Account Type</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-account-mode">
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="demo">Demo Account</SelectItem>
                              <SelectItem value="live">Live Account</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="bg-muted p-3 rounded-md">
                      <p className="text-sm text-muted-foreground">
                        <strong>Note:</strong> Make sure you have configured the remote MT5 connection first using the "Configure Remote MT5" button above, and that your MT5 bridge server is running on your home PC.
                      </p>
                    </div>

                    <div className="flex justify-between">
                      <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button type="submit" data-testid="button-submit-broker" disabled={connecting}>
                        {connecting ? "Connecting..." : "Connect to MT5"}
                      </Button>
                    </div>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Broker Status Cards */}
        <div className="grid gap-6">
          {displayConnections.map((broker, index) => (
            <Card key={broker.name} data-testid={`broker-card-${index}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      isConnected ? "status-online" : "status-offline" // Use isConnected state
                    }`}></div>
                    <div>
                      <CardTitle data-testid={`broker-name-${index}`}>{broker.name}</CardTitle>
                      <p className="text-sm text-muted-foreground" data-testid={`broker-type-${index}`}>
                        {broker.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(isConnected ? "ONLINE" : "OFFLINE")}
                    <Button variant="outline" size="sm" data-testid={`button-test-connection-${index}`} onClick={fetchAccountInfo} disabled={connecting}>
                      <i className="fas fa-plug mr-2"></i>
                      Test Connection
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => downloadMT5Bridge()} data-testid={`button-download-bridge-${index}`}>
                      <i className="fas fa-download mr-2"></i>
                      Download MT5 Bridge
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Connected Accounts</p>
                    <p className="font-mono" data-testid={`broker-account-${index}`}>
                      {broker.accountCount} accounts
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Balance</p>
                    <p className="font-mono" data-testid={`broker-balance-${index}`}>
                      {broker.accountCount > 0
                        ? `$${broker.totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${broker.currency}`
                        : "--"
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Latency</p>
                    <p className={`font-mono ${broker.latency === "--" ? "warning" : "profit"}`} data-testid={`broker-latency-${index}`}>
                      {broker.latency}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Tick</p>
                    <p className="font-mono" data-testid={`broker-last-tick-${index}`}>{broker.lastTick}</p>
                  </div>
                </div>

                {/* Removed warning and offline specific messages as we are now using general connection status */}

              </CardContent>
            </Card>
          ))}
        </div>

        {/* Account Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Account Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted">
                  <tr className="text-left text-sm text-muted-foreground">
                    <th className="p-4">Account</th>
                    <th className="p-4">Broker</th>
                    <th className="p-4">Mode</th>
                    <th className="p-4">Balance</th>
                    <th className="p-4">Equity</th>
                    <th className="p-4">Currency</th>
                    <th className="p-4">Status</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {accountInfo && accountInfo.length > 0 ? accountInfo.map((account: any, index: number) => (
                    <tr key={account.id} className="border-b border-border" data-testid={`account-row-${index}`}>
                      <td className="p-4 font-mono" data-testid={`account-number-${index}`}>
                        {account.id} {/* Use account.id which is the login number */}
                      </td>
                      <td className="p-4" data-testid={`account-broker-${index}`}>
                        {account.broker}
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" data-testid={`account-mode-${index}`}>
                          {account.mode.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-4 font-mono" data-testid={`account-balance-${index}`}>
                        ${parseFloat(account.balance).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4 font-mono" data-testid={`account-equity-${index}`}>
                        ${parseFloat(account.equity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="p-4" data-testid={`account-currency-${index}`}>
                        {account.currency}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <Badge variant={account.status === "Active" ? "default" : "secondary"} data-testid={`account-status-${index}`}>
                            {account.status}
                          </Badge>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No MT5 accounts connected. Use the "Connect MT5" button above to add your account.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}