import { useQuery } from "@tanstack/react-query";
import { useWebSocket } from "@/hooks/use-websocket";
import { useEffect, useState } from "react";
import Header from "@/components/layout/header";
import AccountOverview from "@/components/dashboard/account-overview";
import RiskStatus from "@/components/dashboard/risk-status";
import ActiveStrategies from "@/components/dashboard/active-strategies";
import RecentTrades from "@/components/dashboard/recent-trades";
import OpenPositions from "@/components/dashboard/open-positions";
import RecentAlerts from "@/components/dashboard/recent-alerts";
import { AITradingStatus } from "@/components/dashboard/ai-trading-status";

// Define the dashboard data interface
interface DashboardData {
  account: {
    balance: string;
    equity: string;
    dailyPnL: string;
    openPnL: string;
  };
  risk: any;
  strategies: any;
  openPositions: any[];
  recentTrades: any[];
  systemHealth: any[];
  alerts: any[];
  aiTradingStatus?: { // Assuming AI trading status might be part of the dashboard data
    status: string;
    lastTrade: string;
    profit: string;
  };
}

export default function Dashboard() {
  const { data: dashboardData, isLoading, error } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 5000, // Refetch every 5 seconds
    retry: 3,
    staleTime: 1000,
  });

  // WebSocket for real-time updates
  useWebSocket();

  console.log('Dashboard data:', dashboardData);
  console.log('Dashboard loading:', isLoading);
  console.log('Dashboard error:', error);

  const safeData = dashboardData || {
    account: { balance: "0", equity: "0", dailyPnL: "0", openPnL: "0" },
    risk: null,
    strategies: null,
    openPositions: [],
    recentTrades: [],
    systemHealth: [],
    alerts: [],
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive">Error loading dashboard: {error.message}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="mt-2 px-4 py-2 bg-primary text-white rounded"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header 
        title="" 
        description="" 
      />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        {/* Top Row - Overview Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          <AccountOverview data={safeData?.account} />
          <RiskStatus data={safeData?.risk} />
          <AITradingStatus aiStatus={safeData?.aiTradingStatus} />
        </div>

        {/* Middle Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <ActiveStrategies strategies={safeData?.strategies} openPositions={safeData?.openPositions || []} />
          <OpenPositions positions={safeData?.openPositions || []} />
        </div>

        {/* Bottom Row */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 md:gap-6">
          <RecentTrades trades={safeData?.recentTrades} />
          <RecentAlerts alerts={safeData?.alerts} />
        </div>
      </div>
    </div>
  );
}