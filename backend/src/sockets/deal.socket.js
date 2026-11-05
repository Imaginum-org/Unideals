// Deal lifecycle broadcasts (deal:updated) are emitted from
// services/deal.service.js via utils/socket.js so REST + sockets stay
// consistent. Kept as a module for future deal-specific events.
export const registerDealHandlers = () => {};
