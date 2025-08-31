import React from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "wouter";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

interface HeaderProps {
  title: string;
  description: string;
}

export default function Header({ title, description }: HeaderProps) {
  const { toast } = useToast();
  const { user, logout } = useAuth();

  const handleEmergencyStop = async () => {
    if (!confirm('Are you sure you want to trigger emergency stop? This will close all positions and halt trading.')) {
      return;
    }

    try {
      await apiRequest("POST", "/api/risk/emergency-stop");
      toast({
        title: "Emergency Stop Activated",
        description: "All trading has been halted and positions are being closed.",
        variant: "destructive",
      });
    } catch (error) {
      toast({
        title: "Emergency Stop Failed",
        description: "Failed to activate emergency stop. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-14 items-center">
        
        <Sheet>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              className="mr-2 px-0 text-base hover:bg-transparent focus-visible:bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0 md:hidden"
            >
              <Menu className="h-5 w-5" />
              <span className="sr-only">Toggle Menu</span>
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="pr-0">
            <Link to="/" className="flex items-center">
              <span className="font-bold">Forex Trading Bot</span>
            </Link>
            <div className="my-4 h-[calc(100vh-8rem)] pb-10 pl-6">
              <div className="flex flex-col space-y-3">
                <Link to="/dashboard" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  Dashboard
                </Link>
                <Link to="/strategies" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  Strategies
                </Link>
                <Link to="/signals" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  Signals
                </Link>
                <Link to="/risk" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  Risk
                </Link>
                <Link to="/analytics" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  Analytics
                </Link>
                <Link to="/backtests" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  Backtests
                </Link>
                <Link to="/brokers" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  Brokers
                </Link>
                <Link to="/logs" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  Logs
                </Link>
                <Link to="/audit" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  Audit
                </Link>
                <Link to="/telegram" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  Telegram
                </Link>
                <Link to="/account" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  Account
                </Link>
                <Link to="/settings" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  Settings
                </Link>
                <Link to="/support" className="transition-colors hover:text-foreground/80 text-foreground/60">
                  Support
                </Link>
              </div>
            </div>
          </SheetContent>
        </Sheet>
        <div className="flex flex-1 items-center justify-end space-x-4">
          <nav className="flex items-center space-x-4">
            <Button
              variant="destructive"
              size="sm"
              onClick={handleEmergencyStop}
            >
              Emergency Stop
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-10 w-10 rounded-full p-0">
                  <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
                    <span className="text-sm font-medium text-primary-foreground">
                      {user?.username?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium leading-none">{user?.username || 'User'}</p>
                    <p className="text-xs leading-none text-muted-foreground">
                      Manage your account, billing, and subscription
                    </p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <Link to="/settings">
                  <DropdownMenuItem>
                    Settings
                  </DropdownMenuItem>
                </Link>
                <Link to="/account">
                  <DropdownMenuItem>
                    Account Management
                  </DropdownMenuItem>
                </Link>
                <Link to="/support">
                  <DropdownMenuItem>
                    Support
                  </DropdownMenuItem>
                </Link>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout}>
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </nav>
        </div>
      </div>
    </header>
  );
}