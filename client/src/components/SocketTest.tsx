import React, { useEffect, useState } from "react";
import { io, Socket } from "socket.io-client";

const SERVER_URL = "http://localhost:3001";

export const SocketTest: React.FC = () => {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket: Socket = io(SERVER_URL);

    socket.on("connect", () => {
      setConnected(true);
      console.log("Connected to server with id:", socket.id);
    });

    socket.on("disconnect", () => {
      setConnected(false);
      console.log("Disconnected from server");
    });

    // Clean up on unmount
    return () => {
      socket.disconnect();
    };
  }, []);

  return (
    <div>
      <h2>Socket.IO Connection Test</h2>
      <p>Status: {connected ? "Connected lolll" : "Not connected"}</p>
    </div>
  );
};