import React, { useEffect } from "react";
import { ErrorBoundary } from "react-error-boundary";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "@/hooks/use-auth";
import { useWebSocket } from "@/hooks/use-websocket";
import { LiveChat } from "./components/support/live-chat";
import Sidebar from "@/components/layout/sidebar";
import Dashboard from "@/pages/dashboard";
import Strategies from "@/pages/strategies";
import Risk from "@/pages/risk";
import Backtests from "@/pages/backtests";
import Analytics from "@/pages/analytics";
import Logs from "@/pages/logs";
import AccountManagement from "./pages/account-management";
import Support from "./pages/support";
import AdminPanel from "./pages/admin";
import Login from "./pages/login";
import Settings from "./pages/settings";
import Signals from "./pages/signals";
import Brokers from "./pages/brokers";
import Telegram from "./pages/telegram";
import Audit from "./pages/audit";
import NotFound from "./pages/not-found";

function ErrorFallback({ error, resetErrorBoundary }: { error: Error; resetErrorBoundary: () => void }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold mb-4">Something went wrong</h1>
        <p className="text-muted-foreground mb-4">{error.message}</p>
        <button
          onClick={resetErrorBoundary}
          className="px-4 py-2 bg-primary text-primary-foreground rounded"
        >
          Try again
        </button>
      </div>
    </div>
  );
}


function AuthenticatedApp() {
  const { user } = useAuth();

  // Initialize WebSocket connection
  useWebSocket();

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex-1 overflow-y-auto">
          <Switch>
            <Route path="/" component={Dashboard} />
            <Route path="/strategies" component={Strategies} />
            <Route path="/signals" component={Signals} />
            <Route path="/risk" component={Risk} />
            <Route path="/backtests" component={Backtests} />
            <Route path="/analytics" component={Analytics} />
            <Route path="/logs" component={Logs} />
            <Route path="/brokers" component={Brokers} />
            <Route path="/telegram" component={Telegram} />
            <Route path="/audit" component={Audit} />
            <Route path="/account" component={AccountManagement} />
            <Route path="/settings" component={Settings} />
            <Route path="/support" component={Support} />
            <Route path="/admin" component={AdminPanel} />
            <Route component={NotFound} />
          </Switch>
        </div>
      </div>
    </div>
  );
}

function App() {
  // Initialize theme on app load
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    const root = window.document.documentElement;

    if (savedTheme === 'dark') {
      root.classList.add('dark');
    } else if (savedTheme === 'light') {
      root.classList.remove('dark');
    } else {
      // System theme
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
      const handleChange = (e: MediaQueryListEvent) => {
        if (e.matches) {
          root.classList.add('dark');
        } else {
          root.classList.remove('dark');
        }
      };

      mediaQuery.addEventListener('change', handleChange);
      if (mediaQuery.matches) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }

      return () => mediaQuery.removeEventListener('change', handleChange);
    }
  }, []);

  return (
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onError={(error, errorInfo) => {
        console.error('App Error:', error, errorInfo);
      }}
    >
      <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <div className="min-h-screen bg-background text-foreground">
              <Toaster />
              <AuthenticatedApp />
              <LiveChat />
            </div>
          </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;