import { upload } from "@imagekit/javascript";
import instance from "../../../services/axiosInstance";

// Mirrors backend VOICE_LIMITS (the server re-checks everything).
export const VOICE_MAX_MS = 120 * 1000;
export const VOICE_MIN_MS = 700;
export const VOICE_MAX_BYTES = 2 * 1024 * 1024;
export const VOICE_PEAKS = 48;
// Speech-grade Opus/AAC: ~180–240 KB per minute.
const BITRATE = 32000;

// MP4/AAC first: it plays on every browser incl. older iOS Safari. WebM/Opus
// (Chrome, Firefox, Android) is the fallback, and is smaller.
const CANDIDATES = [
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/ogg;codecs=opus",
];

export const voiceSupported = () =>
  typeof window !== "undefined" &&
  typeof window.MediaRecorder !== "undefined" &&
  Boolean(navigator.mediaDevices?.getUserMedia);

export const pickVoiceMime = () => {
  if (!voiceSupported()) return "";
  return CANDIDATES.find((t) => window.MediaRecorder.isTypeSupported?.(t)) || "";
};

export const recorderOptions = (mime) => ({ ...(mime ? { mimeType: mime } : {}), audioBitsPerSecond: BITRATE });

const extFor = (mime) => (/mp4/.test(mime) ? "m4a" : /ogg/.test(mime) ? "ogg" : "webm");

/** Downsample live level samples (0–1) to `n` bars scaled 0–100. */
export const toPeaks = (levels, n = VOICE_PEAKS) => {
  if (!levels.length) return Array(n).fill(8);
  const out = [];
  const step = levels.length / n;
  for (let i = 0; i < n; i += 1) {
    const from = Math.floor(i * step);
    const to = Math.max(from + 1, Math.floor((i + 1) * step));
    let max = 0;
    for (let j = from; j < to && j < levels.length; j += 1) max = Math.max(max, levels[j]);
    out.push(max);
  }
  const top = Math.max(...out, 0.05);
  return out.map((v) => Math.max(6, Math.round((v / top) * 100)));
};

export const fmtDuration = (ms) => {
  const s = Math.max(0, Math.round((ms || 0) / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
};

/**
 * Upload straight to ImageKit (never through our API): signed, into the
 * user's own /voice folder, tagged "voice" so unsent uploads get swept.
 */
export const uploadVoice = async (blob, mime, { signal, onProgress } = {}) => {
  if (!(blob instanceof Blob) || !blob.size) throw new Error("Nothing was recorded");
  if (blob.size > VOICE_MAX_BYTES) throw new Error("Voice note is too large");
  const { data } = await instance.get("/api/imagekit/auth", { signal });
  if (!data?.signature || !data?.token || !data?.expire || !data?.folder) {
    throw new Error("Voice service unavailable");
  }
  const type = (mime || blob.type || "audio/webm").split(";")[0];
  const file = new File([blob], `voice_${Date.now()}.${extFor(type)}`, { type });
  const result = await upload({
    file,
    fileName: file.name,
    folder: `${data.folder}/voice`,
    tags: ["voice"],
    useUniqueFileName: true,
    signature: data.signature,
    expire: data.expire,
    token: data.token,
    publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY,
    ...(signal ? { abortSignal: signal } : {}),
    ...(onProgress ? { onProgress: (e) => e?.total && onProgress(e.loaded / e.total) } : {}),
  });
  if (!result?.fileId) throw new Error("Voice upload failed");
  return { fileId: result.fileId, url: result.url };
};
