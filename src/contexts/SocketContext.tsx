import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { io, type Socket } from "socket.io-client";
import { useAuth } from "@/contexts/AuthContext";
import { resolveSocketBaseUrl } from "@/lib/runtimeConfig";

interface SocketContextType {
  socket: Socket | null;
  onlineUsers: string[];
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType>({ socket: null, onlineUsers: [], isConnected: false });

export const SocketProvider = ({ children }: { children: ReactNode }) => {
  const { token, isAuthenticated } = useAuth();
  // The socket lives in STATE (not a ref) so consumers re-render and attach their listeners once it exists.
  const [socket, setSocket] = useState<Socket | null>(null);
  const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      setSocket(null);
      setIsConnected(false);
      setOnlineUsers([]);
      return;
    }
    const s = io(resolveSocketBaseUrl(), {
      auth: { token },
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 10000,
    });
    s.on("connect", () => setIsConnected(true));
    s.on("disconnect", () => setIsConnected(false));
    s.on("connect_error", () => setIsConnected(false));
    s.on("users:online", (users: string[]) => setOnlineUsers(users));
    setSocket(s);
    return () => {
      s.disconnect();
      setSocket(null);
      setIsConnected(false);
    };
  }, [isAuthenticated, token]);

  return <SocketContext.Provider value={{ socket, onlineUsers, isConnected }}>{children}</SocketContext.Provider>;
};

export const useSocket = () => useContext(SocketContext);
