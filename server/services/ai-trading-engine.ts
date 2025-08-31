
import axios from 'axios';
import { mt5Integration } from './mt5-integration';
import { storage } from '../storage';
import { notificationManager } from './notification-manager';

interface AIAnalysis {
  signal: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  reasoning: string;
  entryPrice?: number;
  stopLoss?: number;
  takeProfit?: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

interface MarketContext {
  symbol: string;
  currentPrice: number;
  historicalData: any[];
  technicalIndicators: any;
  marketNews?: string[];
  economicCalendar?: any[];
}

class AITradingEngine {
  private deepseekApiKey: string;
  private baseUrl = 'https://api.deepseek.com/v1/chat/completions';
  private isActive = false;

  constructor() {
    this.deepseekApiKey = process.env.DEEPSEEK_API_KEY || '';
  }

  async initialize(): Promise<boolean> {
    try {
      if (!this.deepseekApiKey) {
        console.error('DeepSeek API key not configured');
        return false;
      }

      // Test API connection
      const testResponse = await this.callDeepSeekAPI('Test connection', 'EURUSD', {
        symbol: 'EURUSD',
        currentPrice: 1.0850,
        historicalData: [],
        technicalIndicators: {}
      });

      console.log('AI Trading Engine initialized with DeepSeek');
      return true;
    } catch (error) {
      console.error('AI Trading Engine initialization failed:', error);
      return false;
    }
  }

  async start(): Promise<void> {
    if (!mt5Integration.isConnected()) {
      throw new Error('MT5 not connected - cannot start AI trading');
    }

    this.isActive = true;
    console.log('🤖 AI Trading Engine started');

    // Start analysis loop
    this.analysisLoop();
  }

  async stop(): Promise<void> {
    this.isActive = false;
    console.log('🤖 AI Trading Engine stopped');
  }

  private async analysisLoop(): Promise<void> {
    while (this.isActive) {
      try {
        // Get available symbols from MT5
        const symbolsResult = await mt5Integration.getSymbols();
        if (!symbolsResult.success) {
          console.error('Failed to get symbols from MT5');
          await new Promise(resolve => setTimeout(resolve, 30000));
          continue;
        }

        // Focus on major forex pairs
        const majorPairs = ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCAD'];
        
        for (const symbol of majorPairs) {
          try {
            await this.analyzeSymbol(symbol);
            // Wait between analyses to avoid API rate limits
            await new Promise(resolve => setTimeout(resolve, 2000));
          } catch (error) {
            console.error(`Analysis error for ${symbol}:`, error);
          }
        }

        // Wait 5 minutes before next full analysis cycle
        await new Promise(resolve => setTimeout(resolve, 300000));
      } catch (error) {
        console.error('AI analysis loop error:', error);
        await new Promise(resolve => setTimeout(resolve, 60000));
      }
    }
  }

  private async analyzeSymbol(symbol: string): Promise<void> {
    try {
      // Get market context
      const context = await this.buildMarketContext(symbol);
      
      // Get AI analysis
      const aiAnalysis = await this.getAIAnalysis(context);
      
      if (aiAnalysis.signal !== 'HOLD' && aiAnalysis.confidence > 70) {
        // Execute trade based on AI recommendation
        await this.executeTrade(symbol, aiAnalysis);
      }

      // Log analysis
      await storage.createAlert({
        level: 'INFO',
        title: `AI Analysis - ${symbol}`,
        message: `Signal: ${aiAnalysis.signal}, Confidence: ${aiAnalysis.confidence}%`,
        source: 'AI_TRADING_ENGINE',
      });

    } catch (error) {
      console.error(`Symbol analysis error for ${symbol}:`, error);
    }
  }

