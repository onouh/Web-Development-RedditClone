/** Tiny registry so services can push realtime events without importing the socket server. */
let io = null;

export const setIO = (instance) => {
  io = instance;
};

export const getIO = () => io;

export const emitToUser = (userId, event, payload) => {
  if (!io || !userId) return;
  io.to(`user:${String(userId)}`).emit(event, payload);
};

export const emitToConversation = (conversationId, event, payload) => {
  if (!io) return;
  io.to(`conversation:${String(conversationId)}`).emit(event, payload);
};
