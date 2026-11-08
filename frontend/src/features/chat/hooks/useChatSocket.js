import { useEffect, useRef } from "react";
import { acquireSocket, releaseSocket } from "../../../services/realtime.js";

/**
 * Realtime subscription for one conversation + the user's list channel.
 * Server auth uses the HttpOnly cookie (withCredentials), so no token needed.
 * All handlers are best-effort, REST polling in Chat.jsx stays authoritative.
 *
 * Uses the tab-wide shared socket (services/realtime.js): switching threads
 * only leaves/joins rooms instead of tearing down and re-handshaking the
 * whole connection.
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
  const handlersRef = useRef({});
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

  // Shared connection + stable listeners for the lifetime of the chat page.
  useEffect(() => {
    if (!enabled) return undefined;
    let socket;
    try {
      socket = acquireSocket();
    } catch {
      return undefined;
    }
    socketRef.current = socket;

    const listeners = {
      "message:new": (msg) => handlersRef.current.onMessage?.(msg),
      "deal:updated": ({ deal } = {}) => handlersRef.current.onDeal?.(deal),
      "message:delivered": (info) => handlersRef.current.onDelivered?.(info),
      "message:read": (info) => handlersRef.current.onRead?.(info),
      typing: (info) => handlersRef.current.onTyping?.(info),
      "presence:update": (info) => handlersRef.current.onPresence?.(info),
      "conversation:updated": (info) => handlersRef.current.onListUpdate?.(info),
      connect: () => handlersRef.current.onStatus?.(true),
      disconnect: () => handlersRef.current.onStatus?.(false),
    };
    Object.entries(listeners).forEach(([event, fn]) => socket.on(event, fn));
    if (socket.connected) handlersRef.current.onStatus?.(true);

    return () => {
      Object.entries(listeners).forEach(([event, fn]) => socket.off(event, fn));
      socketRef.current = null;
      releaseSocket(socket);
    };
  }, [enabled]);

  // Room membership follows the selected conversation. Server-side rooms
  // die on disconnect, so re-join on every (re)connect.
  useEffect(() => {
    const socket = socketRef.current;
    if (!enabled || !socket || !conversationId) return undefined;

    const doJoin = () => {
      try {
        socket.emit("join_conversation", conversationId);
      } catch {
        // ignore
      }
    };
    const onConnect = () => doJoin();
    socket.on("connect", onConnect);
    if (socket.connected) doJoin();

    return () => {
      socket.off("connect", onConnect);
      try {
        socket.emit("leave_conversation", conversationId);
      } catch {
        // ignore
      }
    };
  }, [conversationId, enabled]);

  const sendTyping = (isTyping) => {
    try {
      if (!conversationId) return;
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
