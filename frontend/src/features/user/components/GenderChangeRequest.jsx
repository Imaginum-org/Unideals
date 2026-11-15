import { useEffect, useId, useRef, useState } from "react";
import { Clock, IdCard, ImagePlus, RefreshCw, ShieldCheck, Trash2, X } from "lucide-react";
import Select from "../../../components/ui/Select.jsx";
import ButtonLoader from "../../../components/ui/ButtonLoader.jsx";
import { toast } from "../../../components/ui/toast.js";
import { compressImage } from "../../product/utils/imageCompression.js";
import { cancelGenderChange, requestGenderChange } from "../api/userApi";
import { btnDanger, btnPrimary, btnSecondary } from "./account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";

const GENDERS = ["male", "female", "other"];
const label = (g) => (g ? g.charAt(0).toUpperCase() + g.slice(1) : "");
const ACCEPT = "image/jpeg,image/png,image/webp";
const MAX_INPUT_BYTES = 15 * 1024 * 1024; // before compression

const formatDate = (d) =>
  d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

/**
 * Gender change with a college ID photo. Three states:
 *   - form: pick the new gender, add a photo, check the preview, send
 *   - pending: waiting for review, with Cancel (deletes the photo)
 *   - pending but the photo expired: ask to send it again
 * A rejected request shows the reviewer's reason above a fresh form.
 */