  private async buildMarketContext(symbol: string): Promise<MarketContext> {
    // Get current tick data
    const tickResult = await mt5Integration.getTickData(symbol);
    const currentPrice = tickResult.success ? tickResult.tick.bid : 1.0850;

    // Get historical data (last 100 bars, 1-hour timeframe)
    const histResult = await mt5Integration.getMarketData(symbol, 'H1', 100);
    const historicalData = histResult.success ? histResult.data : [];

    // Calculate technical indicators
    const technicalIndicators = this.calculateTechnicalIndicators(historicalData);

    return {
      symbol,
      currentPrice,
      historicalData,
      technicalIndicators
    };
  }

  private calculateTechnicalIndicators(data: any[]): any {
    if (data.length < 20) return {};

    const closes = data.map(d => d.close);
    
    // Simple Moving Averages
    const sma20 = this.calculateSMA(closes, 20);
    const sma50 = this.calculateSMA(closes, 50);
    
    // RSI
    const rsi = this.calculateRSI(closes, 14);
    
    // MACD
    const macd = this.calculateMACD(closes);

    return {
      sma20,
      sma50,
      rsi,
      macd: macd.signal,
      trend: sma20 > sma50 ? 'BULLISH' : 'BEARISH'
    };
  }

  private calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const recentPrices = prices.slice(-period);
    return recentPrices.reduce((sum, price) => sum + price, 0) / period;
  }

