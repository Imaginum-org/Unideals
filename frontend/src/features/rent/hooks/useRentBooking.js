import { useCallback, useEffect, useState } from "react";
import { toast } from "../../../components/ui/toast.js";
import { acquireSocket, releaseSocket } from "../../../services/realtime.js";
import { getRentBooking, rentBookingAction, rentErrorMessage } from "../api/rentApi.js";

/**
 * One booking, kept live: reloads on the other side's actions (socket) and
 * whenever `refreshKey` changes (e.g. a new chat message). `act` runs a
 * booking action and shows the toast.
 */
export function useRentBooking(bookingId, refreshKey) {
  const [booking, setBooking] = useState(null);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(null);

  const load = useCallback(() => {
    if (!bookingId) return Promise.resolve();
    return getRentBooking(bookingId, { fresh: true })
      .then((data) => {
        setBooking(data);
        setError(null);
      })
      .catch((err) => setError(err?.response?.status === 404 ? "This booking isn't available." : rentErrorMessage(err)));
  }, [bookingId]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    if (!bookingId) return undefined;
    const socket = acquireSocket();
    const onEvent = (payload) => {
      if (payload?.bookingId === bookingId) load();
    };
    socket.on("rent:booking", onEvent);
    return () => {
      socket.off("rent:booking", onEvent);
      releaseSocket(socket);
    };
  }, [bookingId, load]);

  const act = useCallback(
    async (action, body, success) => {
      setBusy(action);
      try {
        const next = await rentBookingAction(bookingId, action, body);
        setBooking((prev) => ({ ...prev, ...next }));
        if (success) toast.success(success);
      } catch (err) {
        toast.error(rentErrorMessage(err));
        load();
      } finally {
        setBusy(null);
      }
    },
    [bookingId, load],
  );

  return { booking, error, busy, act, reload: load };
}