export default function GenderChangeRequest({ currentGender, request, onRequestChange }) {
  const inputId = useId();
  const fileRef = useRef(null);
  const [requestedGender, setRequestedGender] = useState("");
  const [photo, setPhoto] = useState(null); // { file, url }
  const [preparing, setPreparing] = useState(false);
  const [sending, setSending] = useState(false);
  const [progress, setProgress] = useState(0);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);

  const pending = request?.status === "pending";
  const photoExpired = pending && request?.idCardOnFile === false;
  const showForm = !pending || photoExpired;

  // Free the preview's memory when it's replaced or the component unmounts.
  useEffect(() => () => photo?.url && URL.revokeObjectURL(photo.url), [photo]);

  // Resending after the photo expired keeps the gender they asked for.
  useEffect(() => {
    if (photoExpired && request?.requestedGender) setRequestedGender(request.requestedGender);
  }, [photoExpired, request?.requestedGender]);

  const pickPhoto = () => fileRef.current?.click();

  const onFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // picking the same file again still fires onChange
    if (!file) return;
    if (!ACCEPT.split(",").includes(file.type)) {
      toast.error("Please choose a JPG, PNG or WEBP photo.");
      return;
    }
    if (file.size > MAX_INPUT_BYTES) {
      toast.error("That photo is too large. Please choose one under 15 MB.");
      return;
    }
    setPreparing(true);
    try {
      // Re-encoding also strips location and other EXIF data from phone photos.
      const compressed = await compressImage(file, { maxSizeMB: 1, maxWidthOrHeight: 2000, initialQuality: 0.85 });
      const ready = new File([compressed], "college-id.jpg", { type: compressed.type || "image/jpeg" });
      setPhoto({ file: ready, url: URL.createObjectURL(ready) });
    } catch (err) {
      toast.error(err?.message || "Couldn't read that photo. Please try another.");
    } finally {
      setPreparing(false);
    }
  };

  const send = async () => {
    if (!requestedGender || !photo || sending) return;
    setSending(true);
    setProgress(0);
    try {
      const res = await requestGenderChange(requestedGender, photo.file, {
        onUploadProgress: (ev) => ev.total && setProgress(Math.round((ev.loaded / ev.total) * 100)),
      });
      if (res.data?.success) {
        toast.success("Request sent. We'll let you know once it's reviewed.");
        setPhoto(null);
        setRequestedGender("");
        onRequestChange?.(res.data.genderChangeRequest || null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't send your request. Please try again.");
    } finally {
      setSending(false);
    }
  };

  const cancel = async () => {
    setCancelling(true);
    try {
      const res = await cancelGenderChange();
      toast.success(res.data?.message || "Request cancelled.");
      setConfirmCancel(false);
      onRequestChange?.(res.data?.genderChangeRequest || null);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Couldn't cancel. Please try again.");
      // A 409 means it was already decided; refresh the parent's view.
      if (err?.response?.status === 409) onRequestChange?.(null, { refresh: true });
    } finally {
      setCancelling(false);
    }
  };

  return (
    <div className="mt-2.5 flex flex-col gap-3 rounded-xl border border-neutral-200 bg-neutral-50/70 p-3.5 text-[12.5px] text-slate-600 sm:p-4 dark:border-neutral-800 dark:bg-white/[0.03] dark:text-zinc-300">
      {pending && (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2.5">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] font-semibold text-slate-900 dark:text-white">
                Waiting for review: change to {label(request.requestedGender)}
              </p>
              <p className="mt-0.5">
                Sent {formatDate(request.requestedAt)}. We&apos;ll notify you when it&apos;s reviewed, usually within 2 working days.
              </p>
            </div>
          </div>

          {photoExpired && (
            <p role="alert" className="rounded-lg bg-amber-50 px-3 py-2 font-medium text-amber-800 dark:bg-amber-500/10 dark:text-amber-200">
              Your ID photo was deleted because it wasn&apos;t reviewed within 30 days. Please send it again below.
            </p>
          )}

          {confirmCancel ? (
            <div className="flex flex-col gap-2 rounded-lg border border-red-100 bg-white p-3 sm:flex-row sm:items-center sm:justify-between dark:border-red-900/40 dark:bg-transparent">
              <p className="font-medium text-slate-800 dark:text-zinc-200">Cancel this request? Your ID photo will be deleted.</p>
              <div className="flex gap-2">
                <button type="button" onClick={() => setConfirmCancel(false)} disabled={cancelling} className={cn(btnSecondary, "flex-1 sm:flex-none")}>
                  Keep it
                </button>
                <button type="button" onClick={cancel} disabled={cancelling} className={cn(btnDanger, "flex-1 sm:flex-none")}>
                  <ButtonLoader loading={cancelling} loadingText="Cancelling…">
                    Yes, cancel
                  </ButtonLoader>
                </button>
              </div>
            </div>
          ) : (
            <button type="button" onClick={() => setConfirmCancel(true)} className={cn(btnDanger, "w-full sm:w-auto sm:self-start")}>
              <X className="h-4 w-4" aria-hidden="true" />
              Cancel request
            </button>
          )}
        </div>
      )}

      {showForm && (
        <div className="flex flex-col gap-3">
          {!pending && (
            <p>
              Gender is locked after setup. To change it, send a photo of your <strong className="font-semibold text-slate-800 dark:text-zinc-100">college ID card</strong> and our team will review it.
            </p>
          )}

          {request?.status === "rejected" && (
            <p role="status" className="rounded-lg bg-red-50 px-3 py-2 font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300">
              Your last request wasn&apos;t approved{request.reviewNote ? `: ${request.reviewNote}` : "."} You can send a new one.
            </p>
          )}

          {!photoExpired && (
            <div className="flex flex-col gap-1.5">
              <span className="font-medium text-slate-700 dark:text-zinc-200">New gender</span>
              <Select
                className="w-full sm:w-56"
                value={requestedGender}
                onChange={setRequestedGender}
                placeholder="Select new gender"
                ariaLabel="Requested gender"
                options={GENDERS.filter((g) => g !== currentGender).map((g) => ({ value: g, label: label(g) }))}
              />
            </div>
          )}

          <div className="flex flex-col gap-1.5">
            <label htmlFor={inputId} className="font-medium text-slate-700 dark:text-zinc-200">
              College ID card photo
            </label>
            <input id={inputId} ref={fileRef} type="file" accept={ACCEPT} onChange={onFile} className="sr-only" />

            {photo ? (
              <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white dark:border-neutral-700 dark:bg-[#1A1D20]">
                <img
                  src={photo.url}
                  alt="Preview of your college ID card"
                  className="max-h-72 w-full bg-neutral-100 object-contain dark:bg-black/40"
                />
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-neutral-200 px-3 py-2 dark:border-neutral-700">
                  <span className="text-[12px] text-slate-500 dark:text-zinc-400">
                    Check that your name, photo and college are easy to read.
                  </span>
                  <span className="flex gap-2">
                    <button type="button" onClick={pickPhoto} disabled={sending} className={btnSecondary}>
                      <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                      Change
                    </button>
                    <button type="button" onClick={() => setPhoto(null)} disabled={sending} className={btnDanger} aria-label="Remove photo">
                      <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </span>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={pickPhoto}
                disabled={preparing}
                className="flex w-full flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-neutral-300 bg-white px-4 py-6 text-center transition-colors hover:border-[var(--accent)] hover:bg-neutral-50 dark:hover:bg-white/[0.03] disabled:cursor-wait disabled:opacity-70 dark:border-neutral-700 dark:bg-transparent"
              >
                {preparing ? (
                  <ButtonLoader loading loadingText="Preparing photo…" />
                ) : (
                  <>
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-neutral-100 text-slate-600 dark:bg-white/10 dark:text-zinc-300">
                      <ImagePlus className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                    <span className="text-[13px] font-semibold text-slate-800 dark:text-zinc-100">Take or upload a photo</span>
                    <span className="text-[12px] text-slate-500 dark:text-zinc-400">JPG, PNG or WEBP. Front side, all four corners visible.</span>
                  </>
                )}
              </button>
            )}
          </div>

          <p className="flex items-start gap-2 text-[12px] text-slate-500 dark:text-zinc-400">
            <ShieldCheck className="mt-px h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
            Only our review team sees this photo. It&apos;s deleted as soon as your request is approved, rejected or cancelled.
          </p>

          <button
            type="button"
            onClick={send}
            disabled={!requestedGender || !photo || sending || preparing}
            className={cn(btnPrimary, "w-full sm:w-auto sm:self-start")}
          >
            <ButtonLoader loading={sending} loadingText={progress > 0 && progress < 100 ? `Uploading ${progress}%` : "Sending…"}>
              <IdCard className="h-4 w-4" aria-hidden="true" />
              {photoExpired ? "Send photo again" : "Send for review"}
            </ButtonLoader>
          </button>
        </div>
      )}
    </div>
  );
}