  private calculateRSI(prices: number[], period: number): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) gains += change;
      else losses += Math.abs(change);
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    
    return 100 - (100 / (1 + rs));
  }

  private calculateMACD(prices: number[]): { signal: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    const signalLine = this.calculateEMA([macdLine], 9);
    
    return {
      signal: macdLine - signalLine,
      histogram: macdLine - signalLine
    };
  }

  private calculateEMA(prices: number[], period: number): number {
    if (prices.length === 0) return 0;
    const multiplier = 2 / (period + 1);
    let ema = prices[0];
    
    for (let i = 1; i < prices.length; i++) {
      ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  }

  private async getAIAnalysis(context: MarketContext): Promise<AIAnalysis> {
    const prompt = `
You are an expert forex trader analyzing the ${context.symbol} pair. Based on the following market data, provide a trading recommendation:

Current Price: ${context.currentPrice}
Technical Indicators: ${JSON.stringify(context.technicalIndicators, null, 2)}
Recent Price Action: ${context.historicalData.slice(-10).map(d => d.close).join(', ')}

Please analyze:
1. Price action and trend direction
2. Technical indicator signals (RSI, MACD, SMA crossovers)
3. Support/resistance levels
4. Risk assessment

Provide your response as JSON with:
- signal: "BUY", "SELL", or "HOLD"
- confidence: number from 0-100
- reasoning: detailed explanation
- entryPrice: suggested entry price (optional)
- stopLoss: suggested stop loss (optional)
- takeProfit: suggested take profit (optional)
- riskLevel: "LOW", "MEDIUM", or "HIGH"

Only recommend BUY/SELL if confidence is above 70%. Focus on risk management.
`;

    try {
      const analysis = await this.callDeepSeekAPI(prompt, context.symbol, context);
      return this.parseAIResponse(analysis);
    } catch (error) {
      console.error('AI analysis error:', error);
      return {
        signal: 'HOLD',
        confidence: 0,
        reasoning: 'AI analysis failed',
        riskLevel: 'HIGH'
      };
    }
  }

  private async callDeepSeekAPI(prompt: string, symbol: string, context: MarketContext): Promise<string> {
    try {
      const response = await axios.post(this.baseUrl, {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: 'You are a professional forex trader with 15+ years of experience. Provide concise, actionable trading advice based on technical analysis.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 500,
        temperature: 0.3
      }, {
        headers: {
          'Authorization': `Bearer ${this.deepseekApiKey}`,
          'Content-Type': 'application/json'
        }
      });

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('DeepSeek API error:', error);
      throw error;
    }
  }

  private parseAIResponse(response: string): AIAnalysis {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          signal: parsed.signal || 'HOLD',
          confidence: parsed.confidence || 0,
          reasoning: parsed.reasoning || 'No reasoning provided',
          entryPrice: parsed.entryPrice,
          stopLoss: parsed.stopLoss,
          takeProfit: parsed.takeProfit,
          riskLevel: parsed.riskLevel || 'MEDIUM'
        };
      }
      
      // Fallback parsing
      return {
        signal: 'HOLD',
        confidence: 0,
        reasoning: response,
        riskLevel: 'HIGH'
      };
    } catch (error) {
      return {
        signal: 'HOLD',
        confidence: 0,
        reasoning: 'Failed to parse AI response',
        riskLevel: 'HIGH'
      };
    }
  }

  private async executeTrade(symbol: string, analysis: AIAnalysis): Promise<void> {
    try {
      // Check current positions to avoid overexposure
      const positionsResult = await mt5Integration.getPositions();
      if (!positionsResult.success) {
        console.error('Failed to get positions from MT5');
        return;
      }

      const existingPositions = positionsResult.positions.filter((pos: any) => pos.symbol === symbol);
      if (existingPositions.length > 0) {
        console.log(`Skipping ${symbol} - position already exists`);
        return;
      }

      // Calculate position size (1% risk per trade)
      const accountResult = await mt5Integration.getAccountInfo();
      if (!accountResult.success) {
        console.error('Failed to get account info');
        return;
      }

      const balance = accountResult.account.balance;
      const riskAmount = balance * 0.01; // 1% risk
      const stopDistance = analysis.stopLoss ? Math.abs(analysis.entryPrice! - analysis.stopLoss) : 0.01;
      const positionSize = Math.min(0.1, riskAmount / (stopDistance * 100000)); // Standard lot calculation

      // Place order through MT5
      const orderResult = await mt5Integration.placeOrder(
        symbol,
        analysis.signal,
        positionSize,
        analysis.entryPrice,
        analysis.stopLoss,
        analysis.takeProfit,
        `AI Trade: ${analysis.confidence}% confidence`
      );

      if (orderResult.success) {
        console.log(`✅ AI Trade executed: ${analysis.signal} ${symbol} (${analysis.confidence}% confidence)`);
        
        // Log trade
        await storage.createAlert({
          level: 'INFO',
          title: 'AI Trade Executed',
          message: `${analysis.signal} ${symbol} - ${analysis.reasoning}`,
          source: 'AI_TRADING_ENGINE',
        });

        // Send notification
        await notificationManager.sendAlert('INFO', 
          `🤖 AI Trade: ${analysis.signal} ${symbol} at ${analysis.entryPrice} (${analysis.confidence}% confidence)`
        );
      } else {
        console.error(`❌ AI Trade failed for ${symbol}:`, orderResult.error);
        
        await storage.createAlert({
          level: 'WARNING',
          title: 'AI Trade Failed',
          message: `Failed to execute ${analysis.signal} ${symbol}: ${orderResult.error}`,
          source: 'AI_TRADING_ENGINE',
        });
      }
    } catch (error) {
      console.error('Trade execution error:', error);
    }
  }

  async emergencyCloseAll(): Promise<void> {
    try {
      const positionsResult = await mt5Integration.getPositions();
      if (!positionsResult.success) return;

      for (const position of positionsResult.positions) {
        await mt5Integration.closePosition(position.ticket);
        console.log(`Emergency closed position: ${position.symbol} ticket ${position.ticket}`);
      }

      await notificationManager.sendAlert('CRITICAL', 
        '🚨 Emergency: All AI trading positions closed'
      );
    } catch (error) {
      console.error('Emergency close error:', error);
    }
  }

  isHealthy(): boolean {
    return this.isActive && mt5Integration.isConnected();
  }

  getStatus(): any {
    return {
      active: this.isActive,
      mt5Connected: mt5Integration.isConnected(),
      demoMode: mt5Integration.isDemoMode(),
      apiConfigured: !!this.deepseekApiKey
    };
  }
}

export const aiTradingEngine = new AITradingEngine();
