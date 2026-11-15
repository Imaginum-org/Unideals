import os from "os";
import crypto from "crypto";
import cron from "node-cron";
import { JobRun, JobState } from "../models/JobRun.model.js";

// Identifies this process in job leases (several API instances may run).
const INSTANCE_ID = `${os.hostname()}:${process.pid}:${crypto.randomBytes(3).toString("hex")}`;
// How long a finished run keeps its lease (blocks duplicate ticks of the
// same minute on other instances). Must stay below the 1-minute minimum.
const LEASE_HOLD_MS = 30 * 1000;

/**
 * Registry for scheduled background jobs.
 *
 * defineJob({ key, name, description, schedule, scheduleLabel, frequent, run })
 *   run() does the work and returns a small summary object, e.g.
 *   { checked: 40, expired: 2 }. A summary containing any positive number
 *   counts as "did something"; frequent jobs only write history then.
 *
 * Every run is recorded (JobState always, JobRun when meaningful), errors
 * never escape into node-cron, and a job never overlaps itself: locally via
 * `running`, and across API instances via a lease on its JobState document
 * (one atomic write, no extra round trip). Set RUN_JOBS=false on instances
 * that should never run jobs. Staff can trigger a run from the admin console.
 */

const jobs = new Map();
const running = new Set();

const truncate = (text, max = 1000) => {
  const value = String(text || "");
  return value.length > max ? `${value.slice(0, max)}…` : value;
};

const didWork = (result) =>
  result && typeof result === "object" && Object.values(result).some((v) => typeof v === "number" && v > 0);

export const defineJob = (definition) => {
  const required = ["key", "name", "schedule", "run"];
  for (const field of required) {
    if (!definition[field]) throw new Error(`Job definition missing "${field}"`);
  }
  if (jobs.has(definition.key)) throw new Error(`Duplicate job key "${definition.key}"`);
  jobs.set(definition.key, { frequent: false, description: "", ...definition });
  return definition.key;
};

/**
 * Execute a job now and record the outcome. Returns the run record.
 * Never throws for job errors (they are recorded); throws only for an
 * unknown key or an overlapping manual trigger.
 */
export const runJob = async (key, { trigger = "schedule", triggeredBy = null } = {}) => {
  const job = jobs.get(key);
  if (!job) {
    const error = new Error("Unknown job");
    error.statusCode = 404;
    throw error;
  }
  if (running.has(key)) {
    if (trigger === "manual") {
      const error = new Error("This job is already running");
      error.statusCode = 409;
      throw error;
    }
    return null; // scheduled tick while a previous run is still going
  }

  running.add(key);
  const startedAt = new Date();
  // Cross-instance lease: one atomic write both claims the job and marks it
  // running. Another instance's tick (or a crash-orphaned lease that hasn't
  // expired) makes the filter miss; the upsert then hits the unique `key`
  // and throws 11000, which means "someone else has it".
  const leaseMs = job.leaseMs || (job.frequent ? 2 * 60 * 1000 : 30 * 60 * 1000);
  try {
    await JobState.findOneAndUpdate(
      {
        key,
        $or: [
          { lease_until: null },
          { lease_until: { $lte: startedAt } },
          // Staff "Run now" may skip the short post-run hold (it exists to
          // swallow duplicate scheduled ticks), but never a run in progress.
          ...(trigger === "manual" ? [{ last_status: { $ne: "running" } }] : []),
        ],
      },
      {
        $set: {
          lease_owner: INSTANCE_ID,
          lease_until: new Date(startedAt.getTime() + leaseMs),
          last_run_at: startedAt,
          last_status: "running",
        },
      },
      { upsert: true, projection: { _id: 1 } },
    );
  } catch (error) {
    running.delete(key);
    if (error?.code === 11000) {
      if (trigger === "manual") {
        const busy = new Error("This job is running (or just ran) on another server. Try again shortly.");
        busy.statusCode = 409;
        throw busy;
      }
      return null; // another instance owns this tick
    }
    console.error(`[Job:${key}] could not acquire lease:`, error?.message || error);
    return null;
  }

  let status = "success";
  let result = null;
  let errorMessage = null;
  try {
    result = (await job.run()) ?? null;
  } catch (error) {
    status = "failed";
    errorMessage = truncate(error?.stack || error?.message || error);
    console.error(`[Job:${key}] failed:`, error?.message || error);
  } finally {
    running.delete(key);
  }

  const finishedAt = new Date();
  const duration = finishedAt.getTime() - startedAt.getTime();
  // Keep the lease a little past the run so instances whose cron fired a
  // moment later for the SAME tick can't start a second run; it never
  // reaches the next tick (smallest interval is one minute).
  const leaseAfterRun = { lease_owner: INSTANCE_ID, lease_until: new Date(Math.max(finishedAt.getTime(), startedAt.getTime() + LEASE_HOLD_MS)) };

  const stateUpdate =
    status === "success"
      ? {
          $set: {
            last_finished_at: finishedAt,
            last_status: status,
            last_duration_ms: duration,
            last_result: result,
            last_success_at: finishedAt,
            consecutive_failures: 0,
            ...leaseAfterRun,
          },
          $inc: { run_count: 1 },
        }
      : {
          $set: {
            last_finished_at: finishedAt,
            last_status: status,
            last_duration_ms: duration,
            last_result: null,
            last_failure_at: finishedAt,
            last_error: errorMessage,
            ...leaseAfterRun,
          },
          $inc: { run_count: 1, failure_count: 1, consecutive_failures: 1 },
        };
  await JobState.updateOne({ key }, stateUpdate, { upsert: true }).catch(() => {});

  const record = {
    key,
    trigger,
    triggered_by: triggeredBy,
    started_at: startedAt,
    finished_at: finishedAt,
    status,
    duration_ms: duration,
    result,
    error: errorMessage,
  };
  const keepHistory = status === "failed" || trigger === "manual" || !job.frequent || didWork(result);
  if (keepHistory) await JobRun.create(record).catch(() => {});
  return record;
};

/**
 * Start every registered job's schedule (call once after DB connect).
 */
export const startScheduledJobs = () => {
  if (String(process.env.RUN_JOBS || "").toLowerCase() === "false") {
    console.log("[Jobs] RUN_JOBS=false: scheduled jobs disabled on this instance");
    return;
  }
  for (const job of jobs.values()) {
    cron.schedule(job.schedule, () => {
      runJob(job.key).catch(() => {});
    });
  }
  console.log(`[Jobs] ${jobs.size} scheduled jobs registered`);
};

export const listJobDefinitions = () =>
  [...jobs.values()].map(({ key, name, description, schedule, scheduleLabel, frequent }) => ({
    key,
    name,
    description,
    schedule,
    scheduleLabel: scheduleLabel || schedule,
    frequent: Boolean(frequent),
    running: running.has(key),
  }));

// Expected gap between runs, used to flag a job as overdue.
export const expectedIntervalMs = (schedule) => {
  const [minute, hour] = String(schedule).split(/\s+/);
  if (minute === "*") return 60 * 1000;
  const step = /^\*\/(\d+)$/.exec(minute);
  if (step) return Number(step[1]) * 60 * 1000;
  if (hour === "*") return 60 * 60 * 1000;
  return 24 * 60 * 60 * 1000;
};
