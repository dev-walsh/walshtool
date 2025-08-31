import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import Header from "@/components/layout/header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { insertStrategySchema, type Strategy } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { z } from "zod";

const strategyFormSchema = insertStrategySchema.extend({
  symbols: z.string().min(1, "At least one symbol is required"),
  parametersJson: z.string().min(1, "Parameters are required"),
  riskProfileJson: z.string().optional(),
});

type StrategyFormData = z.infer<typeof strategyFormSchema>;

export default function Strategies() {
  const [selectedStrategy, setSelectedStrategy] = useState<Strategy | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const { toast } = useToast();

  const { data: strategies, isLoading } = useQuery<Strategy[]>({
    queryKey: ["/api/strategies"],
  });

  const createMutation = useMutation({
    mutationFn: async (data: StrategyFormData) => {
      const strategyData = {
        ...data,
        symbols: data.symbols.split(",").map(s => s.trim()),
        parameters: JSON.parse(data.parametersJson),
        riskProfile: data.riskProfileJson ? JSON.parse(data.riskProfileJson) : null,
      };
      delete (strategyData as any).parametersJson;
      delete (strategyData as any).riskProfileJson;
      
      return apiRequest("POST", "/api/strategies", strategyData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      setIsCreateDialogOpen(false);
      toast({ title: "Strategy created successfully" });
    },
    onError: () => {
      toast({ title: "Failed to create strategy", variant: "destructive" });
    },
  });

  const startMutation = useMutation({
    mutationFn: (strategyId: string) => apiRequest("POST", `/api/strategies/${strategyId}/start`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({ title: "Strategy started" });
    },
    onError: () => {
      toast({ title: "Failed to start strategy", variant: "destructive" });
    },
  });

  const stopMutation = useMutation({
    mutationFn: (strategyId: string) => apiRequest("POST", `/api/strategies/${strategyId}/stop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
      toast({ title: "Strategy stopped" });
    },
    onError: () => {
      toast({ title: "Failed to stop strategy", variant: "destructive" });
    },
  });

  const form = useForm<StrategyFormData>({
    resolver: zodResolver(strategyFormSchema),
    defaultValues: {
      name: "",
      description: "",
      symbols: "",
      parametersJson: JSON.stringify({
        donchianPeriod: 20,
        atrPeriod: 14,
        riskPercent: 1.0
      }, null, 2),
      riskProfileJson: JSON.stringify({
        maxPositions: 5,
        maxDailyLoss: 1000
      }, null, 2),
      status: "STOPPED",
      isEnabled: false,
    },
  });

  const onSubmit = (data: StrategyFormData) => {
    createMutation.mutate(data);
  };

  const getStatusBadge = (status: string) => {
    const variant = status === "RUNNING" ? "default" : 
                   status === "ERROR" ? "destructive" : "secondary";
    return <Badge variant={variant} data-testid={`strategy-status-${status.toLowerCase()}`}>{status}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading strategies...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <Header title="Strategies" description="Manage and monitor trading strategies" />
      
      <div className="p-6 space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-semibold">Active Strategies</h3>
            <p className="text-muted-foreground">Configure and monitor your automated trading strategies</p>
          </div>
          
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-create-strategy">
                <i className="fas fa-plus mr-2"></i>
                Create Strategy
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create New Strategy</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Strategy Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g., Breakout Volatility" {...field} data-testid="input-strategy-name" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="symbols"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Trading Symbols</FormLabel>
                          <FormControl>
                            <Input placeholder="EURUSD, GBPUSD" {...field} data-testid="input-strategy-symbols" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Strategy description..." {...field} value={field.value || ""} data-testid="input-strategy-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="parametersJson"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Parameters (JSON)</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Strategy parameters in JSON format" 
                            className="font-mono"
                            rows={6}
                            {...field} 
                            data-testid="input-strategy-parameters"
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
                    <Button type="submit" disabled={createMutation.isPending} data-testid="button-submit-strategy">
                      {createMutation.isPending ? "Creating..." : "Create Strategy"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-6">
          {strategies?.map((strategy: Strategy, index: number) => (
            <Card key={strategy.id} data-testid={`strategy-card-${index}`}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-3">
                      <CardTitle data-testid={`strategy-name-${index}`}>{strategy.name}</CardTitle>
                      {getStatusBadge(strategy.status)}
                    </div>
                    <p className="text-muted-foreground" data-testid={`strategy-description-${index}`}>
                      {strategy.description}
                    </p>
                  </div>
                  <div className="flex space-x-2">
                    {strategy.status === "RUNNING" ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => stopMutation.mutate(strategy.id)}
                        disabled={stopMutation.isPending}
                        data-testid={`button-stop-strategy-${index}`}
                      >
                        <i className="fas fa-stop mr-2"></i>
                        Stop
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => startMutation.mutate(strategy.id)}
                        disabled={startMutation.isPending}
                        data-testid={`button-start-strategy-${index}`}
                      >
                        <i className="fas fa-play mr-2"></i>
                        Start
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setSelectedStrategy(strategy)}
                      data-testid={`button-edit-strategy-${index}`}
                    >
                      <i className="fas fa-edit"></i>
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Symbols</p>
                    <p className="font-mono" data-testid={`strategy-symbols-${index}`}>
                      {strategy.symbols.join(", ")}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Version</p>
                    <p data-testid={`strategy-version-${index}`}>{strategy.version}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Last Updated</p>
                    <p data-testid={`strategy-updated-${index}`}>
                      {new Date(strategy.updatedAt || "").toLocaleDateString()}
                    </p>
                  </div>
                </div>
                
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground mb-2">Parameters</p>
                  <pre className="text-xs bg-muted p-3 rounded overflow-x-auto" data-testid={`strategy-parameters-${index}`}>
                    {JSON.stringify(strategy.parameters, null, 2)}
                  </pre>
                </div>
              </CardContent>
            </Card>
          )) || (
            <Card>
              <CardContent className="p-8 text-center">
                <i className="fas fa-brain text-4xl text-muted-foreground mb-4"></i>
                <h3 className="text-lg font-semibold mb-2">No Strategies Found</h3>
                <p className="text-muted-foreground mb-4">
                  Create your first trading strategy to get started
                </p>
                <Button onClick={() => setIsCreateDialogOpen(true)} data-testid="button-create-first-strategy">
                  <i className="fas fa-plus mr-2"></i>
                  Create Strategy
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
