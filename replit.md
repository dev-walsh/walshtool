# Overview

This is a fully-automated forex trading bot system with a web-based control panel. The application provides autonomous FX trading capabilities with strict risk controls tailored for funded account rules, including daily loss limits, overall drawdown limits, position sizing, and news blackout periods. The system supports backtesting, paper trading, and live trading modes with seamless promotion between environments.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **UI Components**: Shadcn/ui component library with Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **State Management**: TanStack Query for server state management
- **Routing**: Wouter for lightweight client-side routing
- **Real-time Updates**: WebSocket connection for live data streaming

## Backend Architecture
- **Runtime**: Node.js with Express.js framework
- **Language**: TypeScript with ES modules
- **API Design**: RESTful APIs with WebSocket support for real-time updates
- **Architecture Pattern**: Microservices-oriented with separate service modules:
  - Strategy Engine: Signal generation and trade execution logic
  - Risk Manager: Risk validation and position size calculation
  - Order Manager: Order routing and execution management
  - Market Data Service: Real-time and historical market data handling

## Database Layer
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **ORM**: Drizzle ORM for type-safe database operations
- **Schema Design**: Comprehensive trading schema including:
  - User management and authentication
  - Account management with prop firm rule support
  - Strategy configuration and versioning
  - Order and position tracking
  - Risk event logging and audit trails
  - Backtest results and system status monitoring

## Risk Management System
- **Multi-layered Risk Controls**: Account-level and firm-level constraints enforced before order execution
- **Real-time Monitoring**: Continuous risk assessment with configurable thresholds
- **Emergency Controls**: Kill-switch functionality and position closure capabilities
- **Audit Trail**: Comprehensive logging of all risk events and decisions

## Trading Engine
- **Strategy Support**: Multiple concurrent strategies with ensemble voting capabilities
- **Order Management**: Normalized order schema with broker-agnostic adapters
- **Position Management**: Real-time P&L tracking and position lifecycle management
- **Backtesting**: Event-driven backtesting engine with realistic fill simulation

# External Dependencies

## Database Services
- **Neon Database**: Serverless PostgreSQL hosting for production data storage
- **Connection Pooling**: @neondatabase/serverless for optimized database connections

## UI Component Libraries
- **Radix UI**: Comprehensive set of accessible, unstyled UI primitives
- **Shadcn/ui**: Pre-built component library built on top of Radix UI
- **Lucide Icons**: Modern icon library for UI elements

## Development Tools
- **Drizzle Kit**: Database migration and schema management tool
- **Vite**: Fast build tool and development server
- **TypeScript**: Type safety across the entire application stack

## Broker Integration Framework
- **Pluggable Architecture**: Support for multiple broker adapters including:
  - OANDA v20 REST/streaming API
  - MetaTrader 4/5 bridge connections
  - cTrader Open API
  - Interactive Brokers TWS/Gateway
- **Paper Trading**: Built-in simulation environment for strategy testing

## Real-time Communication
- **WebSocket Server**: Native Node.js WebSocket implementation for live updates
- **TanStack Query**: Intelligent caching and synchronization of server state

## Form Management
- **React Hook Form**: Efficient form handling with minimal re-renders
- **Zod Integration**: Runtime type validation using Drizzle-generated schemas