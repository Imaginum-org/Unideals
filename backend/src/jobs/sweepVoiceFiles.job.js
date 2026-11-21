import { defineJob } from "./jobRegistry.js";
import { sweepOrphanVoiceFiles } from "../services/voiceCleanup.service.js";

export const scheduleSweepVoiceFiles = () => {
  defineJob({
    key: "sweep-voice-files",
    name: "Sweep unsent voice notes",
    description: "Deletes voice note uploads older than a day that were never sent in a chat.",
    schedule: "40 3 * * *",
    scheduleLabel: "Daily at 03:40",
    run: () => sweepOrphanVoiceFiles(),
  });
};
