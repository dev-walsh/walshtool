
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import Header from "@/components/layout/header";
import { Copy, Users, Settings, MessageSquare } from "lucide-react";

interface TelegramStatus {
  connected: boolean;
  authorizedUsers: Array<{
    id: number;
    username?: string;
    role: string;
    isAuthorized: boolean;
  }>;
  token: string;
}

export default function TelegramPage() {
  const [newUserId, setNewUserId] = useState("");
  const [newUserRole, setNewUserRole] = useState("viewer");
  const queryClient = useQueryClient();

  const { data: telegramStatus, isLoading } = useQuery<TelegramStatus>({
    queryKey: ["/api/telegram/status"],
    refetchInterval: 30000,
  });

  const authorizeMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      const response = await fetch("/api/telegram/authorize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, role }),
      });
      if (!response.ok) throw new Error("Failed to authorize user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telegram/status"] });
      setNewUserId("");
      setNewUserRole("viewer");
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch("/api/telegram/revoke", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      });
      if (!response.ok) throw new Error("Failed to revoke user");
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/telegram/status"] });
    },
  });

  const handleAuthorizeUser = () => {
    if (!newUserId.trim()) return;
    authorizeMutation.mutate({ userId: newUserId, role: newUserRole });
  };

  const handleRevokeUser = (userId: number) => {
    revokeMutation.mutate(userId);
  };

  const copyBotSetupInstructions = () => {
    const instructions = `# Telegram Bot Setup Instructions

1. Create a new bot:
   - Message @BotFather on Telegram
   - Send /newbot
   - Choose a name and username for your bot

2. Get your bot token and add it to Replit Secrets:
   - Copy the token from BotFather
   - Go to Replit Secrets (lock icon in sidebar)
   - Add key: TELEGRAM_BOT_TOKEN
   - Add value: your_bot_token_here

3. Start your bot:
   - Find your bot on Telegram
   - Send /start to begin
   - Get your User ID and authorize yourself below

4. Available Commands:
   /status - Account overview
   /positions - Open positions
   /risk - Risk metrics
   /strategies - Strategy status
   /alerts - Toggle notifications
   /stop - Emergency stop (admin only)`;

    navigator.clipboard.writeText(instructions);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <>
      <Header title="Telegram Bot" description="Manage Telegram integration and notifications" />

      <div className="p-6 space-y-6">
        {/* Connection Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Connection Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${telegramStatus?.connected ? 'bg-green-500' : 'bg-red-500'}`} />
                <span className="font-medium">
                  {telegramStatus?.connected ? 'Connected' : 'Disconnected'}
                </span>
                <Badge variant={telegramStatus?.token === 'SET' ? 'default' : 'destructive'}>
                  Token {telegramStatus?.token === 'SET' ? 'Configured' : 'Missing'}
                </Badge>
              </div>
              <Button onClick={copyBotSetupInstructions} variant="outline" size="sm">
                <Copy className="h-4 w-4 mr-2" />
                Setup Instructions
              </Button>
            </div>

            {telegramStatus?.token !== 'SET' && (
              <Alert className="mt-4">
                <Settings className="h-4 w-4" />
                <AlertDescription>
                  Telegram bot token not configured. Add TELEGRAM_BOT_TOKEN to your Replit Secrets to enable the bot.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Authorize New User */}
        <Card>
          <CardHeader>
            <CardTitle>Authorize New User</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-3">
              <Input
                placeholder="Telegram User ID"
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                className="flex-1"
              />
              <Select value={newUserRole} onValueChange={setNewUserRole}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="viewer">Viewer</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                </SelectContent>
              </Select>
              <Button 
                onClick={handleAuthorizeUser}
                disabled={!newUserId.trim() || authorizeMutation.isPending}
              >
                Authorize
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Users can find their User ID by sending /start to the bot
            </p>
          </CardContent>
        </Card>

        {/* Authorized Users */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Authorized Users ({telegramStatus?.authorizedUsers?.length || 0})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {telegramStatus?.authorizedUsers?.length === 0 ? (
              <p className="text-muted-foreground text-center py-4">
                No authorized users yet
              </p>
            ) : (
              <div className="space-y-3">
                {telegramStatus?.authorizedUsers.map((user) => (
                  <div key={user.id} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-2 h-2 rounded-full bg-green-500" />
                      <div>
                        <p className="font-medium">
                          {user.username ? `@${user.username}` : `User ${user.id}`}
                        </p>
                        <p className="text-sm text-muted-foreground">ID: {user.id}</p>
                      </div>
                      <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                        {user.role}
                      </Badge>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleRevokeUser(user.id)}
                      disabled={revokeMutation.isPending}
                    >
                      Revoke
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bot Features */}
        <Card>
          <CardHeader>
            <CardTitle>Bot Features</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <h4 className="font-medium">Real-time Notifications</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• Trade execution alerts</li>
                  <li>• Risk limit warnings</li>
                  <li>• System health alerts</li>
                  <li>• Emergency stop notifications</li>
                </ul>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">Remote Control</h4>
                <ul className="text-sm text-muted-foreground space-y-1">
                  <li>• View account status</li>
                  <li>• Check open positions</li>
                  <li>• Monitor risk metrics</li>
                  <li>• Emergency stop trading</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
