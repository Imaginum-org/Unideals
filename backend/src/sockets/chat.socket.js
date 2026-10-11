// Chat room handlers are registered in sockets/index.js
// (join_conversation / typing). Message persistence goes through the
// REST services so HTTP remains the source of truth; realtime events
// (message:new, message:read, deal:updated) are emitted from services
// via utils/socket.js. Kept as a module for future chat-specific events.
export const registerChatHandlers = () => {};
