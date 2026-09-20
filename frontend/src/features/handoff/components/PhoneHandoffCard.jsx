import { useCallback, useEffect, useRef, useState } from "react";
import QRCode from "react-qr-code";
import toast from "react-hot-toast";
import { MdOutlinePhonelinkSetup, MdRefresh } from "react-icons/md";
import {
  createHandoffSession,
  getHandoffStatus,
} from "../api/handoffApi.js";

const POLL_INTERVAL_MS = 3000;

// Desktop card for the listing flow: one click creates a pairing session,
// shows the QR for the phone, and polls for new photos until expiry.
// Calls onPhotos([{ url, fileId }]) exactly once per new photo.
const PhoneHandoffCard = ({ onPhotos, disabled = false }) => {
  const [session, setSession] = useState(null); // { code, url, secret, expiresAt }
  const [creating, setCreating] = useState(false);
  const [expired, setExpired] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const seenFileIds = useRef(new Set());
  const pollTimer = useRef(null);
  const countdownTimer = useRef(null);
  // Polls fire long after render: always call the LATEST onPhotos so the
  // parent merges into fresh state (never a stale closure that clobbers
  // laptop-picked files).
  const onPhotosRef = useRef(null);
  onPhotosRef.current = onPhotos;

  const clearTimers = useCallback(() => {
    if (pollTimer.current) clearInterval(pollTimer.current);
    if (countdownTimer.current) clearInterval(countdownTimer.current);
    pollTimer.current = null;
    countdownTimer.current = null;
  }, []);

  useEffect(() => clearTimers, [clearTimers]);

  const markExpired = useCallback(() => {
    clearTimers();
    setExpired(true);
    setSession(null);
    seenFileIds.current = new Set();
  }, [clearTimers]);

  const pollOnce = useCallback(
    async (code) => {
      try {
        const res = await getHandoffStatus(code);
        const images = res.data?.data?.images || [];
        const fresh = images.filter((img) => !seenFileIds.current.has(img.fileId));
        fresh.forEach((img) => seenFileIds.current.add(img.fileId));
        if (fresh.length > 0) {
          onPhotosRef.current?.(fresh);
          toast.success(
            fresh.length === 1
              ? "1 photo received from your phone"
              : `${fresh.length} photos received from your phone`,
          );
        }
      } catch (err) {
        const status = err?.response?.status;
        const code = err?.response?.data?.code;
        // Session gone or expired: stop polling, show regenerate state.
        if (status === 404 || status === 410 || code === "HANDOFF_EXPIRED") {
          markExpired();
        }
        // Transient network errors: keep polling silently.
      }
    },
    [markExpired],
  );

  const startSession = useCallback(async () => {
    if (creating) return;
    setCreating(true);
    setExpired(false);
    seenFileIds.current = new Set();
    try {
      const res = await createHandoffSession();
      const data = res.data?.data;
      if (!data?.url) throw new Error("Unable to create photo session");
      setSession(data);
      const msLeft = new Date(data.expiresAt).getTime() - Date.now();
      setSecondsLeft(Math.max(0, Math.round(msLeft / 1000)));

      countdownTimer.current = setInterval(() => {
        setSecondsLeft((prev) => {
          if (prev <= 1) {
            markExpired();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Immediate first poll, then interval.
      pollOnce(data.code);
      pollTimer.current = setInterval(() => pollOnce(data.code), POLL_INTERVAL_MS);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Unable to create photo session");
    } finally {
      setCreating(false);
    }
  }, [creating, pollOnce, markExpired]);

  const mmss = `${String(Math.floor(secondsLeft / 60)).padStart(1, "0")}:${String(
    secondsLeft % 60,
  ).padStart(2, "0")}`;

  // Collapsed state: entry point.
  if (!session) {
    return (
      <div className="mt-4 rounded-[24px] border-2 border-dashed border-[#D1D5DB] bg-[#F8FAFC] p-6 text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#EEF2FF] text-[#4F46E5]">
          <MdOutlinePhonelinkSetup size={24} />
        </div>
        <h3 className="mt-3 text-base font-bold text-[#181C1F]">
          {expired ? "Session expired — generate a new one" : "Add photos from your phone"}
        </h3>
        <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-[#6B7280]">
          {expired
            ? "QR codes expire after 15 minutes for security."
            : "Scan a QR with your phone and the pictures attach here automatically. Laptop upload above keeps working as usual."}
        </p>
        <button
          type="button"
          onClick={startSession}
          disabled={disabled || creating}
          className="mt-4 inline-flex h-[46px] items-center gap-2 rounded-xl bg-[#4F46E5] px-6 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {creating ? "Creating…" : expired ? (
            <>
              <MdRefresh size={18} /> Generate new QR
            </>
          ) : (
            "Show phone QR"
          )}
        </button>
      </div>
    );
  }

  // Active session: QR + code + countdown.
  return (
    <div className="mt-4 rounded-[24px] border border-[#E5E7EB] bg-white p-6">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
        <div className="rounded-2xl border border-[#ECECEC] bg-white p-3">
          <QRCode value={session.url} size={160} />
        </div>
        <div className="min-w-0 flex-1 text-center sm:text-left">
          <h3 className="text-base font-bold text-[#181C1F]">
            Scan with your phone camera
          </h3>
          <p className="mt-1 text-sm leading-6 text-[#6B7280]">
            A page opens on your phone — pick from gallery or take a photo.
            Pictures appear here on their own.
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <span className="rounded-lg bg-[#EEF2FF] px-3 py-1.5 font-mono text-sm font-bold tracking-[0.2em] text-[#4F46E5]">
              {session.code}
            </span>
            <span className="rounded-lg bg-[#F3F4F6] px-3 py-1.5 text-xs font-semibold text-[#6B7280]">
              expires in {mmss}
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              clearTimers();
              setSession(null);
              seenFileIds.current = new Set();
            }}
            className="mt-3 text-sm font-semibold text-[#9CA3AF] hover:text-[#4B5563]"
          >
            Cancel session
          </button>
        </div>
      </div>
    </div>
  );
};

export default PhoneHandoffCard;
