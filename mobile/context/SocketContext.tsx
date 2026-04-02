import { socketService } from "@/services/socket";
import React, { createContext, ReactNode, useContext, useEffect } from "react";

interface SocketContextType {
  isConnected: boolean;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: ReactNode }) {
  useEffect(() => {
    // Connect to socket when app starts
    console.log("[SocketContext] Initializing socket connection");
    socketService.connect();

    // Cleanup on unmount (app close)
    return () => {
      console.log("[SocketContext] App closing, disconnecting socket");
      socketService.disconnect();
    };
  }, []);

  const contextValue: SocketContextType = {
    isConnected: socketService.isConnected(),
  };

  return (
    <SocketContext.Provider value={contextValue}>
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error("useSocket must be used within a SocketProvider");
  }
  return context;
}
