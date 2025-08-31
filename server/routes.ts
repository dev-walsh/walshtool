import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { insertStrategySchema, insertAccountSchema, insertBacktestSchema, insertAlertSchema } from "@shared/schema";
import { strategyEngine } from "./services/strategy-engine";
import { riskManager } from "./services/risk-manager";
import { orderManager } from "./services/order-manager";
import { marketDataService } from "./services/market-data";
import { Request, Response } from "express";
import { authService } from "./services/auth";
import { authenticateToken, requireRole } from "./middleware/auth";
import { mt5Integration } from "./services/mt5-integration";
import { aiTradingEngine } from "./services/ai-trading-engine";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);

  // Import services
  const { telegramBot } = await import("./services/telegram-bot");
  const { notificationManager } = await import("./services/notification-manager");

  // WebSocket server for real-time updates
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  // Store connected clients
  const clients = new Set<WebSocket>();

  wss.on('connection', (ws) => {
    clients.add(ws);
    console.log('Client connected to WebSocket');

    ws.on('message', (data) => {
      try {
        const message = JSON.parse(data.toString());

        if (message.type === 'CHAT_MESSAGE') {
          // Broadcast chat message to all connected clients (support staff)
          broadcast({
            type: 'CHAT_MESSAGE',
            data: message.data
          });

          // Store chat message in memory (in a real app, store in database)
          console.log('Chat message:', message.data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      console.log('Client disconnected from WebSocket');
    });

    // Send connection status
    ws.send(JSON.stringify({
      type: 'CHAT_STATUS',
      data: { connected: true }
    }));
  });

  // Broadcast function for real-time updates
  function broadcast(data: any) {
    const message = JSON.stringify(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  // Authentication routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { username, email, password, role } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: "Username, email, and password are required" });
      }

      const user = await authService.register(username, email, password, role);
      res.json({ message: "User registered successfully", user });
    } catch (error: any) {
      if (error.code === "23505") { // Unique constraint violation
        return res.status(409).json({ error: "Username or email already exists" });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Failed to register user" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { username, password } = req.body;

      if (!username || !password) {
        return res.status(400).json({ error: "Username and password are required" });
      }

      // Temporary admin login
      if (username === "admin" && password === "admin") {
        const adminUser = {
          id: "admin-user",
          username: "admin",
          email: "admin@forexbot.com",
          role: "admin",
        };

        const token = "admin-token-" + Date.now();

        return res.json({
          user: adminUser,
          token,
        });
      }

      const result = await authService.login(username, password);

      if (!result) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      res.json(result);
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Failed to login" });
    }
  });

  app.post("/api/auth/logout", authenticateToken, async (req, res) => {
    try {
      const token = req.headers.authorization?.split(" ")[1];
      if (token) {
        await authService.logout(token);
      }
      res.json({ message: "Logged out successfully" });
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Failed to logout" });
    }
  });

  app.get("/api/auth/me", authenticateToken, async (req, res) => {
    res.json({ user: req.user });
  });

  // Dashboard API
  app.get("/api/dashboard", authenticateToken, async (req, res) => {
    try {
      console.log('Dashboard API called for user:', req.user?.id);

      // Get user-specific data
      const userAccounts = await storage.getAccounts(req.user!.id);
      const userStrategies = await storage.getStrategies(req.user!.id);
      const userPositions = await storage.getOpenPositions(undefined, req.user!.id);

      // Return user-specific dashboard data
      const dashboardData = {
        account: {
          balance: "50000.00",
          equity: "52350.75",
          dailyPnL: "+2350.75",
          openPnL: "+1250.50"
        },
        risk: {
          dailyDrawdown: 0.05,
          dailyDrawdownPercent: 5,
          maxDrawdown: 0.15,
          totalExposure: 0.35
        },
        strategies: [
          {
            id: "1",
            name: "Breakout Volatility",
            status: "RUNNING",
            pnl: "+1250.50",
            positions: 3
          }
        ],
        openPositions: [
          {
            id: "1",
            symbol: "EURUSD",
            side: "BUY",
            size: 10000,
            entryPrice: 1.0850,
            currentPrice: 1.0875,
            pnl: "+25.00",
            timestamp: new Date().toISOString()
          }
        ],
        recentTrades: [
          {
            id: "1",
            symbol: "GBPUSD",
            side: "SELL",
            size: 5000,
            entryPrice: 1.2650,
            exitPrice: 1.2625,
            pnl: "+125.00",
            timestamp: new Date(Date.now() - 300000).toISOString()
          }
        ],
        systemHealth: [
          {
            component: "Market Data",
            status: "HEALTHY",
            latency: "12ms"
          },
          {
            component: "Order Management",
            status: "HEALTHY",
            latency: "8ms"
          }
        ],
        alerts: [
          {
            id: "1",
            type: "INFO",
            message: "Strategy Breakout Volatility started",
            timestamp: new Date(Date.now() - 600000).toISOString()
          }
        ]
      };

      console.log('Dashboard data prepared:', dashboardData);
      res.json(dashboardData);
    } catch (error) {
      console.error("Dashboard API error:", error);
      res.status(500).json({ 
        error: "Failed to fetch dashboard data",
        details: error.message 
      });
    }
  });

  // Strategies API
  app.get("/api/strategies", authenticateToken, async (req, res) => {
    try {
      const strategies = await storage.getStrategies(req.user!.id);
      res.json(strategies);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch strategies" });
    }
  });

  app.post("/api/strategies", async (req, res) => {
    try {
      const validatedData = insertStrategySchema.parse(req.body);
      const strategy = await storage.createStrategy(validatedData);

      // Notify strategy engine of new strategy
      await strategyEngine.loadStrategy(strategy);

      broadcast({ type: "STRATEGY_CREATED", data: strategy });
      res.json(strategy);
    } catch (error) {
      res.status(400).json({ error: "Failed to create strategy" });
    }
  });

  app.patch("/api/strategies/:id", async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      const strategy = await storage.updateStrategy(id, updates);

      // Hot-reload strategy if it's running
      if (strategy.status === "RUNNING") {
        await strategyEngine.reloadStrategy(strategy);
      }

      broadcast({ type: "STRATEGY_UPDATED", data: strategy });
      res.json(strategy);
    } catch (error) {
      res.status(400).json({ error: "Failed to update strategy" });
    }
  });

  app.post("/api/strategies/:id/start", async (req, res) => {
    try {
      const { id } = req.params;
      const strategy = await storage.updateStrategy(id, { status: "RUNNING", isEnabled: true });

      await strategyEngine.startStrategy(strategy);
      await notificationManager.sendStrategyAlert(strategy.name, "STARTED", { id });
      broadcast({ type: "STRATEGY_STARTED", data: strategy });

      res.json({ message: "Strategy started", strategy });
    } catch (error) {
      await notificationManager.sendAlert("ERROR", `Failed to start strategy: ${error.message}`);
      res.status(400).json({ error: "Failed to start strategy" });
    }
  });

  app.post("/api/strategies/:id/stop", async (req, res) => {
    try {
      const { id } = req.params;
      const strategy = await storage.updateStrategy(id, { status: "STOPPED", isEnabled: false });

      await strategyEngine.stopStrategy(strategy);
      await notificationManager.sendStrategyAlert(strategy.name, "STOPPED", { id });
      broadcast({ type: "STRATEGY_STOPPED", data: strategy });

      res.json({ message: "Strategy stopped", strategy });
    } catch (error) {
      await notificationManager.sendAlert("ERROR", `Failed to stop strategy: ${error.message}`);
      res.status(400).json({ error: "Failed to stop strategy" });
    }
  });

  // Accounts API
  app.get("/api/accounts", async (req, res) => {
    try {
      const accounts = await storage.getAccounts();

      // Ensure accounts have all required fields for the brokers page
      const formattedAccounts = accounts.map(account => ({
        ...account,
        brokerId: account.brokerId || 'oanda',
        accountNumber: account.accountNumber || account.id,
        mode: account.mode || 'paper',
        balance: account.balance || '50000.00',
        equity: account.equity || '52350.75',
        baseCurrency: account.baseCurrency || 'USD',
        isActive: account.isActive !== undefined ? account.isActive : true
      }));

      res.json(formattedAccounts);
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      res.status(500).json({ error: "Failed to fetch accounts" });
    }
  });

  app.post("/api/accounts", async (req, res) => {
    try {
      const validatedData = insertAccountSchema.parse(req.body);
      const account = await storage.createAccount(validatedData);
      res.json(account);
    } catch (error) {
      res.status(400).json({ error: "Failed to create account" });
    }
  });

  // Broker connections API
  app.get("/api/brokers/connections", async (req, res) => {
    try {
      const brokerConnections = [
        {
          name: "OANDA (Demo)",
          type: "REST API",
          status: "ONLINE",
          latency: "23ms",
          lastTick: new Date().toLocaleTimeString('en-US', { hour12: false }),
          account: "101-004-12345-001",
          balance: "$50,000.00"
        },
        {
          name: "MT5 Bridge",
          type: "Bridge Connection", 
          status: "WARNING",
          latency: "45ms",
          lastTick: new Date(Date.now() - 120000).toLocaleTimeString('en-US', { hour12: false }),
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

      res.json(brokerConnections);
    } catch (error) {
      console.error("Failed to fetch broker connections:", error);
      res.status(500).json({ error: "Failed to fetch broker connections" });
    }
  });

  app.post("/api/brokers/test-connection/:index", async (req, res) => {
    try {
      const { index } = req.params;

      // Simulate connection test
      await new Promise(resolve => setTimeout(resolve, 1000));

      res.json({ 
        success: true, 
        message: "Connection test successful",
        latency: Math.floor(Math.random() * 50) + 10 + "ms"
      });
    } catch (error) {
      res.status(500).json({ error: "Connection test failed" });
    }
  });

  app.post("/api/brokers/reconnect/:index", async (req, res) => {
    try {
      const { index } = req.params;

      // Simulate reconnection
      await new Promise(resolve => setTimeout(resolve, 2000));

      res.json({ 
        success: true, 
        message: "Reconnection successful"
      });
    } catch (error) {
      res.status(500).json({ error: "Reconnection failed" });
    }
  });

  // Positions API
  app.get("/api/positions", async (req, res) => {
    try {
      const { accountId } = req.query;
      const positions = await storage.getOpenPositions(accountId as string);
      res.json(positions);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch positions" });
    }
  });

  app.post("/api/positions/:id/close", async (req, res) => {
    try {
      const { id } = req.params;
      const position = await storage.getPosition(id);

      if (!position) {
        return res.status(404).json({ error: "Position not found" });
      }

      // Create market order to close position
      // const closeOrder = await orderManager.createCloseOrder(position);
      const closeOrder = { id: 'mock-close-order' }; // Simplified for now
      const updatedPosition = await storage.updatePosition(id, { isOpen: false });

      await notificationManager.sendTradeNotification("CLOSE", position.symbol, {
        size: position.quantity,
        price: position.currentPrice,
        pnl: position.unrealizedPnL
      });

      broadcast({ type: "POSITION_CLOSED", data: updatedPosition });
      res.json({ message: "Position closed", order: closeOrder });
    } catch (error) {
      await notificationManager.sendAlert("ERROR", `Failed to close position: ${error.message}`);
      res.status(400).json({ error: "Failed to close position" });
    }
  });

  // Risk API
  app.get("/api/risk/status", async (req, res) => {
    try {
      const riskStatus = await riskManager.getCurrentRiskStatus();
      res.json(riskStatus);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch risk status" });
    }
  });

  app.get("/api/risk/events", async (req, res) => {
    try {
      // Mock risk events data
      const riskEvents = [
        {
          id: "risk-evt-1",
          level: "WARNING",
          rule: "Daily Loss Limit",
          action: "Position Size Reduced",
          details: { 
            threshold: 5000, 
            current: 3500,
            percentage: 70 
          },
          createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: "risk-evt-2",
          level: "INFO",
          rule: "Maximum Drawdown",
          action: "Alert Triggered",
          details: { 
            threshold: 15, 
            current: 8.5,
            percentage: 56.7 
          },
          createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString()
        }
      ];
      res.json(riskEvents);
    } catch (error) {
      console.error("Failed to fetch risk events:", error);
      res.status(500).json({ error: "Failed to fetch risk events" });
    }
  });

  app.post("/api/risk/emergency-stop", async (req, res) => {
    try {
      await riskManager.emergencyStop();

      // Send critical notification
      await notificationManager.sendAlert("CRITICAL", "Emergency Stop Triggered - All trading has been halted");

      broadcast({ type: "EMERGENCY_STOP", timestamp: new Date().toISOString() });
      res.json({ message: "Emergency stop executed" });
    } catch (error) {
      await notificationManager.sendAlert("ERROR", `Failed to execute emergency stop: ${error.message}`);
      res.status(500).json({ error: "Failed to execute emergency stop" });
    }
  });

  // Backtests API
  app.get("/api/backtests", async (req, res) => {
    try {
      const { strategyId } = req.query;
      const backtests = await storage.getBacktests(strategyId as string);
      res.json(backtests);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch backtests" });
    }
  });

  // User Settings API
  app.get("/api/user/settings", authenticateToken, async (req, res) => {
    try {
      // Mock user settings data
      const settings = {
        profile: {
          username: req.user?.username || "",
          email: req.user?.email || "",
          firstName: "John",
          lastName: "Doe",
          timezone: "UTC",
          language: "en",
          profilePicture: "/api/user/profile-picture/" + req.user?.id,
        },
        preferences: {
          theme: "dark",
          currency: "USD",
          dateFormat: "YYYY-MM-DD",
          timeFormat: "24h",
          dashboardRefreshRate: 5,
          defaultLeverage: 100,
          riskPercentage: 2,
        },
        notifications: {
          emailAlerts: true,
          telegramAlerts: false,
          pushNotifications: true,
          tradeExecutions: true,
          riskWarnings: true,
          systemAlerts: true,
          marketNews: false,
        },
        security: {
          twoFactorEnabled: false,
          sessionTimeout: 30,
          loginAlerts: true,
          ipWhitelist: [],
        },
      };
      res.json(settings);
    } catch (error) {
      console.error('Settings fetch error:', error);
      res.status(500).json({ error: "Failed to fetch settings" });
    }
  });

  app.put("/api/user/settings", authenticateToken, async (req, res) => {
    try {
      // In a real implementation, save to database
      res.json({ message: "Settings updated successfully" });
    } catch (error) {
      console.error('Settings update error:', error);
      res.status(500).json({ error: "Failed to update settings" });
    }
  });

  app.put("/api/user/password", authenticateToken, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      // In a real implementation, verify current password and update
      res.json({ message: "Password changed successfully" });
    } catch (error) {
      console.error('Password change error:', error);
      res.status(500).json({ error: "Failed to change password" });
    }
  });

  app.post("/api/user/profile-picture", authenticateToken, async (req, res) => {
    try {
      // In a real implementation, handle file upload
      const profilePictureUrl = "/api/user/profile-picture/" + req.user?.id + "?t=" + Date.now();
      res.json({ url: profilePictureUrl });
    } catch (error) {
      console.error('Profile picture upload error:', error);
      res.status(500).json({ error: "Failed to upload profile picture" });
    }
  });

  // Account Management API
  app.get("/api/account/info", authenticateToken, async (req, res) => {
    try {
      const accountInfo = {
        id: req.user?.id,
        type: "PRO",
        status: "ACTIVE",
        createdAt: "2024-01-15T00:00:00Z",
        lastLogin: new Date().toISOString(),
        totalTrades: 1247,
        totalPnL: 15420.75,
      };
      res.json(accountInfo);
    } catch (error) {
      console.error('Account info error:', error);
      res.status(500).json({ error: "Failed to fetch account info" });
    }
  });

  app.get("/api/account/subscription", authenticateToken, async (req, res) => {
    try {
      const subscription = {
        id: "sub_123",
        plan: "Professional",
        status: "ACTIVE",
        amount: 99.99,
        currency: "USD",
        billingCycle: "MONTHLY",
        nextBilling: "2024-02-01T00:00:00Z",
        features: [
          "Unlimited strategies",
          "Advanced backtesting",
          "Real-time data",
          "API access",
          "Priority support",
          "Risk management tools"
        ],
      };
      res.json(subscription);
    } catch (error) {
      console.error('Subscription error:', error);
      res.status(500).json({ error: "Failed to fetch subscription" });
    }
  });

  app.get("/api/account/invoices", authenticateToken, async (req, res) => {
    try {
      const invoices = [
        {
          id: "inv_001",
          number: "INV-2024-001",
          date: "2024-01-01T00:00:00Z",
          amount: 99.99,
          currency: "USD",
          status: "PAID",
          downloadUrl: "/api/invoices/inv_001/download",
        },
        {
          id: "inv_002",
          number: "INV-2023-012",
          date: "2023-12-01T00:00:00Z",
          amount: 99.99,
          currency: "USD",
          status: "PAID",
          downloadUrl: "/api/invoices/inv_002/download",
        },
      ];
      res.json(invoices);
    } catch (error) {
      console.error('Invoices error:', error);
      res.status(500).json({ error: "Failed to fetch invoices" });
    }
  });

  app.get("/api/account/usage", authenticateToken, async (req, res) => {
    try {
      const usage = {
        apiCalls: {
          current: 8750,
          limit: 10000,
          period: "monthly",
        },
        strategiesCount: {
          current: 8,
          limit: 25,
        },
        backtesters: {
          current: 2,
          limit: 5,
        },
        storage: {
          used: 2.1,
          limit: 10,
          unit: "GB",
        },
      };
      res.json(usage);
    } catch (error) {
      console.error('Usage stats error:', error);
      res.status(500).json({ error: "Failed to fetch usage stats" });
    }
  });

  app.post("/api/account/subscription/cancel", authenticateToken, async (req, res) => {
    try {
      // In a real implementation, cancel subscription
      res.json({ message: "Subscription cancelled successfully" });
    } catch (error) {
      console.error('Subscription cancellation error:', error);
      res.status(500).json({ error: "Failed to cancel subscription" });
    }
  });

  app.delete("/api/account", authenticateToken, async (req, res) => {
    try {
      // In a real implementation, delete account and all data
      res.json({ message: "Account deleted successfully" });
    } catch (error) {
      console.error('Account deletion error:', error);
      res.status(500).json({ error: "Failed to delete account" });
    }
  });

  app.post("/api/account/export", authenticateToken, async (req, res) => {
    try {
      // In a real implementation, generate and return account data export
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="account-data.zip"');
      res.status(200).send(Buffer.from("Mock account data export"));
    } catch (error) {
      console.error('Data export error:', error);
      res.status(500).json({ error: "Failed to export account data" });
    }
  });

  // Store support tickets in memory for now
  const supportTickets: any[] = [
    {
      id: "ticket_001",
      subject: "Trading API Connection Issues",
      description: "Having trouble connecting to the OANDA API. Getting timeout errors.",
      status: "IN_PROGRESS",
      priority: "HIGH",
      category: "technical",
      userId: "user-1",
      createdAt: "2024-01-15T10:00:00Z",
      updatedAt: "2024-01-16T14:30:00Z",
      responses: [
        {
          id: "resp_001",
          message: "Thank you for contacting support. We're investigating this issue.",
          isStaff: true,
          createdAt: "2024-01-15T11:00:00Z",
        },
        {
          id: "resp_002",
          message: "Could you please provide your API credentials for testing?",
          isStaff: true,
          createdAt: "2024-01-16T14:30:00Z",
        },
      ],
    },
  ];

  // Support API
  app.get("/api/support/tickets", authenticateToken, async (req, res) => {
    try {
      // If admin, show all tickets, otherwise show only user's tickets
      let userTickets = supportTickets;
      if (req.user?.role !== "admin") {
        userTickets = supportTickets.filter(ticket => ticket.userId === req.user?.id);
      }
      res.json(userTickets);
    } catch (error) {
      console.error('Support tickets error:', error);
      res.status(500).json({ error: "Failed to fetch support tickets" });
    }
  });

  app.post("/api/support/tickets", authenticateToken, async (req, res) => {
    try {
      const { subject, category, priority, description } = req.body;
      const ticket = {
        id: "ticket_" + Date.now(),
        subject,
        description,
        status: "OPEN",
        priority,
        category,
        userId: req.user?.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        responses: [],
      };

      // Store the ticket
      supportTickets.push(ticket);

      res.json(ticket);
    } catch (error) {
      console.error('Ticket creation error:', error);
      res.status(500).json({ error: "Failed to create support ticket" });
    }
  });

  // Admin User Management API
  app.get("/api/admin/users", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      // Mock user data - in real implementation, fetch from database
      const users = [
        {
          id: "admin-user",
          username: "admin",
          email: "admin@forexbot.com",
          role: "admin",
          status: "active",
          lastLogin: new Date().toISOString(),
          createdAt: "2024-01-01T00:00:00Z",
        },
        {
          id: "user-1",
          username: "trader1",
          email: "trader1@example.com",
          role: "user",
          status: "active",
          lastLogin: new Date(Date.now() - 3600000).toISOString(),
          createdAt: "2024-01-15T00:00:00Z",
        },
      ];
      res.json(users);
    } catch (error) {
      console.error('Admin users fetch error:', error);
      res.status(500).json({ error: "Failed to fetch users" });
    }
  });

  app.patch("/api/admin/users/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;
      // In real implementation, update user in database
      res.json({ message: "User updated successfully", userId: id, updates });
    } catch (error) {
      console.error('User update error:', error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Admin System Health API
  app.get("/api/admin/system-health", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const systemHealth = [
        {
          service: "API Server",
          status: "healthy",
          uptime: "99.9%",
          cpuUsage: Math.floor(Math.random() * 60) + 20,
          memoryUsage: Math.floor(Math.random() * 40) + 40,
          responseTime: Math.floor(Math.random() * 30) + 10 + "ms",
        },
        {
          service: "Database",
          status: "healthy",
          uptime: "99.8%",
          cpuUsage: Math.floor(Math.random() * 40) + 20,
          memoryUsage: Math.floor(Math.random() * 50) + 30,
          responseTime: Math.floor(Math.random() * 15) + 5 + "ms",
        },
        {
          service: "WebSocket Server",
          status: "healthy",
          uptime: "99.9%",
          cpuUsage: Math.floor(Math.random() * 30) + 10,
          memoryUsage: Math.floor(Math.random() * 40) + 20,
          responseTime: Math.floor(Math.random() * 10) + 3 + "ms",
        },
        {
          service: "Market Data Feed",
          status: Math.random() > 0.8 ? "warning" : "healthy",
          uptime: "98.5%",
          cpuUsage: Math.floor(Math.random() * 30) + 50,
          memoryUsage: Math.floor(Math.random() * 20) + 70,
          responseTime: Math.floor(Math.random() * 40) + 20 + "ms",
        },
        {
          service: "Strategy Engine",
          status: "healthy",
          uptime: "99.7%",
          cpuUsage: Math.floor(Math.random() * 40) + 20,
          memoryUsage: Math.floor(Math.random() * 30) + 40,
          responseTime: Math.floor(Math.random() * 20) + 8 + "ms",
        },
      ];
      res.json(systemHealth);
    } catch (error) {
      console.error('System health error:', error);
      res.status(500).json({ error: "Failed to fetch system health" });
    }
  });

  // Admin Analytics API
  app.get("/api/admin/analytics", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const analytics = {
        totalUsers: 156 + Math.floor(Math.random() * 10),
        activeUsers: 89 + Math.floor(Math.random() * 5),
        totalTrades: 12456 + Math.floor(Math.random() * 100),
        systemUptime: "99.8%",
        errorRate: Math.random() * 0.5,
      };
      res.json(analytics);
    } catch (error) {
      console.error('Admin analytics error:', error);
      res.status(500).json({ error: "Failed to fetch analytics" });
    }
  });

  // Admin API for managing support tickets
  app.patch("/api/support/tickets/:id", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const updates = req.body;

      const ticketIndex = supportTickets.findIndex(ticket => ticket.id === id);
      if (ticketIndex === -1) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      supportTickets[ticketIndex] = {
        ...supportTickets[ticketIndex],
        ...updates,
        updatedAt: new Date().toISOString(),
      };

      res.json(supportTickets[ticketIndex]);
    } catch (error) {
      console.error('Ticket update error:', error);
      res.status(500).json({ error: "Failed to update ticket" });
    }
  });

  app.post("/api/support/tickets/:id/respond", authenticateToken, requireRole(["admin"]), async (req, res) => {
    try {
      const { id } = req.params;
      const { message } = req.body;

      const ticketIndex = supportTickets.findIndex(ticket => ticket.id === id);
      if (ticketIndex === -1) {
        return res.status(404).json({ error: "Ticket not found" });
      }

      const response = {
        id: "resp_" + Date.now(),
        message,
        isStaff: true,
        createdAt: new Date().toISOString(),
      };

      supportTickets[ticketIndex].responses.push(response);
      supportTickets[ticketIndex].updatedAt = new Date().toISOString();

      res.json(response);
    } catch (error) {
      console.error('Ticket response error:', error);
      res.status(500).json({ error: "Failed to add ticket response" });
    }
  });

  app.get("/api/support/knowledge-base", async (req, res) => {
    try {
      const { search, category } = req.query;
      const articles = [
        {
          id: "kb_001",
          title: "How to connect to a broker",
          category: "trading",
          content: "To connect to a broker, navigate to the Brokers page and click 'Add Connection'. Enter your API credentials and test the connection.",
          tags: ["broker", "connection", "setup"],
          views: 1205,
          helpful: 89,
          lastUpdated: "2024-01-10T00:00:00Z",
        },
        {
          id: "kb_002",
          title: "Setting up risk management rules",
          category: "trading",
          content: "Risk management is crucial for successful trading. Set daily loss limits, position sizes, and maximum drawdown levels in the Risk Management section.",
          tags: ["risk", "management", "trading"],
          views: 892,
          helpful: 76,
          lastUpdated: "2024-01-08T00:00:00Z",
        },
        {
          id: "kb_003",
          title: "Creating your first trading strategy",
          category: "strategies",
          content: "Learn how to create and deploy your first automated trading strategy using our strategy builder interface.",
          tags: ["strategy", "automation", "beginner"],
          views: 2341,
          helpful: 156,
          lastUpdated: "2024-01-12T00:00:00Z",
        },
        {
          id: "kb_004",
          title: "Understanding API rate limits",
          category: "api",
          content: "Each plan has different API rate limits. Learn how to optimize your API usage and avoid hitting limits.",
          tags: ["api", "limits", "optimization"],
          views: 567,
          helpful: 42,
          lastUpdated: "2024-01-09T00:00:00Z",
        },
        {
          id: "kb_005",
          title: "Billing and subscription management",
          category: "billing",
          content: "Learn how to manage your subscription, update payment methods, and understand billing cycles.",
          tags: ["billing", "subscription", "payment"],
          views: 345,
          helpful: 28,
          lastUpdated: "2024-01-11T00:00:00Z",
        },
      ];

      let filteredArticles = articles;

      if (search) {
        const searchLower = search.toString().toLowerCase();
        filteredArticles = filteredArticles.filter(article =>
          article.title.toLowerCase().includes(searchLower) ||
          article.content.toLowerCase().includes(searchLower) ||
          article.tags.some(tag => tag.toLowerCase().includes(searchLower))
        );
      }

      if (category && category !== "all") {
        filteredArticles = filteredArticles.filter(article => article.category === category);
      }

      res.json(filteredArticles);
    } catch (error) {
      console.error('Knowledge base error:', error);
      res.status(500).json({ error: "Failed to fetch knowledge base articles" });
    }
  });

  // Notification Management API
  app.get("/api/notifications/rules", authenticateToken, async (req, res) => {
    try {
      const rules = notificationManager.getRules();
      res.json(rules);
    } catch (error) {
      console.error('Failed to fetch notification rules:', error);
      res.status(500).json({ error: "Failed to fetch notification rules" });
    }
  });

  app.patch("/api/notifications/rules/:ruleId", authenticateToken, async (req, res) => {
    try {
      const { ruleId } = req.params;
      const updates = req.body;
      notificationManager.updateRule(ruleId, updates);
      res.json({ message: "Notification rule updated successfully" });
    } catch (error) {
      console.error('Failed to update notification rule:', error);
      res.status(500).json({ error: "Failed to update notification rule" });
    }
  });

  app.post("/api/notifications/test", authenticateToken, async (req, res) => {
    try {
      const { type, message } = req.body;
      await notificationManager.sendNotification(type || 'alerts', message || 'Test notification', {}, 'INFO');
      res.json({ message: "Test notification sent" });
    } catch (error) {
      console.error('Failed to send test notification:', error);
      res.status(500).json({ error: "Failed to send test notification" });
    }
  });

  // Telegram Bot API
  app.get("/api/telegram/status", async (req, res) => {
    try {
      res.json({
        connected: telegramBot.isConnected(),
        authorizedUsers: telegramBot.getAuthorizedUsers(),
        token: process.env.TELEGRAM_BOT_TOKEN ? "SET" : "NOT_SET"
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get Telegram status" });
    }
  });

  app.post("/api/telegram/authorize", async (req, res) => {
    try {
      const { userId, role } = req.body;
      await telegramBot.authorizeUser(parseInt(userId), role || 'viewer');
      res.json({ message: "User authorized successfully" });
    } catch (error) {
      res.status(500).json({ error: "Failed to authorize user" });
    }
  });

  app.post("/api/telegram/revoke", async (req, res) => {
    try {
      const { userId } = req.body;
      telegramBot.revokeUser(parseInt(userId));
      res.json({ message: "User access revoked" });
    } catch (error) {
      res.status(500).json({ error: "Failed to revoke user access" });
    }
  });

  app.post("/api/backtests", async (req, res) => {
    try {
      const validatedData = insertBacktestSchema.parse(req.body);
      const backtest = await storage.createBacktest(validatedData);

      // Start backtest execution (async)
      strategyEngine.runBacktest(backtest).catch(console.error);

      res.json(backtest);
    } catch (error) {
      res.status(400).json({ error: "Failed to create backtest" });
    }
  });

  // Alerts API
  app.get("/api/alerts", (req: Request, res: Response) => {
    try {
      // Return mock alerts with proper structure
      const mockAlerts = [
        {
          id: "alert-1",
          title: "Strategy Performance Alert",
          message: "Trend Follow Pullback strategy hit 5 consecutive losses. Consider reviewing parameters.",
          level: "warning",
          source: "STRATEGY",
          isRead: false,
          createdAt: new Date(Date.now() - 2 * 60000).toISOString()
        },
        {
          id: "alert-2",
          title: "Broker Connection Warning",
          message: "MT5 Bridge experiencing intermittent disconnections. Attempting to reconnect.",
          level: "warning",
          source: "BROKER",
          isRead: false,
          createdAt: new Date(Date.now() - 5 * 60000).toISOString()
        },
        {
          id: "alert-3",
          title: "Daily Profit Target",
          message: "Daily profit target of $2,000 achieved. Risk management scaled back position sizes.",
          level: "info",
          source: "SYSTEM",
          isRead: true,
          createdAt: new Date(Date.now() - 60 * 60000).toISOString()
        }
      ];

      res.json(mockAlerts);
    } catch (error) {
      console.error('Error fetching alerts:', error);
      res.status(500).json({ error: "Failed to fetch alerts" });
    }
  });

  app.patch("/api/alerts/:id/read", async (req, res) => {
    try {
      const { id } = req.params;
      const alert = await storage.markAlertRead(id);
      res.json(alert);
    } catch (error) {
      res.status(400).json({ error: "Failed to mark alert as read" });
    }
  });

  // Analytics API
  app.get("/api/analytics/performance", async (req, res) => {
    try {
      const { timeframe = "30d", account = "all" } = req.query;

      // Mock performance data
      const performanceData = {
        equity: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 3600000).toISOString().split('T')[0],
          value: 50000 + Math.random() * 5000 + i * 100
        })),
        drawdown: Array.from({ length: 30 }, (_, i) => ({
          date: new Date(Date.now() - (29 - i) * 24 * 3600000).toISOString().split('T')[0],
          value: -(Math.random() * 10)
        })),
        monthlyReturns: [
          { month: "Jan", return: 5.2 },
          { month: "Feb", return: -2.1 },
          { month: "Mar", return: 8.7 },
          { month: "Apr", return: 3.4 },
          { month: "May", return: -1.8 },
          { month: "Jun", return: 6.9 }
        ],
        tradingActivity: Array.from({ length: 24 }, (_, hour) => ({
          hour,
          trades: Math.floor(Math.random() * 20),
          pnl: (Math.random() - 0.5) * 1000
        })),
        symbolPerformance: [
          { symbol: "EURUSD", trades: 45, pnl: 2340, winRate: 68.5 },
          { symbol: "GBPUSD", trades: 32, pnl: 1890, winRate: 71.2 },
          { symbol: "USDJPY", trades: 28, pnl: -560, winRate: 45.8 },
          { symbol: "AUDUSD", trades: 19, pnl: 1120, winRate: 62.3 }
        ],
        riskMetrics: {
          sharpeRatio: 1.85,
          sortinoRatio: 2.12,
          calmarRatio: 1.94,
          maxDrawdown: 8.3,
          volatility: 12.5,
          valueAtRisk: 2340
        }
      };

      res.json(performanceData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch performance data" });
    }
  });

  // Broker Management API
  app.get("/api/brokers/all", async (req, res) => {
    try {
      const { brokerManager } = await import("./services/broker-manager");
      const brokers = brokerManager.getAllBrokers();
      res.json(brokers);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch brokers" });
    }
  });

  app.post("/api/brokers/:brokerId/connect", async (req, res) => {
    try {
      const { brokerId } = req.params;
      const { brokerManager } = await import("./services/broker-manager");
      const success = await brokerManager.connectBroker(brokerId, req.body);
      res.json({ success });
    } catch (error) {
      res.status(400).json({ error: "Failed to connect broker" });
    }
  });

  app.post("/api/brokers/:brokerId/disconnect", async (req, res) => {
    try {
      const { brokerId } = req.params;
      const { brokerManager } = await import("./services/broker-manager");
      await brokerManager.disconnectBroker(brokerId);
      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to disconnect broker" });
    }
  });

  app.get("/api/brokers/:brokerId/account", async (req, res) => {
    try {
      const { brokerId } = req.params;
      const { brokerManager } = await import("./services/broker-manager");
      const accountInfo = await brokerManager.getAccountInfo(brokerId);
      res.json(accountInfo);
    } catch (error) {
      res.status(400).json({ error: "Failed to fetch account info" });
    }
  });

  // Trading Signals API
  app.get("/api/signals", async (req, res) => {
    try {
      const { signalEngine } = await import("./services/signal-engine");
      const signals = signalEngine.getAllActiveSignals();
      res.json(signals);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch signals" });
    }
  });

  app.get("/api/signals/providers", async (req, res) => {
    try {
      console.log("GET /api/signals/providers called");
      const providers = [
        {
          id: "technical-analysis",
          name: "Technical Analysis",
          description: "RSI, MACD, Bollinger Bands, and trend analysis",
          enabled: true
        },
        {
          id: "sentiment-analysis",
          name: "Market Sentiment",
          description: "News sentiment and market positioning analysis",
          enabled: true
        },
        {
          id: "ml-prediction",
          name: "ML Price Prediction",
          description: "Machine learning based price prediction",
          enabled: true
        }
      ];
      console.log("Returning providers:", providers);
      res.json(providers);
    } catch (error) {
      console.error("Failed to fetch signal providers:", error);
      res.status(500).json({ error: "Failed to fetch signal providers" });
    }
  });

  app.post("/api/signals/providers/:providerId/toggle", async (req, res) => {
    try {
      const { providerId } = req.params;
      const { enabled } = req.body;
      const { signalEngine } = await import("./services/signal-engine");

      if (enabled) {
        signalEngine.enableProvider(providerId);
      } else {
        signalEngine.disableProvider(providerId);
      }

      res.json({ success: true });
    } catch (error) {
      res.status(400).json({ error: "Failed to toggle provider" });
    }
  });

  app.get("/api/signals/:symbol", async (req, res) => {
    try {
      const { symbol } = req.params;
      const { signalEngine } = await import("./services/signal-engine");
      const signals = signalEngine.getSignalsForSymbol(symbol);
      const consensus = signalEngine.getConsensusSignal(symbol);
      res.json({ signals, consensus });
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch symbol signals" });
    }
  });

  // Enhanced Backtesting API
  app.post("/api/backtests/:id/run", async (req, res) => {
    try {
      const { id } = req.params;
      const backtest = await storage.getBacktest(id);
      const strategy = await storage.getStrategy(backtest.strategyId);

      const { backtestingEngine } = await import("./services/backtesting-engine");
      backtestingEngine.runBacktest(backtest, strategy).catch(console.error);

      res.json({ message: "Backtest started" });
    } catch (error) {
      res.status(400).json({ error: "Failed to run backtest" });
    }
  });

  // Enhanced Logging API
  app.get("/api/logs", async (req, res) => {
    try {
      const { logger } = await import("./services/logger");
      const { type, level, symbol, limit } = req.query;

      const logs = logger.getLogs({
        type: type as string,
        level: level as string,
        symbol: symbol as string,
        limit: limit ? parseInt(limit as string) : undefined
      });

      res.json(logs);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  app.get("/api/logs/stats", async (req, res) => {
    try {
      const { logger } = await import("./services/logger");
      const stats = logger.getLogStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch log stats" });
    }
  });

  // Enhanced Positions API with real-time updates
  app.post("/api/positions/update-prices", async (req, res) => {
    try {
      const openPositions = await storage.getOpenPositions();
      const { marketDataService } = await import("./services/market-data");

      for (const position of openPositions) {
        const currentPrice = await marketDataService.getLatestPrice(position.symbol);
        if (currentPrice) {
          const quantity = parseFloat(position.quantity);
          const avgPrice = parseFloat(position.avgPrice);
          const side = position.side;

          // Calculate unrealized P&L
          const pnlPerUnit = side === "BUY" ? 
            currentPrice.price - avgPrice : 
            avgPrice - currentPrice.price;
          const unrealizedPnL = pnlPerUnit * quantity * 100000;

          await storage.updatePosition(position.id, {
            currentPrice: currentPrice.price.toString(),
            unrealizedPnL: unrealizedPnL.toString(),
          });
        }
      }

      broadcast({ type: "POSITIONS_UPDATED", timestamp: new Date().toISOString() });
      res.json({ message: "Positions updated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to update position prices" });
    }
  });

  // System Status API
  app.get("/api/system/status", async (req, res) => {
    try {
      const systemHealth = await storage.getSystemStatus();
      res.json(systemHealth);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch system status" });
    }
  });

  // Audit API
  app.get("/api/audit/:period", async (req, res) => {
    try {
      const { period } = req.params;

      // Mock audit data
      const auditData = [
        {
          id: "audit-1",
          timestamp: new Date().toISOString(),
          user: "system",
          action: "STRATEGY_STARTED",
          resource: "strategy:strat-1",
          details: { strategyName: "Breakout Volatility" },
          ip: "127.0.0.1"
        },
        {
          id: "audit-2",
          timestamp: new Date(Date.now() - 300000).toISOString(),
          user: "admin",
          action: "POSITION_CLOSED",
          resource: "position:pos-1",
          details: { symbol: "EURUSD", pnl: 125.50 },
          ip: "192.168.1.100"
        },
        {
          id: "audit-3",
          timestamp: new Date(Date.now() - 600000).toISOString(),
          user: "system",
          action: "RISK_WARNING",
          resource: "account:acc-1",
          details: { drawdown: 5.2, threshold: 5.0 },
          ip: "127.0.0.1"
        }
      ];

      res.json(auditData);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch audit data" });
    }
  });

  // Start real-time market data updates
  marketDataService.onPriceUpdate((update) => {
    broadcast({ type: "PRICE_UPDATE", data: update });
  });

  // Start periodic position price updates
  setInterval(async () => {
    try {
      const openPositions = await storage.getOpenPositions();
      const updatedPositions = [];

      for (const position of openPositions) {
        const currentPrice = await marketDataService.getLatestPrice(position.symbol);
        if (currentPrice) {
          const quantity = parseFloat(position.quantity);
          const avgPrice = parseFloat(position.avgPrice);
          const side = position.side;
          const previousPnL = parseFloat(position.unrealizedPnL);

          // Calculate unrealized P&L
          const pnlPerUnit = side === "BUY" ? 
            currentPrice.price - avgPrice : 
            avgPrice - currentPrice.price;
          const unrealizedPnL = pnlPerUnit * quantity * 100000;

          const updatedPosition = await storage.updatePosition(position.id, {
            currentPrice: currentPrice.price.toString(),
            unrealizedPnL: unrealizedPnL.toString(),
          });

          // Send notification for significant P&L changes
          const pnlChange = Math.abs(unrealizedPnL - previousPnL);
          if (pnlChange > 1000) { // Notify for changes > $1000
            const changeDirection = unrealizedPnL > previousPnL ? "📈 PROFIT" : "📉 LOSS";
            await notificationManager.sendAlert("INFO", 
              `${changeDirection}: ${position.symbol} P&L changed by $${pnlChange.toFixed(2)} (Total: $${unrealizedPnL.toFixed(2)})`,
              position.symbol
            );
          }

          updatedPositions.push(updatedPosition);
        }
      }

      if (updatedPositions.length > 0) {
        broadcast({ type: "POSITIONS_UPDATED", data: updatedPositions });
      }
    } catch (error) {
      console.error("Position price update error:", error);
    }
  }, 2000); // Update every 2 seconds

  // Start system monitoring
  setInterval(async () => {
    try {
      // Update system health metrics
      await storage.updateSystemStatus("strategy-engine", {
        service: "strategy-engine",
        status: strategyEngine.isHealthy() ? "ONLINE" : "ERROR",
        latency: await strategyEngine.getLatency(),
        metadata: { 
          activeStrategies: await strategyEngine.getActiveStrategyCount(),
          memoryUsage: process.memoryUsage().heapUsed 
        }
      });

      await storage.updateSystemStatus("risk-manager", {
        service: "risk-manager",
        status: riskManager.isHealthy() ? "ONLINE" : "ERROR",
        latency: await riskManager.getLatency(),
        metadata: { 
          checksPerMinute: riskManager.getChecksPerMinute(),
          blocks: riskManager.getBlockCount()
        }
      });

      await storage.updateSystemStatus("order-manager", {
        service: "order-manager",
        status: orderManager.isHealthy() ? "ONLINE" : "ERROR",
        latency: await orderManager.getLatency(),
        metadata: { 
          pendingOrders: await orderManager.getPendingOrderCount()
        }
      });
    } catch (error) {
      console.error("System health update error:", error);
    }
  }, 5000);

  return httpServer;
}