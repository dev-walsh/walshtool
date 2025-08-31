
import { logger } from "./logger";

interface TradingSession {
  name: string;
  startTime: string; // HH:MM format
  endTime: string;
  timezone: string;
  allowedSymbols: string[];
  isActive: boolean;
}

interface NewsEvent {
  time: string;
  currency: string;
  impact: "LOW" | "MEDIUM" | "HIGH";
  title: string;
  bufferMinutes: number;
}

class SessionManager {
  private sessions: TradingSession[] = [
    {
      name: "London Session",
      startTime: "08:00",
      endTime: "17:00",
      timezone: "Europe/London",
      allowedSymbols: ["EURUSD", "GBPUSD", "EURGBP"],
      isActive: true,
    },
    {
      name: "New York Session",
      startTime: "13:00",
      endTime: "22:00",
      timezone: "America/New_York",
      allowedSymbols: ["EURUSD", "GBPUSD", "USDJPY", "USDCAD"],
      isActive: true,
    },
    {
      name: "Asian Session",
      startTime: "00:00",
      endTime: "09:00",
      timezone: "Asia/Tokyo",
      allowedSymbols: ["USDJPY", "AUDUSD", "NZDUSD"],
      isActive: true,
    },
  ];

  private newsEvents: NewsEvent[] = [];
  private isNewsBlackout = false;

  async isSymbolTradeable(symbol: string): Promise<{ allowed: boolean; reason?: string }> {
    // Check if in news blackout
    if (this.isNewsBlackout) {
      return { allowed: false, reason: "News blackout period active" };
    }

    // Check session times
    const currentTime = new Date();
    const activeSession = this.sessions.find(session => {
      if (!session.isActive) return false;
      
      const [startHour, startMin] = session.startTime.split(':').map(Number);
      const [endHour, endMin] = session.endTime.split(':').map(Number);
      
      const sessionStart = new Date(currentTime);
      sessionStart.setHours(startHour, startMin, 0, 0);
      
      const sessionEnd = new Date(currentTime);
      sessionEnd.setHours(endHour, endMin, 0, 0);
      
      return currentTime >= sessionStart && currentTime <= sessionEnd && 
             session.allowedSymbols.includes(symbol);
    });

    if (!activeSession) {
      return { allowed: false, reason: "Outside active trading session" };
    }

    return { allowed: true };
  }

  async addNewsEvent(event: NewsEvent): Promise<void> {
    this.newsEvents.push(event);
    
    await logger.log({
      type: "SYSTEM",
      level: "INFO",
      message: `News event added: ${event.title}`,
      details: event
    });

    // Set up blackout period
    this.scheduleNewsBlackout(event);
  }

  private scheduleNewsBlackout(event: NewsEvent): void {
    const eventTime = new Date(event.time);
    const blackoutStart = new Date(eventTime.getTime() - (event.bufferMinutes * 60000));
    const blackoutEnd = new Date(eventTime.getTime() + (event.bufferMinutes * 60000));
    
    const now = new Date();
    
    if (now >= blackoutStart && now <= blackoutEnd) {
      this.isNewsBlackout = true;
      logger.log({
        type: "SYSTEM",
        level: "WARN",
        message: `News blackout started: ${event.title}`,
        details: { event, blackoutEnd }
      });
    }
    
    // Schedule blackout end
    if (now < blackoutEnd) {
      setTimeout(() => {
        this.isNewsBlackout = false;
        logger.log({
          type: "SYSTEM",
          level: "INFO",
          message: `News blackout ended: ${event.title}`
        });
      }, blackoutEnd.getTime() - now.getTime());
    }
  }

  getSessions(): TradingSession[] {
    return [...this.sessions];
  }

  async updateSession(sessionName: string, updates: Partial<TradingSession>): Promise<void> {
    const sessionIndex = this.sessions.findIndex(s => s.name === sessionName);
    if (sessionIndex >= 0) {
      this.sessions[sessionIndex] = { ...this.sessions[sessionIndex], ...updates };
      
      await logger.log({
        type: "SYSTEM",
        level: "INFO",
        message: `Trading session updated: ${sessionName}`,
        details: updates
      });
    }
  }

  isNewsBlackoutActive(): boolean {
    return this.isNewsBlackout;
  }

  getUpcomingNewsEvents(hours: number = 24): NewsEvent[] {
    const now = new Date();
    const cutoff = new Date(now.getTime() + (hours * 60 * 60 * 1000));
    
    return this.newsEvents.filter(event => {
      const eventTime = new Date(event.time);
      return eventTime > now && eventTime <= cutoff;
    });
  }
}

export const sessionManager = new SessionManager();
