import mongoose, { Schema } from "mongoose";

/**
 * Background job bookkeeping for the admin "System jobs" page.
 *
 * JobState — one document per job: latest run, latest success/failure and
 * counters. Cheap to read and always current.
 * JobRun   — run history. Every failure and every run that changed something
 * is kept; no-op successes of high-frequency jobs (every minute / every 10
 * minutes) only update JobState, so history doesn't fill with noise.
 * History expires after 30 days.
 */

const jobStateSchema = new Schema(
  {
    key: { type: String, required: true, unique: true },
    last_run_at: { type: Date, default: null },
    last_finished_at: { type: Date, default: null },
    last_status: { type: String, enum: ["running", "success", "failed"], default: null },
    last_duration_ms: { type: Number, default: null },
    last_result: { type: Schema.Types.Mixed, default: null },
    last_success_at: { type: Date, default: null },
    last_failure_at: { type: Date, default: null },
    last_error: { type: String, default: null },
    run_count: { type: Number, default: 0 },
    failure_count: { type: Number, default: 0 },
    consecutive_failures: { type: Number, default: 0 },
  },
  { timestamps: true, versionKey: false },
);

const jobRunSchema = new Schema(
  {
    key: { type: String, required: true },
    trigger: { type: String, enum: ["schedule", "manual"], default: "schedule" },
    triggered_by: { type: Schema.Types.ObjectId, ref: "User", default: null },
    started_at: { type: Date, required: true },
    finished_at: { type: Date, default: null },
    status: { type: String, enum: ["running", "success", "failed"], required: true },
    duration_ms: { type: Number, default: null },
    result: { type: Schema.Types.Mixed, default: null },
    error: { type: String, default: null },
  },
  { versionKey: false },
);

jobRunSchema.index({ key: 1, started_at: -1 });
jobRunSchema.index({ started_at: 1 }, { expireAfterSeconds: 30 * 24 * 60 * 60 });

export const JobState = mongoose.model("JobState", jobStateSchema);
export const JobRun = mongoose.model("JobRun", jobRunSchema);
