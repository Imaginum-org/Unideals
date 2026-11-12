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

// One emit across many user rooms: socket.io de-duplicates sockets that sit
// in several of the rooms, so nobody gets the event twice.
export const emitToUsers = (userIds, event, payload) => {
  try {
    if (!ioInstance || !userIds?.length) return;
    ioInstance.to(userIds.map((id) => `user:${id}`)).emit(event, payload);
  } catch {
    // ignore
  }
};

// Distinct user ids currently connected to any of the given rooms.
export const onlineUserIdsIn = async (rooms) => {
  try {
    if (!ioInstance || !rooms?.length) return new Set();
    const sockets = await ioInstance.in(rooms).fetchSockets();
    return new Set(sockets.map((s) => s.userId).filter(Boolean).map(String));
  } catch {
    return new Set();
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

