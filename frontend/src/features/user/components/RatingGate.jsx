import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { useUser } from "../../../context/useUserContext.jsx";
import { acquireSocket, releaseSocket } from "../../../services/realtime.js";
import { fetchPendingReviews } from "../api/reviewApi.js";
import { formatName } from "../../chat/utils/display.js";
import RateSellerDialog from "./RateSellerDialog.jsx";

/*
 * Post-deal rating popup, app-wide. As soon as a deal completes, both the
 * buyer and the seller get a popup to rate the other side. It can't be
 * dismissed: the only way out is to submit a rating. Several unrated deals
 * are asked one after another. The queue comes from the server
 * (GET /api/reviews/pending, last 30 days), so leaving or reloading the
 * page doesn't skip it.
 *
 * Re-checked: on login, when a deal completes (socket), and when the tab
 * regains focus (at most once a minute).
 */

// Pages where a blocking popup would get in the way of signing in, reading
// the legal pages, or the phone photo-upload hand-off.
const SKIP_PREFIXES = [
  "/login",
  "/signup",
  "/checkEmail",
  "/verify-email",
  "/forgot-password",
  "/reset-password",
  "/p/",
  "/privacy-policy",
  "/termscondition",
];
const FOCUS_RECHECK_MS = 60 * 1000;

export const DEAL_RATED_EVENT = "unideals:deal-rated";

export default function RatingGate() {
  const { isLoggedIn, userDetails } = useUser();
  const userId = userDetails?._id;
  const { pathname } = useLocation();
  const [queue, setQueue] = useState([]);
  const lastCheck = useRef(0);
  const inFlight = useRef(false);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    inFlight.current = true;
    lastCheck.current = Date.now();
    try {
      const res = await fetchPendingReviews();
      setQueue(Array.isArray(res?.data?.data) ? res.data.data : []);
    } catch {
      // Network/auth hiccup: keep whatever we had, try again later.
    } finally {
      inFlight.current = false;
    }
  }, []);

  // Login / account switch.
  useEffect(() => {
    if (!isLoggedIn || !userId) {
      setQueue([]);
      return;
    }
    load();
  }, [isLoggedIn, userId, load]);

  // A deal just completed (either side, any page), or the tab came back.
  useEffect(() => {
    if (!isLoggedIn || !userId) return undefined;
    let socket = null;
    try {
      socket = acquireSocket();
    } catch {
      socket = null;
    }
    let timer = null;
    // Small delay so the completion write has settled before we ask.
    const soon = () => {
      clearTimeout(timer);
      timer = setTimeout(load, 600);
    };
    const onConversation = (p) => p?.dealStatus === "completed" && soon();
    const onDeal = (p) => p?.deal?.status === "completed" && soon();
    const onFocus = () => {
      if (!document.hidden && Date.now() - lastCheck.current > FOCUS_RECHECK_MS) load();
    };
    socket?.on("conversation:updated", onConversation);
    socket?.on("deal:updated", onDeal);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      clearTimeout(timer);
      socket?.off("conversation:updated", onConversation);
      socket?.off("deal:updated", onDeal);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
      releaseSocket(socket);
    };
  }, [isLoggedIn, userId, load]);

  const current = queue[0];

  // Lock page scroll behind the popup.
  const open = Boolean(current) && isLoggedIn && !SKIP_PREFIXES.some((p) => pathname.startsWith(p));
  useEffect(() => {
    if (!open) return undefined;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const otherRole = current.role === "buyer" ? "seller" : "buyer";
  return (
    <RateSellerDialog
      open
      required
      conversationId={current.conversationId}
      otherName={formatName(current.otherParty?.name)}
      otherRole={otherRole}
      productTitle={current.product?.title}
      queueNote={queue.length > 1 ? `1 of ${queue.length}` : undefined}
      onRated={(stars) => {
        const rest = queue.filter((x) => String(x.conversationId) !== String(current.conversationId));
        setQueue(rest);
        // The server sends at most 5 at a time; fetch the next batch.
        if (!rest.length) load();
        // Let open pages (orders, chat) show the new rating without a refetch.
        window.dispatchEvent(
          new CustomEvent(DEAL_RATED_EVENT, { detail: { conversationId: String(current.conversationId), rating: stars } }),
        );
      }}
    />
  );
}
