import { useEffect, useRef } from "react";
import { io, Socket } from "socket.io-client";

const SERVER_URL = "http://localhost:3001"; // Match your backend port

export const useSocket = () => {
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    socketRef.current = io(SERVER_URL);

    return () => {
      socketRef.current?.disconnect();
    };
  }, []);

  return socketRef.current;
};