
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertBacktestSchema, type Backtest, type Strategy } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { z } from "zod";

const backtestFormSchema = insertBacktestSchema.extend({
  parametersJson: z.string().min(1, "Parameters are required"),
});

type BacktestFormData = z.infer<typeof backtestFormSchema>;

export default function Backtests() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedBacktest, setSelectedBacktest] = useState<any>(null);
  const { toast } = useToast();

  const { data: backtests, isLoading } = useQuery<Backtest[]>({
    queryKey: ["/api/backtests"],
  });

  const { data: strategies } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: BacktestFormData) => {
      const backtestData = {
        ...data,
        parameters: JSON.parse(data.parametersJson),
      };
      delete (backtestData as any).parametersJson;
      
      return apiRequest("POST", "/api/backtests", backtestData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/backtests"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Backtest started successfully" });
    },
    onError: () => {
      toast({ title: "Failed to start backtest", variant: "destructive" });
    },
  });

  const form = useForm<BacktestFormData>({
    resolver: zodResolver(backtestFormSchema),
    defaultValues: {
      name: "",
      strategyId: "",
      startDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year ago
      endDate: new Date(),
      parametersJson: JSON.stringify({
        initialBalance: 100000,
        commission: 0.00002,
        spread: 0.0001
      }, null, 2),
    },
  });

  const onSubmit = (data: BacktestFormData) => {
    createMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const variant = status === "COMPLETED" ? "default" : 
                   status === "RUNNING" ? "secondary" :
                   status === "FAILED" ? "destructive" : "outline";
    return <Badge variant={variant}>{status}</Badge>;
  };

  const formatMetric = (value: number | undefined, suffix = "", decimals = 2) => {
    if (value === undefined) return "--";
    return `${value.toFixed(decimals)}${suffix}`;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading backtests...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header title="Backtests" description="Run and analyze strategy performance" />
      
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Strategy Backtests</h3>
            <p className="text-muted-foreground">Test strategies against historical data</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-backtest">
                <i className="fas fa-play mr-2"></i>
                Run Backtest
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Backtest</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Backtest Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Q4 2024 Test" {...field} data-testid="input-backtest-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="strategyId"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Strategy</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-strategy">
                                <SelectValue placeholder="Select strategy" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {strategies?.map((strategy: any) => (
                                <SelectItem key={strategy.id} value={strategy.id}>
                                  {strategy.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="startDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Start Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                  data-testid="button-start-date"
                                >
                                  <i className="fas fa-calendar mr-2"></i>
                                  {field.value ? format(field.value, "PPP") : "Pick start date"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="endDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>End Date</FormLabel>
                          <Popover>
                            <PopoverTrigger asChild>
                              <FormControl>
                                <Button
                                  variant="outline"
                                  className="w-full justify-start text-left font-normal"
                                  data-testid="button-end-date"
                                >
                                  <i className="fas fa-calendar mr-2"></i>
                                  {field.value ? format(field.value, "PPP") : "Pick end date"}
                                </Button>
                              </FormControl>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={field.value}
                                onSelect={field.onChange}
                                disabled={(date) => date > new Date()}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="parametersJson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Backtest Parameters (JSON)</FormLabel>
                        <FormControl>
                          <textarea 
                            placeholder="Backtest configuration in JSON format" 
                            className="w-full min-h-[120px] p-3 border rounded-md bg-background font-mono text-sm"
                            {...field} 
                            data-testid="input-backtest-parameters"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <div className="flex justify-between">
                    <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-backtest">
                      {createMutation.isPending ? "Starting..." : "Start Backtest"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Backtest Results */}
        <div className="grid gap-6">
          {backtests && backtests.length > 0 ? backtests.map((backtest: any, index: number) => (
            <Card key={backtest.id} data-testid={`backtest-card-${index}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <CardTitle data-testid={`backtest-name-${index}`}>{backtest.name}</CardTitle>
                      {getStatusBadge(backtest.status)}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span data-testid={`backtest-dates-${index}`}>
                        {format(new Date(backtest.startDate), "MMM dd, yyyy")} - {format(new Date(backtest.endDate), "MMM dd, yyyy")}
                      </span>
                      <span data-testid={`backtest-created-${index}`}>
                        Created {format(new Date(backtest.createdAt), "MMM dd, yyyy")}
                      </span>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => setSelectedBacktest(backtest)}
                      data-testid={`button-view-backtest-${index}`}
                    >
                      <i className="fas fa-eye mr-2"></i>
                      View Details
                    </Button>
                    {backtest.status === "COMPLETED" && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        data-testid={`button-download-backtest-${index}`}
                      >
                        <i className="fas fa-download"></i>
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {backtest.status === "COMPLETED" && backtest.metrics ? (
                  <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Return</p>
                      <p className={`text-lg font-bold ${backtest.metrics.totalReturn >= 0 ? 'text-green-600' : 'text-red-600'}`} data-testid={`backtest-return-${index}`}>
                        {formatMetric(backtest.metrics.totalReturn, "%")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Sharpe Ratio</p>
                      <p className="text-lg font-bold" data-testid={`backtest-sharpe-${index}`}>
                        {formatMetric(backtest.metrics.sharpeRatio)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Max Drawdown</p>
                      <p className="text-lg font-bold text-red-600" data-testid={`backtest-drawdown-${index}`}>
                        {formatMetric(Math.abs(backtest.metrics.maxDrawdown), "%")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Win Rate</p>
                      <p className="text-lg font-bold" data-testid={`backtest-winrate-${index}`}>
                        {formatMetric(backtest.metrics.winRate, "%")}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Profit Factor</p>
                      <p className="text-lg font-bold" data-testid={`backtest-profit-factor-${index}`}>
                        {formatMetric(backtest.metrics.profitFactor)}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Total Trades</p>
                      <p className="text-lg font-bold" data-testid={`backtest-trades-${index}`}>
                        {backtest.metrics.totalTrades || 0}
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-sm text-muted-foreground">Avg Trade</p>
                      <p className="text-lg font-bold font-mono" data-testid={`backtest-avg-trade-${index}`}>
                        ${formatMetric(backtest.metrics.avgTrade)}
                      </p>
                    </div>
                  </div>
                ) : backtest.status === "RUNNING" ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                      <p className="text-muted-foreground">Backtest in progress...</p>
                    </div>
                  </div>
                ) : backtest.status === "FAILED" ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <i className="fas fa-exclamation-triangle text-destructive text-4xl mb-4"></i>
                      <p className="text-destructive">Backtest failed to complete</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <i className="fas fa-clock text-muted-foreground text-4xl mb-4"></i>
                      <p className="text-muted-foreground">Backtest queued for execution</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )) : (
            <Card>
              <CardContent className="p-8 text-center">
                <i className="fas fa-history text-4xl text-muted-foreground mb-4"></i>
                <h3 className="text-lg font-semibold mb-2">No Backtests Found</h3>
                <p className="text-muted-foreground mb-4">
                  Run your first backtest to analyze strategy performance
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-backtest">
                  <i className="fas fa-play mr-2"></i>
                  Run Backtest
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
