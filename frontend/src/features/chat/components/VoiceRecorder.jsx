import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronUp, Loader2, Lock, Mic, Send, Trash2 } from "lucide-react";
import { toast } from "../../../components/ui/toast.js";
import { VOICE_MAX_MS, VOICE_MIN_MS, fmtDuration, pickVoiceMime, recorderOptions, toPeaks } from "../utils/voice.js";

/*
 * WhatsApp-style voice recorder for the chat composer.
 *
 *   hold mic      -> records; release sends
 *   slide left    -> cancel        slide up -> lock (hands-free)
 *   quick tap     -> starts hands-free (desktop / first permission prompt)
 *
 * Speech-grade mono at 32 kbps (~200 KB/min), 2-minute cap, live level
 * meter from an AnalyserNode (also gives the stored waveform). The parent
 * form must be `relative`: the recording bar overlays the composer row.
 */

const CANCEL_PX = 100;
const LOCK_PX = 70;
const TAP_MS = 350;
const LIVE_BARS = 32;

export default function VoiceRecorder({ disabled = false, blockedUntil = 0, onSend }) {
  const [phase, setPhase] = useState("idle"); // idle | holding | locked | sending
  const [elapsed, setElapsed] = useState(0);
  const [live, setLive] = useState(() => Array(LIVE_BARS).fill(0));
  const [dragX, setDragX] = useState(0);
  const phaseRef = useRef("idle");
  const streamRef = useRef(null);
  const recRef = useRef(null);
  const chunksRef = useRef([]);
  const ctxRef = useRef(null);
  const levelsRef = useRef([]);
  const tickRef = useRef(null);
  const startedAtRef = useRef(0);
  const pointerRef = useRef(null);
  const startingRef = useRef(null); // pending start() promise
  const mimeRef = useRef("");

  const go = (p) => {
    phaseRef.current = p;
    setPhase(p);
  };

  const teardown = useCallback(() => {
    clearInterval(tickRef.current);
    tickRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    ctxRef.current?.close?.().catch(() => {});
    ctxRef.current = null;
    setDragX(0);
    setElapsed(0);
    setLive(Array(LIVE_BARS).fill(0));
  }, []);

  // Stop the recorder and resolve with the recorded blob (or null).
  const stopRecorder = () =>
    new Promise((resolve) => {
      const rec = recRef.current;
      recRef.current = null;
      if (!rec || rec.state === "inactive") return resolve(null);
      rec.onstop = () => resolve(new Blob(chunksRef.current, { type: rec.mimeType || mimeRef.current || "audio/webm" }));
      try {
        rec.stop();
      } catch {
        resolve(null);
      }
    });

  const cancel = useCallback(async () => {
    await stopRecorder();
    teardown();
    go("idle");
  }, [teardown]);

  const finish = useCallback(async () => {
    if (phaseRef.current !== "holding" && phaseRef.current !== "locked") return;
    const durationMs = Math.min(Date.now() - startedAtRef.current, VOICE_MAX_MS);
    const peaks = toPeaks(levelsRef.current);
    const mime = recRef.current?.mimeType || mimeRef.current;
    const blob = await stopRecorder();
    teardown();
    if (!blob || durationMs < VOICE_MIN_MS) {
      go("idle");
      toast("Hold the mic to record, release to send");
      return;
    }
    go("sending");
    try {
      await onSend?.({ blob, mime, durationMs, peaks });
    } finally {
      go("idle");
    }
  }, [onSend, teardown]);

  const start = useCallback(async () => {
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
      });
    } catch {
      go("idle");
      toast.error("Microphone blocked. Allow mic access in your browser to send voice notes.");
      return false;
    }
    // Released / cancelled while the permission prompt was open.
    if (phaseRef.current === "idle") {
      stream.getTracks().forEach((t) => t.stop());
      return false;
    }
    streamRef.current = stream;
    mimeRef.current = pickVoiceMime();
    let rec;
    try {
      rec = new MediaRecorder(stream, recorderOptions(mimeRef.current));
    } catch {
      rec = new MediaRecorder(stream);
    }
    chunksRef.current = [];
    levelsRef.current = [];
    rec.ondataavailable = (e) => e.data?.size && chunksRef.current.push(e.data);
    recRef.current = rec;
    rec.start(250);
    startedAtRef.current = Date.now();
    navigator.vibrate?.(15);

    // Live level meter (RMS of the time-domain signal, ~12 fps).
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      const ctx = new Ctx();
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 512;
      ctx.createMediaStreamSource(stream).connect(analyser);
      ctxRef.current = ctx;
      const buf = new Uint8Array(analyser.fftSize);
      tickRef.current = setInterval(() => {
        analyser.getByteTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i += 1) {
          const v = (buf[i] - 128) / 128;
          sum += v * v;
        }
        const level = Math.min(1, Math.sqrt(sum / buf.length) * 3.2);
        levelsRef.current.push(level);
        setLive((prev) => [...prev.slice(1), level]);
        const ms = Date.now() - startedAtRef.current;
        setElapsed(ms);
        if (ms >= VOICE_MAX_MS) finishRef.current();
      }, 80);
    } catch {
      // No AudioContext: still record, just a timer and a flat waveform.
      tickRef.current = setInterval(() => {
        const ms = Date.now() - startedAtRef.current;
        levelsRef.current.push(0.3);
        setElapsed(ms);
        if (ms >= VOICE_MAX_MS) finishRef.current();
      }, 100);
    }
    return true;
  }, []);

  const finishRef = useRef(finish);
  finishRef.current = finish;

  useEffect(() => () => {
    // Leaving the chat mid-recording discards it.
    try {
      recRef.current?.stop();
    } catch {
      // ignore
    }
    recRef.current = null;
    teardown();
  }, [teardown]);

  const blocked = () => {
    if (Date.now() < blockedUntil) {
      toast.error(`Voice notes are paused. Try again in ${Math.ceil((blockedUntil - Date.now()) / 1000)}s.`);
      return true;
    }
    return false;
  };

  const onPointerDown = (e) => {
    if (disabled || phaseRef.current !== "idle" || (e.pointerType === "mouse" && e.button !== 0)) return;
    if (blocked()) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture?.(e.pointerId);
    pointerRef.current = { x: e.clientX, y: e.clientY, at: Date.now() };
    go("holding");
    startingRef.current = start();
  };

  const onPointerMove = (e) => {
    const p = pointerRef.current;
    if (!p || phaseRef.current !== "holding") return;
    const dx = e.clientX - p.x;
    const dy = e.clientY - p.y;
    setDragX(Math.min(0, dx));
    if (dx < -CANCEL_PX) {
      pointerRef.current = null;
      navigator.vibrate?.([10, 40, 10]);
      cancel();
    } else if (dy < -LOCK_PX) {
      pointerRef.current = null;
      setDragX(0);
      navigator.vibrate?.(10);
      go("locked");
    }
  };

  const onPointerUp = async () => {
    const p = pointerRef.current;
    pointerRef.current = null;
    if (!p || phaseRef.current !== "holding") return;
    // Measured at release, before awaiting a possible permission prompt.
    const quickTap = Date.now() - p.at < TAP_MS;
    const ok = await startingRef.current;
    if (!ok || phaseRef.current !== "holding") return;
    if (quickTap) {
      // Quick tap: keep recording hands-free.
      setDragX(0);
      go("locked");
    } else {
      finish();
    }
  };

  const onKeyDown = (e) => {
    if ((e.key === "Enter" || e.key === " ") && phaseRef.current === "idle" && !disabled) {
      e.preventDefault();
      if (blocked()) return;
      go("locked");
      startingRef.current = start();
    }
  };

  const recording = phase === "holding" || phase === "locked";

  return (
    <>
      {phase !== "idle" && (
        <div
          className={`absolute inset-y-0 left-0 z-10 flex items-center gap-2 rounded-[20px] bg-white pl-2 pr-2 dark:bg-[#1A1D20] ${
            phase === "holding" ? "right-12" : "right-0"
          }`}
          role="status"
          aria-live="polite"
        >
          {phase === "locked" && (
            <button
              type="button"
              onClick={cancel}
              aria-label="Delete recording"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/30"
            >
              <Trash2 size={18} />
            </button>
          )}
          {phase === "sending" ? (
            <span className="flex items-center gap-2 pl-2 text-[13px] font-medium text-slate-600 dark:text-zinc-300">
              <Loader2 size={16} className="animate-spin text-[var(--accent)]" /> Sending voice note…
            </span>
          ) : (
            <>
              <span className="relative ml-1 flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inset-0 animate-ping rounded-full bg-red-500 opacity-60 motion-reduce:animate-none" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-red-500" />
              </span>
              <span className="w-10 shrink-0 text-[13.5px] font-semibold tabular-nums text-slate-800 dark:text-zinc-100">
                {fmtDuration(elapsed)}
              </span>
              <div className="flex h-7 min-w-0 flex-1 items-center gap-[2px] overflow-hidden" aria-hidden="true">
                {live.map((v, i) => (
                  <span
                    key={i}
                    className="w-[3px] shrink-0 rounded-full bg-[var(--accent)] transition-[height] duration-75"
                    style={{ height: `${Math.max(12, v * 100)}%`, opacity: 0.35 + v * 0.65 }}
                  />
                ))}
              </div>
              {phase === "holding" && (
                <span
                  className="flex shrink-0 items-center gap-0.5 whitespace-nowrap text-[12.5px] font-medium text-slate-500 dark:text-zinc-400"
                  style={{ transform: `translateX(${dragX * 0.6}px)`, opacity: 1 + dragX / (CANCEL_PX * 1.2) }}
                >
                  <ChevronLeft size={15} className="motion-safe:animate-pulse" /> Slide to cancel
                </span>
              )}
            </>
          )}
          {phase === "locked" && (
            <button
              type="button"
              onClick={finish}
              aria-label="Send voice message"
              className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white shadow-sm transition-colors hover:bg-[var(--accent-hover)]"
            >
              <Send size={17} />
            </button>
          )}
        </div>
      )}

      {phase !== "locked" && phase !== "sending" && (
        <div className="relative z-20 shrink-0">
          {phase === "holding" && (
            <div className="pointer-events-none absolute bottom-full left-1/2 mb-2 flex -translate-x-1/2 flex-col items-center gap-0.5 rounded-full bg-white px-1.5 py-2 text-slate-500 shadow-md ring-1 ring-black/5 dark:bg-[#1A1D20] dark:text-zinc-400 dark:ring-white/10">
              <Lock size={14} />
              <ChevronUp size={14} className="motion-safe:animate-bounce" />
            </div>
          )}
          <button
            type="button"
            disabled={disabled}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={() => phaseRef.current === "holding" && cancel()}
            onKeyDown={onKeyDown}
            onContextMenu={(e) => e.preventDefault()}
            aria-label="Record voice message. Hold to record, release to send"
            title="Hold to record"
            className={`grid h-10 w-10 shrink-0 touch-none select-none place-items-center rounded-full text-white transition-all duration-150 disabled:opacity-40 ${
              recording ? "scale-125 bg-red-500 shadow-[0_8px_20px_-6px_rgba(239,68,68,0.7)]" : "bg-[var(--accent)] hover:bg-[var(--accent-hover)]"
            }`}
          >
            <Mic size={18} />
          </button>
        </div>
      )}
    </>
  );
}
