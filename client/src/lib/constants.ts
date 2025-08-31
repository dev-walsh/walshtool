export const TRADING_PAIRS = [
  "EURUSD", "GBPUSD", "USDJPY", "AUDUSD", "USDCAD", "NZDUSD", 
  "EURGBP", "EURJPY", "GBPJPY", "AUDJPY", "CHFJPY", "CADJPY"
] as const;

export const BROKERS = [
  { id: "oanda", name: "OANDA", type: "REST API" },
  { id: "mt5", name: "MetaTrader 5", type: "Bridge Connection" },
  { id: "ibkr", name: "Interactive Brokers", type: "TWS Gateway" },
  { id: "ctrader", name: "cTrader", type: "Open API" },
] as const;

export const ACCOUNT_MODES = [
  { id: "paper", name: "Paper Trading", description: "Virtual trading with fake money" },
  { id: "live", name: "Live Trading", description: "Real money trading" },
  { id: "backtest", name: "Backtesting Only", description: "Historical data testing only" },
] as const;

export const STRATEGY_TYPES = [
  { id: "breakout", name: "Breakout Volatility", description: "Donchian/ATR based breakout strategy" },
  { id: "mean-reversion", name: "Mean Reversion Range", description: "RSI/Bollinger band range trading" },
  { id: "trend-follow", name: "Trend Following", description: "EMA stack with pullback entries" },
  { id: "scalper", name: "News-Avoidant Scalper", description: "High-frequency spread-aware trading" },
] as const;

export const RISK_LEVELS = {
  LOW: { threshold: 40, color: "green", label: "Low Risk" },
  MEDIUM: { threshold: 70, color: "yellow", label: "Medium Risk" },
  HIGH: { threshold: 90, color: "red", label: "High Risk" },
  CRITICAL: { threshold: 100, color: "red", label: "Critical Risk" },
} as const;

export const LOG_LEVELS = [
  "DEBUG", "INFO", "WARN", "ERROR", "CRITICAL"
] as const;

export const TIME_FILTERS = [
  { id: "1h", name: "Last Hour" },
  { id: "24h", name: "Last 24 Hours" },
  { id: "7d", name: "Last 7 Days" },
  { id: "30d", name: "Last 30 Days" },
] as const;

export const CURRENCY_PAIRS_INFO = {
  EURUSD: { name: "Euro / US Dollar", pip: 0.0001, digits: 4 },
  GBPUSD: { name: "British Pound / US Dollar", pip: 0.0001, digits: 4 },
  USDJPY: { name: "US Dollar / Japanese Yen", pip: 0.01, digits: 2 },
  AUDUSD: { name: "Australian Dollar / US Dollar", pip: 0.0001, digits: 4 },
  USDCAD: { name: "US Dollar / Canadian Dollar", pip: 0.0001, digits: 4 },
  NZDUSD: { name: "New Zealand Dollar / US Dollar", pip: 0.0001, digits: 4 },
} as const;

export const DEFAULT_STRATEGY_PARAMETERS = {
  breakout: {
    donchianPeriod: 20,
    atrPeriod: 14,
    riskPercent: 1.0,
    stopLossMultiplier: 2.0,
    takeProfitMultiplier: 3.0,
  },
  "mean-reversion": {
    rsiPeriod: 14,
    rsiOverbought: 70,
    rsiOversold: 30,
    bollingerPeriod: 20,
    bollingerStdDev: 2.0,
    riskPercent: 0.8,
  },
  "trend-follow": {
    fastEma: 12,
    slowEma: 26,
    signalEma: 9,
    atrPeriod: 14,
    riskPercent: 1.2,
    stopLossMultiplier: 2.5,
    takeProfitMultiplier: 4.0,
  },
} as const;

export const PROP_FIRM_RULES = {
  default: {
    dailyLossLimit: 5000,
    maxDrawdownLimit: 15,
    maxExposure: 75000,
    maxPositions: 10,
    maxLotSize: 1.0,
    riskPerTrade: 2.0,
    newsBlackoutMinutes: 30,
  },
  ftmo: {
    dailyLossLimit: 5000,
    maxDrawdownLimit: 10,
    maxExposure: 100000,
    maxPositions: 15,
    maxLotSize: 2.0,
    riskPerTrade: 1.5,
    newsBlackoutMinutes: 15,
  },
  myforexfunds: {
    dailyLossLimit: 4000,
    maxDrawdownLimit: 12,
    maxExposure: 80000,
    maxPositions: 12,
    maxLotSize: 1.5,
    riskPerTrade: 2.0,
    newsBlackoutMinutes: 30,
  },
} as const;
