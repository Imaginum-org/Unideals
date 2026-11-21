import { defineJob } from "./jobRegistry.js";
import { sweepOrphanChatImages, sweepOrphanVoiceFiles } from "../services/voiceCleanup.service.js";

export const scheduleSweepVoiceFiles = () => {
  defineJob({
    key: "sweep-voice-files",
    name: "Sweep unsent chat media",
    description: "Deletes voice notes (ImageKit) and chat photos (Cloudinary) uploaded over a day ago but never sent.",
    schedule: "10 22 * * *",
    scheduleLabel: "Daily at 03:40 IST (22:10 UTC)",
    run: async () => {
      // Independent stores: one failing must not stop the other.
      const [voice, photos] = await Promise.allSettled([sweepOrphanVoiceFiles(), sweepOrphanChatImages()]);
      const val = (r) => (r.status === "fulfilled" ? r.value : { error: String(r.reason?.message || r.reason) });
      const v = val(voice);
      const p = val(photos);
      if (v.error && p.error) throw new Error(`voice: ${v.error}; photos: ${p.error}`);
      return {
        voiceDeleted: v.deleted || 0,
        photosDeleted: p.deleted || 0,
        ...(v.error ? { voiceError: v.error } : {}),
        ...(p.error ? { photosError: p.error } : {}),
      };
    },
  });
};
