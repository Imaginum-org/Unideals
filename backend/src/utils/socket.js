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

export const emitToCampus = (campusId, event, payload) => {
  try {
    ioInstance?.to(`campus:${campusId}`)?.emit(event, payload);
  } catch {
    // ignore
  }
};

export const emitToAll = (event, payload) => {
  try {
    ioInstance?.to("broadcast:all")?.emit(event, payload);
  } catch {
    // ignore
  }
};

export const getActiveUserCount = () => {
  try {
    if (!ioInstance) return 0;
    const sockets = ioInstance.sockets?.sockets;
    if (!sockets) return 0;
    const userIds = new Set();
    for (const [_, s] of sockets) {
      if (s.userId) userIds.add(s.userId);
    }
    return userIds.size;
  } catch {
    return 0;
  }
};

