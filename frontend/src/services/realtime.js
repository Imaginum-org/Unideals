import { io } from "socket.io-client";

// One shared Socket.IO connection per tab.
//
// Previously NotificationContext, the chat hook, and the orders page each
// called io() — socket.io-client opens a NEW connection when a namespace is
// already in use, so a tab held up to 3 WebSockets, and the chat hook tore
// its socket down and re-handshaked (cookie auth + DB lookup server-side)
// on every conversation switch. Consumers now acquire this shared socket,
// attach/detach their own listeners, and release it when done. The
// connection closes once the last consumer releases it (e.g. on logout), so
// the next login handshakes with fresh cookies.

const baseURL = import.meta.env.VITE_API_BASE_URL || "";
const socketURL = baseURL.replace(/\/api\/?$/, "") || undefined;

let socket = null;
let refCount = 0;

export const acquireSocket = () => {
  if (!socket) {
    socket = io(socketURL, {
      withCredentials: true,
      transports: ["websocket", "polling"],
    });
  }
  refCount += 1;
  return socket;
};

export const releaseSocket = (instance) => {
  if (!instance || instance !== socket) return;
  refCount = Math.max(0, refCount - 1);
  if (refCount === 0) {
    try {
      socket.disconnect();
    } catch {
      // ignore
    }
    socket = null;
  }
};
