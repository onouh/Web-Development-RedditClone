import { Server } from 'socket.io';
import { env } from '../config/env.js';
import { User } from '../models/User.js';
import { verifyAccessToken } from '../utils/tokens.js';
import { setIO } from './realtime.js';
import { markConversationRead, requireParticipant, sendMessage } from '../services/chatService.js';

const online = new Map(); // userId -> Set<socketId>

const typingPayload = (socket, conversationId, isTyping) => ({
  conversationId: String(conversationId),
  userId: String(socket.user._id),
  username: socket.user.username,
  displayName: socket.user.displayName || socket.user.username,
  isTyping,
});

export function initSocketServer(httpServer) {
  const io = new Server(httpServer, {
    cors: { origin: env.corsOrigins, credentials: true },
    maxHttpBufferSize: 1_000_000,
  });
  setIO(io);

  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token || socket.handshake.query?.token;
      if (!token) return next(new Error('Authentication required'));
      const payload = verifyAccessToken(token);
      const user = await User.findById(payload.sub).select(
        'username displayName avatarUrl postKarma commentKarma createdAt',
      );
      if (!user) return next(new Error('Account not found'));
      socket.user = user;
      return next();
    } catch {
      return next(new Error('Invalid or expired token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = String(socket.user._id);
    socket.join(`user:${userId}`);

    if (!online.has(userId)) online.set(userId, new Set());
    online.get(userId).add(socket.id);
    socket.emit('presence:list', [...online.keys()]);
    io.emit('presence:update', { userId, online: true });

    const safe = (handler) => async (payload, ack) => {
      try {
        const result = await handler(payload || {});
        if (typeof ack === 'function') ack({ ok: true, ...result });
      } catch (error) {
        if (typeof ack === 'function') ack({ ok: false, error: error.message });
      }
    };

    socket.on(
      'conversation:join',
      safe(async ({ conversationId }) => {
        await requireParticipant(conversationId, userId);
        socket.join(`conversation:${conversationId}`);
        return {};
      }),
    );

    socket.on('conversation:leave', ({ conversationId } = {}) => {
      if (conversationId) socket.leave(`conversation:${conversationId}`);
    });

    socket.on(
      'message:send',
      safe(async ({ conversationId, content, tempId }) => {
        const message = await sendMessage({ conversationId, senderId: userId, content, tempId });
        return { message };
      }),
    );

    socket.on('typing:start', ({ conversationId } = {}) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing:update', typingPayload(socket, conversationId, true));
    });

    socket.on('typing:stop', ({ conversationId } = {}) => {
      if (!conversationId) return;
      socket.to(`conversation:${conversationId}`).emit('typing:update', typingPayload(socket, conversationId, false));
    });

    socket.on(
      'conversation:read',
      safe(async ({ conversationId }) => {
        await markConversationRead(conversationId, userId);
        socket.to(`conversation:${conversationId}`).emit('conversation:read', {
          conversationId: String(conversationId),
          userId,
        });
        return {};
      }),
    );

    socket.on('disconnect', () => {
      const sockets = online.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          online.delete(userId);
          io.emit('presence:update', { userId, online: false });
        }
      }
    });
  });

  return io;
}
