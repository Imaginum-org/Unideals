// Singleton holder for the socket.io server instance.
// Services/controllers emit via getIO() without importing the socket layer
// (avoids circular deps). No-op when sockets aren't initialised (tests/REST-only).
let ioInstance = null;

export const setIO = (io) => {
  ioInstance = io;
};

export const getIO = () => ioInstance;

export const emitToConversation = (conversationId, event, payload) => {
  try {
    ioInstance?.to(`conversation:${conversationId}`)?.emit(event, payload);
  } catch {
    // realtime is best-effort — REST remains source of truth
  }
};

export const emitToUser = (userId, event, payload) => {
  try {
    ioInstance?.to(`user:${userId}`)?.emit(event, payload);
  } catch {
    // ignore
  }
};
