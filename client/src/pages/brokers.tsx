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

const brokerFormSchema = z.object({
  brokerId: z.string().min(1, "Broker ID is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  mode: z.enum(["live", "paper", "backtest"]),
  baseCurrency: z.string().default("USD"),
  leverage: z.string().default("100"),
});

type BrokerFormData = z.infer<typeof brokerFormSchema>;

export default function Brokers() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const { data: accounts, isLoading } = useQuery<Account[]>({
    queryKey: ["/api/accounts"],
  });

  const { data: brokerConnections, isLoading: isLoadingConnections } = useQuery({
    queryKey: ["/api/brokers/connections"],
    refetchInterval: 10000,
  });

  const { data: systemHealth } = useQuery<SystemStatus[]>({
    queryKey: ["/api/system/status"],
    refetchInterval: 5000,
  });

  const form = useForm<BrokerFormData>({
    resolver: zodResolver(brokerFormSchema),
    defaultValues: {
      brokerId: "",
      accountNumber: "",
      mode: "paper",
      baseCurrency: "USD",
      leverage: "100",
    },
  });

  const onSubmit = async (data: BrokerFormData) => {
    // This would create a new broker account
    console.log("Creating broker account:", data);
    setIsCreateDialogOpen(false);
  };

  const getStatusBadge = (status: string) => {
    const variant = status === "ONLINE" ? "default" : 
                   status === "WARNING" ? "secondary" : "destructive";
    return <Badge variant={variant}>{status}</Badge>;
  };

  const displayConnections = brokerConnections || [
    {
      name: "OANDA (Demo)",
      type: "REST API",
      status: "ONLINE",
      latency: "23ms",
      lastTick: "14:35:42",
      account: "101-004-12345-001",
      balance: "$50,000.00"
    },
    {
      name: "MT5 Bridge",
      type: "Bridge Connection",
      status: "WARNING",
      latency: "--",
      lastTick: "14:33:15",
      account: "12345678",
      balance: "$100,000.00"
    },
    {
      name: "Interactive Brokers",
      type: "TWS Gateway",
      status: "OFFLINE",
      latency: "--",
      lastTick: "--",
      account: "Not Connected",
      balance: "--"
    }
  ];

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
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-broker">
                <i className="fas fa-plus mr-2"></i>
                Add Broker
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Broker Account</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="brokerId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Broker</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-broker">
                              <SelectValue placeholder="Select a broker" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="oanda">OANDA</SelectItem>
                            <SelectItem value="mt5">MetaTrader 5</SelectItem>
                            <SelectItem value="ibkr">Interactive Brokers</SelectItem>
                            <SelectItem value="ctrader">cTrader</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="accountNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Account Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter account number" {...field} data-testid="input-account-number" />
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
                        <FormLabel>Account Mode</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-account-mode">
                              <SelectValue />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="paper">Paper Trading</SelectItem>
                            <SelectItem value="live">Live Trading</SelectItem>
                            <SelectItem value="backtest">Backtesting Only</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="baseCurrency"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Base Currency</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-base-currency" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="leverage"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Leverage</FormLabel>
                          <FormControl>
                            <Input {...field} data-testid="input-leverage" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" data-testid="button-submit-broker">
                      Add Account
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Broker Status Cards */}
        <div className="grid gap-6">
          {displayConnections.map((broker, index) => (
            <Card key={broker.name} data-testid={`broker-card-${index}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-3 h-3 rounded-full ${
                      broker.status === "ONLINE" ? "status-online" :
                      broker.status === "WARNING" ? "status-warning" :
                      "status-offline"
                    }`}></div>
                    <div>
                      <CardTitle data-testid={`broker-name-${index}`}>{broker.name}</CardTitle>
                      <p className="text-sm text-muted-foreground" data-testid={`broker-type-${index}`}>
                        {broker.type}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    {getStatusBadge(broker.status)}
                    <Button variant="outline" size="sm" data-testid={`button-test-connection-${index}`}>
                      <i className="fas fa-plug mr-2"></i>
                      Test Connection
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Account</p>
                    <p className="font-mono" data-testid={`broker-account-${index}`}>{broker.account}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Balance</p>
                    <p className="font-mono" data-testid={`broker-balance-${index}`}>{broker.balance}</p>
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
                
                {broker.status === "WARNING" && (
                  <div className="mt-4 p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <i className="fas fa-exclamation-triangle text-warning"></i>
                      <p className="text-sm">Experiencing intermittent connection issues. Auto-reconnecting...</p>
                    </div>
                  </div>
                )}
                
                {broker.status === "OFFLINE" && (
                  <div className="mt-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <i className="fas fa-times-circle text-destructive"></i>
                        <p className="text-sm">Connection failed. Check credentials and network.</p>
                      </div>
                      <Button variant="outline" size="sm" data-testid={`button-reconnect-${index}`}>
                        Reconnect
                      </Button>
                    </div>
                  </div>
                )}
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
                  {accounts?.map((account: any, index: number) => (
                    <tr key={account.id} className="border-b border-border" data-testid={`account-row-${index}`}>
                      <td className="p-4 font-mono" data-testid={`account-number-${index}`}>
                        {account.accountNumber}
                      </td>
                      <td className="p-4" data-testid={`account-broker-${index}`}>
                        {account.brokerId.toUpperCase()}
                      </td>
                      <td className="p-4">
                        <Badge variant="secondary" data-testid={`account-mode-${index}`}>
                          {account.mode.toUpperCase()}
                        </Badge>
                      </td>
                      <td className="p-4 font-mono" data-testid={`account-balance-${index}`}>
                        ${parseFloat(account.balance).toLocaleString()}
                      </td>
                      <td className="p-4 font-mono" data-testid={`account-equity-${index}`}>
                        ${parseFloat(account.equity).toLocaleString()}
                      </td>
                      <td className="p-4" data-testid={`account-currency-${index}`}>
                        {account.baseCurrency}
                      </td>
                      <td className="p-4">
                        <Badge variant={account.isActive ? "default" : "secondary"} data-testid={`account-status-${index}`}>
                          {account.isActive ? "Active" : "Inactive"}
                        </Badge>
                      </td>
                    </tr>
                  )) || (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-muted-foreground">
                        No broker accounts configured
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
