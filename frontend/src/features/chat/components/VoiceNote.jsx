import { memo, useEffect, useRef, useState } from "react";
import { Loader2, Pause, Play } from "lucide-react";
import { fmtDuration } from "../utils/voice.js";

/*
 * Voice note player inside a chat bubble (WhatsApp-style).
 * - Audio loads lazily (preload="none"): nothing downloads until Play.
 * - Only one note plays at a time across the whole page.
 * - Waveform comes from the stored peaks (no audio decoding on render);
 *   tap / drag on it to seek. Speed cycles 1× → 1.5× → 2×.
 */

const PLAY_EVENT = "unideals:voice-play";
const SPEEDS = [1, 1.5, 2];

const VoiceNote = ({ audio, isMine }) => {
  const ref = useRef(null);
  const barRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [pos, setPos] = useState(0); // 0–1
  const [speedIdx, setSpeedIdx] = useState(0);
  const durationMs = Number(audio?.duration_ms) || 0;
  const peaks = Array.isArray(audio?.peaks) && audio.peaks.length ? audio.peaks : Array(48).fill(30);

  // Pause when another note starts.
  useEffect(() => {
    const onOther = (e) => {
      if (e.detail !== ref.current) ref.current?.pause();
    };
    window.addEventListener(PLAY_EVENT, onOther);
    return () => window.removeEventListener(PLAY_EVENT, onOther);
  }, []);

  useEffect(() => () => ref.current?.pause(), []);

  const toggle = async () => {
    const el = ref.current;
    if (!el || failed) return;
    if (!el.paused) {
      el.pause();
      return;
    }
    window.dispatchEvent(new CustomEvent(PLAY_EVENT, { detail: el }));
    el.playbackRate = SPEEDS[speedIdx];
    setLoading(true);
    try {
      await el.play();
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  };

  const seekTo = (clientX) => {
    const el = ref.current;
    const bar = barRef.current;
    if (!el || !bar) return;
    const r = bar.getBoundingClientRect();
    const f = Math.max(0, Math.min(1, (clientX - r.left) / r.width));
    const total = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : durationMs / 1000;
    if (total > 0) {
      try {
        el.currentTime = f * total;
      } catch {
        // not seekable yet
      }
    }
    setPos(f);
  };

  const cycleSpeed = () => {
    const next = (speedIdx + 1) % SPEEDS.length;
    setSpeedIdx(next);
    if (ref.current) ref.current.playbackRate = SPEEDS[next];
  };

  const shownMs = playing || pos > 0 ? pos * durationMs : durationMs;
  const played = Math.round(pos * peaks.length);
  const fg = isMine ? "bg-[var(--accent)]" : "bg-[var(--accent)]";
  const bgBar = isMine ? "bg-slate-900/20 dark:bg-white/25" : "bg-slate-300 dark:bg-zinc-600";

  return (
    <div className="flex w-[min(15.5rem,62vw)] items-center gap-2.5 py-0.5">
      <audio
        ref={ref}
        src={audio?.url}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onWaiting={() => setLoading(true)}
        onPlaying={() => setLoading(false)}
        onEnded={() => {
          setPlaying(false);
          setPos(0);
        }}
        onTimeUpdate={(e) => {
          const el = e.currentTarget;
          const total = Number.isFinite(el.duration) && el.duration > 0 ? el.duration : durationMs / 1000;
          if (total > 0) setPos(Math.min(1, el.currentTime / total));
        }}
        onError={() => {
          setFailed(true);
          setLoading(false);
        }}
      />
      <button
        type="button"
        onClick={toggle}
        disabled={failed}
        aria-label={failed ? "Voice note unavailable" : playing ? "Pause voice message" : "Play voice message"}
        className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--accent)] text-white shadow-sm transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : playing ? (
          <Pause size={16} className="fill-current" />
        ) : (
          <Play size={16} className="ml-0.5 fill-current" />
        )}
      </button>
      <div className="min-w-0 flex-1">
        <div
          ref={barRef}
          role="slider"
          tabIndex={0}
          aria-label="Seek voice message"
          aria-valuemin={0}
          aria-valuemax={Math.round(durationMs / 1000)}
          aria-valuenow={Math.round((pos * durationMs) / 1000)}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            seekTo(e.clientX);
          }}
          onPointerMove={(e) => e.buttons === 1 && seekTo(e.clientX)}
          onKeyDown={(e) => {
            const el = ref.current;
            if (!el || (e.key !== "ArrowRight" && e.key !== "ArrowLeft")) return;
            e.preventDefault();
            el.currentTime = Math.max(0, (el.currentTime || 0) + (e.key === "ArrowRight" ? 5 : -5));
          }}
          className="flex h-7 cursor-pointer touch-none items-center gap-[2px] outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]"
        >
          {peaks.map((p, i) => (
            <span
              key={i}
              className={`min-w-0 flex-1 rounded-full transition-colors duration-150 ${i < played ? fg : bgBar}`}
              style={{ height: `${Math.max(12, p)}%` }}
            />
          ))}
        </div>
        <div className="mt-0.5 flex items-center justify-between">
          <span className="text-[11px] tabular-nums text-slate-500 dark:text-zinc-400">
            {failed ? "Unavailable" : fmtDuration(shownMs)}
          </span>
          <button
            type="button"
            onClick={cycleSpeed}
            aria-label={`Playback speed ${SPEEDS[speedIdx]}x`}
            className="rounded-full bg-black/[0.06] px-1.5 py-px text-[10.5px] font-semibold tabular-nums text-slate-600 transition-colors hover:bg-black/10 dark:bg-white/10 dark:text-zinc-300"
          >
            {SPEEDS[speedIdx]}×
          </button>
        </div>
      </div>
    </div>
  );
};

export default memo(VoiceNote);
