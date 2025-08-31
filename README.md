
# Forex Trading Bot & Control Panel

A fully-automated forex trading system with web control panel and Telegram bot integration.

## Quick Setup

1. **Clone this project** to your AI coder environment
2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Configure Telegram Bot** (Optional):
   - For Replit: Add `TELEGRAM_BOT_TOKEN` to Secrets (lock icon in sidebar)
   - For local development: Update `TELEGRAM_BOT_TOKEN` in `.env` file
   - Or create your own bot with @BotFather on Telegram

4. **Run the application**:
   ```bash
   npm run dev
   ```

5. **Access the application**:
   - Web Panel: `http://localhost:5000`
   - The app will start with mock data for testing

## Features

- 📊 **Real-time Dashboard** - Account metrics, positions, P&L
- 🎯 **Strategy Management** - Create, test, and deploy trading strategies
- ⚠️ **Risk Management** - Automated risk controls and limits
- 📱 **Telegram Integration** - Remote monitoring and control
- 📈 **Live Trading** - Multi-broker support
- 🔍 **Audit Trail** - Complete trade and system logging
- 📋 **Backtesting** - Historical strategy performance

## Telegram Bot Commands

- `/start` - Initialize bot
- `/status` - Account overview
- `/positions` - View open positions
- `/risk` - Risk metrics
- `/strategies` - Strategy status
- `/alerts` - Toggle notifications
- `/stop` - Emergency stop (admin only)

## Project Structure

```
├── client/          # React frontend
├── server/          # Express backend
├── shared/          # Shared types/schemas
├── .env             # Environment variables
└── README.md        # This file
```

## Configuration

Edit `.env` file to customize:
- `TELEGRAM_BOT_TOKEN` - Your bot token
- `DATABASE_URL` - Database connection
- `PORT` - Server port (default: 5000)

## Development

The project runs in development mode with:
- Hot reload for both frontend and backend
- Mock market data for testing
- SQLite database (file-based)
- WebSocket real-time updates

## Production Ready

- Risk management controls
- Multi-account support
- Comprehensive logging
- Real-time monitoring
- Emergency stop functionality
