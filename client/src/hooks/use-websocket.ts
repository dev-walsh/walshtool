import { useEffect, useRef, useState } from "react";
import { queryClient } from "@/lib/queryClient";

interface WebSocketMessage {
  type: string;
  data?: any;
  payload?: any;
  timestamp?: string;
}

export function useWebSocket(url: string = '/ws') {
  const [isConnected, setIsConnected] = useState(false);
  const [lastMessage, setLastMessage] = useState<WebSocketMessage | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const reconnectAttempts = useRef(0);

  const connect = () => {
    try {
      const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
      const wsUrl = `${protocol}//${window.location.host}${url}`;

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log("WebSocket connected");
        setIsConnected(true);
        reconnectAttempts.current = 0;

        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
          reconnectTimeoutRef.current = null;
        }
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          console.log('WebSocket message received:', data);

          // Validate message structure
          if (!data || typeof data !== 'object' || !data.type) {
            console.warn('Invalid WebSocket message format:', data);
            return;
          }

          setLastMessage(data as WebSocketMessage);
          handleWebSocketMessage(data as WebSocketMessage);
        } catch (error) {
          console.error("Failed to parse WebSocket message:", error);
        }
      };

      ws.onclose = (event) => {
        console.log("WebSocket disconnected:", event.code, event.reason);
        setIsConnected(false);
        wsRef.current = null;

        // Attempt to reconnect with exponential backoff
        if (reconnectAttempts.current < 5) {
          const delay = Math.min(1000 * Math.pow(2, reconnectAttempts.current), 30000);
          reconnectTimeoutRef.current = setTimeout(() => {
            reconnectAttempts.current++;
            console.log('Attempting to reconnect WebSocket...');
            connect();
          }, delay);
        }
      };

      ws.onerror = (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error("Failed to connect WebSocket:", error);
      setIsConnected(false);
    }
  };

  const handleWebSocketMessage = (data: WebSocketMessage) => {
    switch (data.type) {
      case "PRICE_UPDATE":
        // Update market data in cache
        queryClient.setQueryData(["market-data", data.data?.symbol], data.data);
        break;

      case "STRATEGY_STARTED":
      case "STRATEGY_STOPPED":
      case "STRATEGY_UPDATED":
        // Invalidate strategies query to refetch
        queryClient.invalidateQueries({ queryKey: ["/api/strategies"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        break;

      case "POSITION_OPENED":
      case "POSITION_CLOSED":
      case "POSITION_UPDATED":
        // Invalidate positions and dashboard queries
        queryClient.invalidateQueries({ queryKey: ["/api/positions"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        break;

      case "ORDER_FILLED":
      case "ORDER_CANCELLED":
        // Invalidate orders query
        queryClient.invalidateQueries({ queryKey: ["/api/orders"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        break;

      case "RISK_EVENT":
        // Invalidate risk data
        queryClient.invalidateQueries({ queryKey: ["/api/risk/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/risk/events"] });
        break;

      case "ALERT_CREATED":
      case "ALERT_UPDATE":
        // Invalidate alerts
        queryClient.invalidateQueries({ queryKey: ["/api/alerts"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        break;

      case "LOG_UPDATE":
        // Handle log updates - this will be processed by individual components
        break;

      case "EMERGENCY_STOP":
        // Force refresh all data
        queryClient.invalidateQueries();
        break;

      case "SYSTEM_STATUS_UPDATE":
        // Update system status
        queryClient.invalidateQueries({ queryKey: ["/api/system/status"] });
        queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
        break;

      case 'DASHBOARD_UPDATE':
          queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
          break;

        case 'POSITIONS_UPDATE':
        case 'POSITIONS_UPDATED':
          queryClient.invalidateQueries({ queryKey: ['/api/positions'] });
          if (data.payload) {
            console.log("Positions updated:", data.payload);
          }
          break;

        case 'RISK_UPDATE':
          queryClient.invalidateQueries({ queryKey: ['/api/risk'] });
          break;

        case 'STRATEGY_UPDATE':
          queryClient.invalidateQueries({ queryKey: ['/api/strategies'] });
          break;

        case 'SYSTEM_HEALTH_UPDATE':
          queryClient.invalidateQueries({ queryKey: ['/api/system/health'] });
          break;
      default:
          console.log('Unknown WebSocket message type:', data.type);
      }
  };

  useEffect(() => {
    connect();

    return () => {
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [url]);

  const sendMessage = (message: any) => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify(message));
    } else {
      console.warn("WebSocket is not connected");
    }
  };

  return {
    isConnected,
    lastMessage,
    sendMessage,
  };
}