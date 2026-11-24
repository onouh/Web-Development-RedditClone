import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { getAccessToken, refreshSession, setAccessToken, socketOrigin } from '../lib/api.js';
import { useAuth } from './AuthContext.jsx';

const SocketContext = createContext({ socket: null, online: new Set() });

export function SocketProvider({ children }) {
  const { token } = useAuth();
  const [socket, setSocket] = useState(null);
  const [online, setOnline] = useState(new Set());

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setOnline(new Set());
      return undefined;
    }

    const connection = io(socketOrigin(), {
      // Read the module token on every (re)connect so a rotated access token is used.
      auth: (callback) => callback({ token: getAccessToken() || token }),
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 8,
    });

    let refreshed = false;
    connection.on('connect_error', async (error) => {
      if (refreshed || !/auth|token|expired/i.test(error.message)) return;
      refreshed = true;
      try {
        const session = await refreshSession();
        setAccessToken(session.accessToken);
        connection.auth = { token: session.accessToken };
        connection.connect();
      } catch {
        // The user will be asked to log in again on the next action.
      }
    });

    connection.on('presence:list', (ids) => setOnline(new Set(ids)));
    connection.on('presence:update', ({ userId, online: isOnline }) => {
      setOnline((current) => {
        const next = new Set(current);
        if (isOnline) next.add(userId);
        else next.delete(userId);
        return next;
      });
    });

    setSocket(connection);
    return () => {
      connection.disconnect();
      setSocket(null);
    };
  }, [token]);

  const value = useMemo(() => ({ socket, online }), [socket, online]);
  return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
