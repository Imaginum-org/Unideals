import { HOUR, availableDateBounds, blankForm } from "./listingForm.js";
import { toLocalInput } from "../../constants/rentOptions.js";

/*
 * "Save as draft" for new listings: one draft per user, on this device only
 * (localStorage). Photos that aren't uploaded yet are local files, which
 * can't be stored, so the draft keeps only the text and choices.
 */

const VERSION = 1;
const keyFor = (userId) => `unideals:rent-draft:${userId || "anon"}`;

export const readDraft = (userId) => {
  try {
    const draft = JSON.parse(localStorage.getItem(keyFor(userId)) || "null");
    return draft?.v === VERSION && draft.form ? draft : null;
  } catch {
    return null;
  }
};

export const writeDraft = (userId, form) => {
  const { images, ...rest } = form;
  const kept = images.filter((img) => img.url && !img.file).map(({ id, url, fileId }) => ({ id, url, fileId }));
  try {
    localStorage.setItem(keyFor(userId), JSON.stringify({ v: VERSION, savedAt: Date.now(), form: { ...rest, images: kept } }));
    return { ok: true, droppedPhotos: images.length - kept.length };
  } catch {
    return { ok: false, droppedPhotos: 0 };
  }
};

export const clearDraft = (userId) => {
  try {
    localStorage.removeItem(keyFor(userId));
  } catch {
    // storage blocked: nothing to clear
  }
};

/** A saved draft as a form, with times that have gone stale refreshed. */
export const formFromDraft = (draft, profile) => {
  const form = { ...blankForm(draft.form.intent === "request" ? "request" : "offer", profile), ...draft.form };
  const needed = new Date(form.neededBy).getTime();
  if (!Number.isFinite(needed) || needed < Date.now() + 15 * 60 * 1000) {
    form.neededBy = toLocalInput(new Date(Date.now() + 6 * HOUR));
  }
  if (form.availableUntil && form.availableUntil < availableDateBounds().min) form.availableUntil = "";
  if (!form.block && profile?.block) form.block = profile.block;
  return form;
};
