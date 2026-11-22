import { useRef, useState } from "react";
import { CircleAlert, ImagePlus, Star, Trash2, Upload } from "lucide-react";
import { cn } from "../../../../utils/cn.js";
import { MAX_PHOTOS, newImage } from "./listingForm.js";

const TYPES = ["image/jpeg", "image/png", "image/webp"];
const EXTS = ["jpg", "jpeg", "png", "webp"];
const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Photo picker, same look as the Sell flow's photo step: a drop zone while
 * there's room, then three slots (cover first, "Make cover", delete).
 * Files stay local until publish; the page uploads them.
 */
export default function PhotoDropzone({ images, onChange }) {
  const inputRef = useRef(null);
  const [dragging, setDragging] = useState(false);
  const [issues, setIssues] = useState([]);
  const room = MAX_PHOTOS - images.length;

  const addFiles = (fileList) => {
    const files = Array.from(fileList || []);
    if (!files.length) return;
    if (room <= 0) {
      setIssues([`All ${MAX_PHOTOS} photo slots are full. Remove one first.`]);
      return;
    }
    const seen = new Set(images.filter((i) => i.file).map((i) => `${i.file.name}__${i.file.size}`));
    const next = [];
    const problems = [];
    for (const file of files) {
      const ext = String(file.name || "").split(".").pop()?.toLowerCase() || "";
      const key = `${file.name}__${file.size}`;
      if (!TYPES.includes(file.type) || !EXTS.includes(ext)) problems.push(`${file.name}: use JPG, PNG or WEBP`);
      else if (file.size > MAX_BYTES) problems.push(`${file.name}: larger than 10 MB`);
      else if (seen.has(key)) problems.push(`${file.name}: already added`);
      else if (next.length >= room) {
        problems.push(`Only ${MAX_PHOTOS} photos fit, so the rest were skipped`);
        break;
      } else {
        seen.add(key);
        next.push(newImage(file));
      }
    }
    setIssues(problems);
    if (next.length) onChange([...images, ...next]);
  };

  const remove = (index) => {
    const img = images[index];
    if (img?.preview) URL.revokeObjectURL(img.preview);
    setIssues([]);
    onChange(images.filter((_, i) => i !== index));
  };

  const makeCover = (index) => {
    const next = [...images];
    const [item] = next.splice(index, 1);
    onChange([item, ...next]);
  };

  const browse = () => inputRef.current?.click();

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
        multiple
        hidden
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />

      {room > 0 && (
        <div
          role="button"
          tabIndex={0}
          onClick={browse}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              browse();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-9 text-center transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent-ring)]",
            dragging
              ? "border-[var(--accent)] bg-[var(--accent-soft)]"
              : "border-neutral-300 bg-neutral-50 hover:border-[var(--accent-ring)] hover:bg-[var(--accent-soft)] dark:border-neutral-700 dark:bg-white/[0.02]",
          )}
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-[var(--accent-text)] shadow-sm dark:bg-[#1A1D20]">
            <Upload className="h-5 w-5" aria-hidden="true" />
          </span>
          <p className="mt-3 text-[14.5px] font-semibold text-slate-900 dark:text-white">
            {dragging ? (
              "Drop to add"
            ) : (
              <>
                <span className="text-[var(--accent-text)]">Click to upload</span>
                <span className="max-sm:hidden"> or drag and drop</span>
              </>
            )}
          </p>
          <p className="mt-1 text-[12.5px] text-slate-500 dark:text-zinc-400">
            JPG, PNG or WEBP · up to 10 MB each · {room} slot{room === 1 ? "" : "s"} left
          </p>
        </div>
      )}

      {issues.length > 0 && (
        <ul role="alert" className="mt-3 space-y-1 rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 dark:border-red-900/50 dark:bg-red-950/20">
          {issues.map((msg) => (
            <li key={msg} className="flex items-start gap-2 text-[12.5px] font-medium leading-5 text-red-700 dark:text-red-300">
              <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              {msg}
            </li>
          ))}
        </ul>
      )}

      <div className="mt-5 grid grid-cols-3 gap-3">
        {images.map((img, index) => (
          <div
            key={img.id}
            className={cn(
              "relative aspect-square overflow-hidden rounded-xl border bg-neutral-100 dark:bg-white/5",
              index === 0 ? "border-[var(--accent)] ring-2 ring-[var(--accent-soft-strong)]" : "border-neutral-200 dark:border-neutral-700",
            )}
          >
            <img src={img.preview || img.url} alt={`Photo ${index + 1}`} draggable={false} className="h-full w-full select-none object-cover" />
            {index === 0 ? (
              <span className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-[var(--accent)] px-1.5 py-0.5 text-[10.5px] font-bold uppercase tracking-wide text-white sm:left-2 sm:top-2">
                <Star className="h-3 w-3 fill-current" aria-hidden="true" />
                Cover
              </span>
            ) : (
              <button
                type="button"
                onClick={() => makeCover(index)}
                className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-md bg-black/60 px-1.5 py-0.5 text-[10.5px] font-semibold text-white backdrop-blur-sm transition hover:bg-black/75 sm:left-2 sm:top-2"
                aria-label={`Make photo ${index + 1} the cover`}
              >
                <Star className="h-3 w-3" aria-hidden="true" />
                <span className="max-sm:hidden">Make cover</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => remove(index)}
              aria-label={`Remove photo ${index + 1}`}
              className="absolute right-1.5 top-1.5 grid h-7 w-7 place-items-center rounded-md bg-white/90 text-red-600 shadow-sm backdrop-blur-sm transition hover:bg-white sm:right-2 sm:top-2"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>
        ))}
        {Array.from({ length: room }, (_, i) => (
          <button
            key={`empty-${i}`}
            type="button"
            onClick={browse}
            className="flex aspect-square flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-neutral-300 text-slate-400 transition-colors hover:border-[var(--accent-ring)] hover:text-[var(--accent-text)] dark:border-neutral-700 dark:text-zinc-500"
            aria-label="Add a photo"
          >
            <ImagePlus className="h-5 w-5" aria-hidden="true" />
            <span className="text-[11.5px] font-medium">{images.length === 0 && i === 0 ? "Cover" : "Add"}</span>
          </button>
        ))}
      </div>
      {images.length > 1 && <p className="mt-2.5 text-[12.5px] text-slate-500 dark:text-zinc-400">Use “Make cover” on any photo to show it first.</p>}
    </div>
  );
}
