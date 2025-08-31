import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useState, useEffect } from "react";
import {
  Home,
  TrendingUp,
  Shield,
  Building2,
  History,
  FileText,
  MessageSquare,
  BarChart3,
  Search,
  Zap,
  Menu,
  X,
  LogOut,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useSidebar } from "@/components/ui/sidebar";
import { useMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/hooks/use-auth";

const Sidebar = () => {
  const [location] = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const { user, logout } = useAuth();

  const handleLogout = () => {
    logout();
  };

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const NavigationItems = () => (
    <>
      <Link href="/">
        <div className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
          location === "/" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}>
          <Home className="h-5 w-5" />
          <span>Dashboard</span>
        </div>
      </Link>

      <Link href="/strategies">
        <div className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
          location === "/strategies" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}>
          <TrendingUp className="h-5 w-5" />
          <span>Strategies</span>
        </div>
      </Link>

      <Link href="/risk">
        <div className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
          location === "/risk" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}>
          <Shield className="h-5 w-5" />
          <span>Risk Management</span>
        </div>
      </Link>

      <Link href="/brokers">
        <div className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
          location === "/brokers" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}>
          <Building2 className="h-5 w-5" />
          <span>Brokers</span>
        </div>
      </Link>

      <Link href="/backtests">
        <div className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
          location === "/backtests" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}>
          <History className="h-5 w-5" />
          <span>Backtests</span>
        </div>
      </Link>

      <Link href="/analytics">
        <div className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
          location === "/analytics" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}>
          <BarChart3 className="h-5 w-5" />
          <span>Analytics</span>
        </div>
      </Link>

      <Link href="/logs">
        <div className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
          location === "/logs" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}>
          <FileText className="h-5 w-5" />
          <span>Logs & Alerts</span>
        </div>
      </Link>

      <Link href="/audit">
        <div className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
          location === "/audit" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}>
          <Search className="h-5 w-5" />
          <span>Audit</span>
        </div>
      </Link>

      <Link href="/signals">
        <div className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
          location === "/signals" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}>
          <Zap className="h-5 w-5" />
          <span>Trading Signals</span>
        </div>
      </Link>

      <Link href="/telegram">
        <div className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
          location === "/telegram" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}>
          <MessageSquare className="h-5 w-5" />
          <span>Telegram Bot</span>
        </div>
      </Link>

      <div className="border-t border-border my-4"></div>

      <Link href="/settings">
        <div className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
          location === "/settings" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}>
          <i className="fas fa-cog h-5 w-5"></i>
          <span>Settings</span>
        </div>
      </Link>
      <Link href="/account">
        <div className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
          location === "/account" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}>
          <User className="h-5 w-5" />
          <span>Account Management</span>
        </div>
      </Link>
      <Link href="/support">
        <div className={cn(
          "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
          location === "/support" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
        )}>
          <MessageSquare className="h-5 w-5" />
          <span>Support</span>
        </div>
      </Link>
      {user?.role === "admin" && (
        <Link href="/admin">
          <div className={cn(
            "flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors cursor-pointer",
            location === "/admin" ? "bg-primary text-primary-foreground" : "hover:bg-muted text-muted-foreground hover:text-foreground"
          )}>
            <Shield className="h-5 w-5" />
            <span>Admin Panel</span>
          </div>
        </Link>
      )}
    </>
  );

  if (isMobile) {
    return (
      <>
        {/* Mobile Header */}
        <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b border-border px-4 py-3 flex items-center justify-between">
          <h1 className="text-lg font-semibold">Trading Bot</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          >
            {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-40 bg-black bg-opacity-50" onClick={() => setIsMobileMenuOpen(false)} />
        )}

        {/* Mobile Sidebar */}
        <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
          <SheetContent side="left" className="w-72 p-0 border-r-0 bg-background">
            <ScrollArea className="h-[calc(100vh-1rem)] w-full">
              <div className="flex flex-col h-full">
                <div className="flex items-center gap-2 px-4 py-6 border-b">
                  <TrendingUp className="h-6 w-6 text-primary" />
                  <span className="font-bold text-lg">TradingBot</span>
                </div>

                <div className="px-4 py-3 border-b bg-muted/20">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{user?.username}</p>
                      <p className="text-xs text-muted-foreground truncate">{user?.role}</p>
                    </div>
                  </div>
                </div>

                <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                  <NavigationItems />
                </nav>

                <div className="p-4 border-t">
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full justify-start text-muted-foreground hover:text-foreground"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </ScrollArea>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside className="w-64 bg-card border-r border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
            <i className="fas fa-robot text-primary-foreground text-sm"></i>
          </div>
          <div>
            <h1 className="text-lg font-semibold">FX TradingBot</h1>
            <p className="text-xs text-muted-foreground">Control Panel</p>
          </div>
        </div>
      </div>

      <ScrollArea className="h-[calc(100vh-6rem)] w-full">
        <nav className="p-4 space-y-2">
          <NavigationItems />
        </nav>

        <div className="p-4 border-t">
          <Button
            variant="ghost"
            onClick={handleLogout}
            className="w-full justify-start text-muted-foreground hover:text-foreground"
          >
            <LogOut className="mr-3 h-4 w-4" />
            Logout
          </Button>
        </div>
      </ScrollArea>
    </aside>
  );
};

export default Sidebar;