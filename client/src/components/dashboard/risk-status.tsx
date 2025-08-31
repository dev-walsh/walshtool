import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RiskData {
  dailyDrawdown: number;
  dailyDrawdownPercent: number;
  maxDrawdown: number;
  totalExposure: number;
}

interface RiskStatusProps {
  data: RiskData;
}

export default function RiskStatus({ data }: RiskStatusProps) {
  if (!data) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Risk Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-muted-foreground">Loading risk data...</div>
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle>Risk Status</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full status-online" data-testid="risk-status-indicator"></div>
            <span className="text-sm profit">All Systems Normal</span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-4">
            <h4 className="font-medium">Daily Loss Limit</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Used</span>
                <span className="font-mono" data-testid="daily-loss-used">$1,250 / $5,000</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-warning h-2 rounded-full transition-all duration-300" 
                  style={{ width: "25%" }}
                  data-testid="daily-loss-progress"
                ></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">Max Drawdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Current</span>
                <span className="font-mono" data-testid="max-drawdown">-{data.maxDrawdown.toFixed(1)}% / -15%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-profit h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(data.maxDrawdown / 15) * 100}%` }}
                  data-testid="max-drawdown-progress"
                ></div>
              </div>
            </div>
          </div>
          
          <div className="space-y-4">
            <h4 className="font-medium">Position Exposure</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Total</span>
                <span className="font-mono" data-testid="total-exposure">
                  ${Math.floor(data.totalExposure).toLocaleString()} / $75,000
                </span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div 
                  className="bg-primary h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${(data.totalExposure / 75000) * 100}%` }}
                  data-testid="exposure-progress"
                ></div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
