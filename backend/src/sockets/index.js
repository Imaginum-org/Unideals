import { Server } from "socket.io";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import Conversation from "../models/conversation.model.js";
import User from "../models/User.model.js";
import { USER_STATUS } from "../config/constants.js";
import { setIO } from "../utils/socket.js";

const parseCookies = (header) => {
  const out = {};
  if (!header) return out;
  header.split(";").forEach((part) => {
    const [k, ...rest] = part.trim().split("=");
    if (k) out[k.trim()] = decodeURIComponent(rest.join("=") || "");
  });
  return out;
};

const authSocket = async (socket, next) => {
  try {
    // Token via auth payload (client sends from memory) or HttpOnly cookie.
    let token =
      socket.handshake.auth?.token ||
      socket.handshake.headers?.authorization?.replace("Bearer ", "");
    if (!token) {
      const cookies = parseCookies(socket.handshake.headers?.cookie || "");
      token = cookies.accessToken;
    }
    if (!token) return next(new Error("Unauthorized"));

    const decoded = jwt.verify(token, process.env.SECRET_KEY_ACCESS_TOKEN, {
      algorithms: ["HS256"],
    });
    if (typeof decoded?.v !== "number" || !decoded?.id) {
      return next(new Error("Unauthorized"));
    }
    // Session + account check per connection (cheap, once per socket).
    // Revoked sessions and suspended users get no realtime channel.
    const user = await User.findById(decoded.id)
      .select("_id status tokenVersion campus_id")
      .lean();
    if (
      !user ||
      user.status !== USER_STATUS.ACTIVE ||
      user.tokenVersion !== decoded.v
    ) {
      return next(new Error("Unauthorized"));
    }
    socket.userId = String(user._id);
    socket.campusId = user.campus_id ? String(user.campus_id) : null;
    return next();
  } catch {
    return next(new Error("Unauthorized"));
  }
};

// Broadcast who is currently inside a conversation room so both sides can
// render live "Online" presence. Room-scoped: no global user tracking.
const emitPresence = async (io, conversationId) => {
  try {
    const room = `conversation:${conversationId}`;
    const sockets = await io.in(room).fetchSockets();
    const onlineUserIds = [
      ...new Set(sockets.map((s) => s.userId).filter(Boolean)),
    ];
    io.to(room).emit("presence:update", {
      conversationId: String(conversationId),
      onlineUserIds,
    });
  } catch {
    // presence is best-effort
  }
};

export const initSockets = (httpServer) => {
  const frontend = (process.env.FRONTEND_URL || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const io = new Server(httpServer, {
    cors: {
      origin: [...frontend, "http://localhost:5173", "http://127.0.0.1:5173"],
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(authSocket);
  setIO(io);

  io.on("connection", (socket) => {
    const userId = socket.userId;
    socket.join(`user:${userId}`);
    socket.join("broadcast:all");
    if (socket.campusId) {
      socket.join(`campus:${socket.campusId}`);
    }

    // Join a conversation room after verifying participation.
    socket.on("join_conversation", async (conversationId, ack) => {
      try {
        if (!mongoose.Types.ObjectId.isValid(conversationId)) {
          ack?.({ ok: false, error: "Invalid conversation" });
          return;
        }
        const conv = await Conversation.findById(conversationId).select(
          "buyer_id seller_id",
        );
        if (
          !conv ||
          (String(conv.buyer_id) !== userId &&
            String(conv.seller_id) !== userId)
        ) {
          ack?.({ ok: false, error: "No access" });
          return;
        }
        socket.join(`conversation:${conversationId}`);
        ack?.({ ok: true });
        emitPresence(io, conversationId);
      } catch {
        ack?.({ ok: false });
      }
    });

    socket.on("leave_conversation", (conversationId) => {
      socket.leave(`conversation:${conversationId}`);
      emitPresence(io, conversationId);
    });

    // Ephemeral typing indicator, relayed to the room (no persistence).
    // Flood-guarded: "still typing" at most ~1/sec per socket, "stopped"
    // always passes so the indicator never sticks on.
    socket.on("typing", ({ conversationId, isTyping }) => {
      if (!mongoose.Types.ObjectId.isValid(conversationId)) return;
      const now = Date.now();
      if (isTyping && now - (socket._lastType || 0) < 900) return;
      socket._lastType = now;
      socket.to(`conversation:${conversationId}`).emit("typing", {
        conversationId: String(conversationId),
        userId,
        isTyping: Boolean(isTyping),
      });
    });

    // Capture watched threads while rooms are still visible; the actual
    // broadcast happens on "disconnect" (membership already removed then),
    // so the peer flips to offline instead of seeing a stale self-echo.
    socket.on("disconnecting", () => {
      socket._convRooms = [...socket.rooms].filter((room) =>
        room.startsWith("conversation:"),
      );
    });

    socket.on("disconnect", () => {
      for (const room of socket._convRooms || []) {
        emitPresence(io, room.replace("conversation:", ""));
      }
    });
  });

  return io;
};
