import { useEffect, useRef } from "react";
import { io } from "socket.io-client";

const baseURL = import.meta.env.VITE_API_BASE_URL || "";
// Socket server = API origin (strip trailing /api if present).
const socketURL = baseURL.replace(/\/api\/?$/, "") || undefined;

/**
 * Realtime subscription for one conversation + the user's list channel.
 * Server auth uses the HttpOnly cookie (withCredentials), so no token needed.
 * All handlers are best-effort, REST polling in Chat.jsx stays authoritative.
 *
 * Tick lifecycle events:
 * - message:new -> a new bubble (receiver side marks read if thread open)
 * - message:delivered -> sender upgrades ✓ to ✓✓ (grey)
 * - message:read -> sender upgrades ✓✓ to blue, ONLY when readBy is the peer
 * - presence:update -> who is inside this thread right now (Online dot)
 */
export const useChatSocket = ({
  conversationId,
  onMessage,
  onDeal,
  onDelivered,
  onRead,
  onTyping,
  onPresence,
  onStatus,
  onListUpdate,
  enabled = true,
}) => {
  const socketRef = useRef(null);
  const handlersRef = useRef({
    onMessage,
    onDeal,
    onDelivered,
    onRead,
    onTyping,
    onPresence,
    onStatus,
    onListUpdate,
  });
  handlersRef.current = {
    onMessage,
    onDeal,
    onDelivered,
    onRead,
    onTyping,
    onPresence,
    onStatus,
    onListUpdate,
  };

  useEffect(() => {
    if (!enabled) return undefined;
    let socket;
    try {
      socket = io(socketURL, {
        withCredentials: true,
        transports: ["websocket", "polling"],
      });
    } catch {
      return undefined;
    }
    socketRef.current = socket;

    const doJoin = () => {
      try {
        if (conversationId) socket.emit("join_conversation", conversationId);
      } catch {
        // ignore
      }
    };

    socket.on("message:new", (msg) => handlersRef.current.onMessage?.(msg));
    socket.on("deal:updated", ({ deal } = {}) =>
      handlersRef.current.onDeal?.(deal),
    );
    socket.on("message:delivered", (info) =>
      handlersRef.current.onDelivered?.(info),
    );
    socket.on("message:read", (info) => handlersRef.current.onRead?.(info));
    socket.on("typing", (info) => handlersRef.current.onTyping?.(info));
    socket.on("presence:update", (info) =>
      handlersRef.current.onPresence?.(info),
    );
    socket.on("conversation:updated", (info) =>
      handlersRef.current.onListUpdate?.(info),
    );
    // Server-side rooms die on disconnect, re-join on every (re)connect
    // or realtime silently stops after a network blip.
    socket.on("connect", () => {
      doJoin();
      handlersRef.current.onStatus?.(true);
    });
    socket.on("disconnect", () => handlersRef.current.onStatus?.(false));

    doJoin();

    return () => {
      try {
        if (conversationId) socket.emit("leave_conversation", conversationId);
        socket.disconnect();
      } catch {
        // ignore
      }
      socketRef.current = null;
    };
  }, [conversationId, enabled]);

  const sendTyping = (isTyping) => {
    try {
      socketRef.current?.emit("typing", {
        conversationId,
        isTyping: Boolean(isTyping),
      });
    } catch {
      // ignore
    }
  };

  return { sendTyping };
};
