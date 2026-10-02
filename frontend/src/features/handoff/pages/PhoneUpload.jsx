import { useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { MdPhotoLibrary, MdPhotoCamera, MdCheckCircle } from "react-icons/md";
import { uploadHandoffPhotos } from "../api/handoffApi.js";
import BrandLoader from "../../../Components/ui/BrandLoader.jsx";

const DEFAULT_MAX_FILES = 3;
const MAX_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/jpg", "image/webp"];

// Phone-side compression targets: uploads shrink ~10x on mobile networks.
// Lazy-loaded so the landing chunk stays lean.
const COMPRESS_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  initialQuality: 0.85,
  fileType: "image/jpeg",
};

// Mobile page opened by scanning the desktop QR. No login needed — the `k`
// secret in the URL is the capability token (15-min TTL, server-enforced).
const PhoneUpload = () => {
  const { code } = useParams();
  const [searchParams] = useSearchParams();
  const secret = searchParams.get("k") || "";
  // Hybrid slots from the desktop QR: how many more fit + what's already
  // on the laptop. Falls back to the listing-wide cap of 3.
  const maxFiles = Math.min(
    DEFAULT_MAX_FILES,
    Math.max(1, Number.parseInt(searchParams.get("max"), 10) || DEFAULT_MAX_FILES),
  );
  const laptopCount = Math.max(
    0,
    Number.parseInt(searchParams.get("used"), 10) || 0,
  );
  const galleryRef = useRef(null);
  const cameraRef = useRef(null);

  const [files, setFiles] = useState([]); // File[]
  const [previews, setPreviews] = useState([]); // object URLs
  const [uploading, setUploading] = useState(false);
  const [optimizing, setOptimizing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);
  const [failed, setFailed] = useState("");

  if (!code || !secret) {
    return (
      <MobileShell title="Invalid link">
        <p className="text-center text-sm leading-6 text-[#6B7280]">
          This QR link is incomplete. Please scan the QR code from your
          laptop again.
        </p>
      </MobileShell>
    );
  }

  const addFiles = (list) => {
    const remaining = maxFiles - files.length;
    if (remaining <= 0) {
      toast.error(
        laptopCount > 0
          ? `${laptopCount} already on the laptop — only ${maxFiles} more fit.`
          : `Only ${maxFiles} photo${maxFiles === 1 ? "" : "s"} fit.`,
      );
      return;
    }
    const picked = Array.from(list || []).slice(0, remaining);
    const valid = [];
    for (const file of picked) {
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error(`${file.name} is not a supported image`);
        continue;
      }
      if (file.size > MAX_SIZE) {
        toast.error(`${file.name} exceeds 10MB`);
        continue;
      }
      valid.push(file);
    }
    if (valid.length === 0) return;
    setFiles((prev) => [...prev, ...valid]);
    setPreviews((prev) => [...prev, ...valid.map((f) => URL.createObjectURL(f))]);
  };

  const removeAt = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => {
      const removed = prev[index];
      if (removed?.startsWith("blob:")) URL.revokeObjectURL(removed);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleUpload = async () => {
    if (files.length === 0 || uploading || optimizing) return;
    setUploading(true);
    setOptimizing(true);
    setProgress(0);
    setFailed("");
    try {
      // Compress on-device first: a 10MB camera shot becomes ~1MB, which
      // is the actual speedup on slow mobile networks. Files already
      // under ~1MB skip recompression.
      const { default: imageCompression } = await import(
        "browser-image-compression"
      );
      const optimized = await Promise.all(
        files.map(async (file) => {
          try {
            if (file.size <= 1024 * 1024) return file;
            const out = await imageCompression(file, COMPRESS_OPTIONS);
            return new File([out], file.name.replace(/\.[^.]+$/, ".jpg"), {
              type: out.type || "image/jpeg",
            });
          } catch {
            return file; // never block the send on compression failure
          }
        }),
      );
      setOptimizing(false);
      const formData = new FormData();
      optimized.forEach((file) => formData.append("photos", file, file.name));
      await uploadHandoffPhotos(code, secret, formData, (event) => {
        if (event.total) setProgress(Math.round((event.loaded / event.total) * 100));
      });
      setDone(true);
      toast.success("Photos sent to your listing!");
    } catch (err) {
      const status = err?.response?.status;
      const code = err?.response?.data?.code;
      if (status === 404) {
        setFailed("This session was not found. Please scan a fresh QR code.");
      } else if (status === 410 || code === "HANDOFF_EXPIRED") {
        setFailed("This QR code has expired. Please generate a new one on your laptop.");
      } else if (status === 401) {
        setFailed("This link is invalid. Please scan the QR code again.");
      } else {
        setFailed(err?.response?.data?.message || "Upload failed. Please try again.");
      }
    } finally {
      setUploading(false);
      setOptimizing(false);
    }
  };

  if (done) {
    return (
      <MobileShell title="Photos sent!">
        <div className="flex flex-col items-center gap-3 py-6 text-center">
          <MdCheckCircle size={56} className="text-emerald-500" />
          <p className="text-sm leading-6 text-[#6B7280]">
            {files.length} photo{files.length === 1 ? "" : "s"} attached to your
            listing draft. You can go back to your laptop — they are already
            there. You may close this page.
          </p>
        </div>
      </MobileShell>
    );
  }

  return (
    <MobileShell title="Send photos to your listing">
      <p className="text-center text-xs font-semibold tracking-wider text-[#9CA3AF] uppercase">
        Session {String(code).toUpperCase()}
      </p>

      {failed ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-center">
          <p className="text-sm font-medium leading-6 text-red-600">{failed}</p>
        </div>
      ) : null}

      {/* Pickers */}
      {laptopCount > 0 && (
        <p className="mt-4 rounded-xl bg-[#EEF2FF] px-4 py-2.5 text-center text-sm font-semibold text-[#4F46E5]">
          {laptopCount} already on the laptop — you can send {maxFiles} more
        </p>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => galleryRef.current?.click()}
          disabled={uploading || files.length >= maxFiles}
          className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#D1D5DB] bg-[#F8FAFC] p-5 text-sm font-bold text-[#374151] transition active:scale-[0.98] disabled:opacity-50"
        >
          <MdPhotoLibrary size={28} className="text-[#4F46E5]" />
          Gallery
        </button>
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={uploading || files.length >= maxFiles}
          className="flex flex-col items-center gap-2 rounded-2xl border-2 border-dashed border-[#D1D5DB] bg-[#F8FAFC] p-5 text-sm font-bold text-[#374151] transition active:scale-[0.98] disabled:opacity-50"
        >
          <MdPhotoCamera size={28} className="text-[#4F46E5]" />
          Camera
        </button>
        <input
          ref={galleryRef}
          type="file"
          hidden
          multiple
          accept=".png,.jpg,.jpeg,.webp,image/png,image/jpeg,image/webp"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
        <input
          ref={cameraRef}
          type="file"
          hidden
          accept="image/*"
          capture="environment"
          onChange={(e) => {
            addFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {/* Previews */}
      {previews.length > 0 && (
        <div className="mt-4 grid grid-cols-3 gap-2">
          {previews.map((src, index) => (
            <div key={`${src}-${index}`} className="relative aspect-square overflow-hidden rounded-xl border border-[#ECECEC]">
              <img src={src} alt={`Selected ${index + 1}`} className="h-full w-full object-cover" />
              {!uploading && (
                <button
                  type="button"
                  onClick={() => removeAt(index)}
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-lg font-bold leading-none text-white"
                  aria-label={`Remove photo ${index + 1}`}
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Upload */}
      <button
        type="button"
        onClick={handleUpload}
        disabled={uploading || files.length === 0}
        className="mt-5 flex h-[54px] w-full items-center justify-center gap-3 rounded-2xl bg-[#4F46E5] text-base font-bold text-white shadow-xl shadow-indigo-200 transition hover:bg-[#4338CA] disabled:cursor-not-allowed disabled:opacity-60"
      >
        {uploading ? (
          <>
            <BrandLoader size="xs" tone="white" />
            <span>
              {optimizing ? "Optimizing…" : `Sending… ${progress}%`}
            </span>
          </>
        ) : (
          <span>
            Send {files.length > 0 ? `${files.length} ` : ""}photo{files.length === 1 ? "" : "s"} to laptop
          </span>
        )}
      </button>
      <p className="mt-3 text-center text-xs leading-5 text-[#9CA3AF]">
        Photos attach to your listing draft automatically. Max {maxFiles}, 10MB each.
      </p>
    </MobileShell>
  );
};

const MobileShell = ({ title, children }) => (
  <main className="min-h-[100dvh] bg-white px-5 py-8 font-figtree text-[#111827] dark:bg-[#131313] dark:text-white">
    <div className="mx-auto w-full max-w-md">
      <div className="flex items-center gap-2.5">
        <img src="/logo.svg" alt="Unideals" className="h-9 w-9 object-contain" />
        <span className="text-lg font-bold">Unideals</span>
      </div>
      <h1 className="mt-6 text-xl font-extrabold">{title}</h1>
      <div className="mt-4">{children}</div>
    </div>
  </main>
);

export default PhoneUpload;
