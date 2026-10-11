import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Crown, Lock, MessageSquareText, X } from "lucide-react";
import { WALLPAPERS, chatSettingsOf } from "../../chat/utils/wallpapers.js";
import { updateChatSettings } from "../api/userApi.js";
import { toast } from "../../../components/ui/toast.js";

const Toggle = ({ checked, onChange, label, hint }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className="flex w-full items-center justify-between gap-4 py-3 text-left"
  >
    <span className="min-w-0">
      <span className="block text-sm font-semibold text-gray-900 dark:text-white">
        {label}
      </span>
      {hint && (
        <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
          {hint}
        </span>
      )}
    </span>
    <span
      className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
        checked ? "bg-[#3838EC]" : "bg-zinc-300 dark:bg-zinc-700"
      }`}
    >
      <span
        className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${
          checked ? "left-[22px]" : "left-0.5"
        }`}
      />
    </span>
  </button>
);

/**
 * Chat settings section (Settings > Chat): wallpaper picker + read
 * receipts + typing indicators. Persists to the profile and flows into
 * the chat instantly via user context.
 */
const ChatSettings = ({ user, onSaved }) => {
  const navigate = useNavigate();
  const initial = chatSettingsOf(user);
  const [wallpaper, setWallpaper] = useState(initial.wallpaper);
  const [readReceipts, setReadReceipts] = useState(initial.read_receipts);
  const [typing, setTyping] = useState(initial.typing_indicators);
  const [saving, setSaving] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);

  // Read-receipt control is a Pro/Pro+ perk; admins are always entitled.
  // Base users stay on the default (enabled) with a locked toggle.
  const receiptsEntitled =
    user?.role === "admin" ||
    user?.subscription === "pro" ||
    user?.subscription === "pro_plus";

  useEffect(() => {
    const s = chatSettingsOf(user);
    setWallpaper(s.wallpaper);
    setReadReceipts(s.read_receipts);
    setTyping(s.typing_indicators);
  }, [user?._id]); // eslint-disable-line react-hooks/exhaustive-deps

  const dirty =
    wallpaper !== initial.wallpaper ||
    readReceipts !== initial.read_receipts ||
    typing !== initial.typing_indicators;

  const save = async (patch) => {
    setSaving(true);
    try {
      const res = await updateChatSettings(patch);
      onSaved?.(res.data?.chat_settings || patch);
      toast.success("Chat settings saved");
    } catch (err) {
      if (err?.response?.data?.code === "UPGRADE_REQUIRED") {
        setShowUpgrade(true);
      } else {
        toast.error(err?.response?.data?.message || "Could not save settings");
      }
    } finally {
      setSaving(false);
    }
  };

  const saveAll = () =>
    save({ wallpaper, read_receipts: readReceipts, typing_indicators: typing });

  useEffect(() => {
    if (!showUpgrade) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setShowUpgrade(false);
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [showUpgrade]);

  return (
    <section className="max-w-[770px] space-y-6">
      <div className="rounded-2xl border border-gray-100 bg-[#F7F8FA] p-6 shadow-sm dark:border-gray-800 dark:bg-[#1c1c1c]">
        <h2 className="flex items-center gap-2 text-base font-bold text-gray-900 dark:text-white">
          <MessageSquareText size={18} className="text-[#3838EC]" />
          Chat wallpaper
        </h2>
        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
          Pick a backdrop for your chat window. Applies instantly, on every
          device.
        </p>
        <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
          {WALLPAPERS.map((w) => {
            const active = wallpaper === w.id;
            return (
              <button
                key={w.id}
                type="button"
                onClick={() => {
                  setWallpaper(w.id);
                  save({ wallpaper: w.id });
                }}
                aria-pressed={active}
                className="group flex flex-col items-center gap-1.5"
              >
                <span
                  className={`relative h-16 w-full overflow-hidden rounded-xl border bg-[#F7F9FD] dark:bg-[#131313] ${w.cls} ${
                    active
                      ? "border-[#3838EC] ring-2 ring-[#3838EC]/30"
                      : "border-zinc-200 dark:border-zinc-700 group-hover:border-[#3838EC]/50"
                  }`}
                >
                  {active && (
                    <span className="absolute right-1 top-1 flex size-5 items-center justify-center rounded-full bg-[#3838EC] text-white">
                      <Check size={12} strokeWidth={3} />
                    </span>
                  )}
                </span>
                <span
                  className={`text-[11px] font-semibold ${
                    active
                      ? "text-[#3838EC]"
                      : "text-zinc-500 dark:text-zinc-400"
                  }`}
                >
                  {w.name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="rounded-2xl border border-gray-100 bg-[#F7F8FA] px-5 py-2 shadow-sm dark:border-gray-800 dark:bg-[#1c1c1c]">
        <h2 className="pt-3 text-base font-bold text-gray-900 dark:text-white">
          Privacy
        </h2>
        <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
          {receiptsEntitled ? (
            <Toggle
              checked={readReceipts}
              onChange={setReadReceipts}
              label="Read receipts"
              hint="Off means grey ticks forever, both ways. Like it should be."
            />
          ) : (
            <button
              type="button"
              onClick={() => setShowUpgrade(true)}
              className="flex w-full items-center justify-between gap-4 py-3 text-left"
              aria-label="Read receipts, Pro locked"
            >
              <span className="min-w-0">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-gray-900 dark:text-white">
                  Read receipts
                  <span className="flex items-center gap-1 rounded-md bg-gradient-to-r from-[#FFD700] to-[#FF8C00] px-1.5 py-px text-[9px] font-black text-black">
                    <Lock size={9} strokeWidth={3} /> PRO
                  </span>
                </span>
                <span className="mt-0.5 block text-xs text-gray-500 dark:text-gray-400">
                  Upgrade to control blue ticks.
                </span>
              </span>
              <span className="relative h-6 w-11 shrink-0 rounded-full bg-zinc-300 dark:bg-zinc-700 opacity-70">
                <span className="absolute left-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-white shadow">
                  <Lock size={11} className="text-zinc-400" />
                </span>
              </span>
            </button>
          )}
          <Toggle
            checked={typing}
            onChange={setTyping}
            label="Typing indicators"
            hint="Let people see when you're typing."
          />
        </div>
        <div className="flex justify-end py-3">
          <button
            type="button"
            onClick={saveAll}
            disabled={!dirty || saving}
            className="rounded-lg bg-[#3838EC] px-5 py-2.5 text-sm font-medium text-[#FCFCFC] transition-all hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
          >
            {saving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </div>

      {showUpgrade && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4"
          onClick={() => setShowUpgrade(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Upgrade to Pro"
        >
          <div
            className="w-full max-w-sm rounded-2xl bg-white shadow-2xl overflow-hidden dark:bg-zinc-900"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-5 pt-5">
              <p className="flex items-center gap-2 font-bold text-[15px] text-zinc-900 dark:text-white">
                <span className="flex size-9 items-center justify-center rounded-full bg-gradient-to-r from-[#FFD700] to-[#FF8C00] text-black shrink-0">
                  <Crown size={17} />
                </span>
                Read receipts is Pro
              </p>
              <button
                onClick={() => setShowUpgrade(false)}
                aria-label="Close upgrade dialog"
                className="p-1.5 rounded-full text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                <X size={18} />
              </button>
            </div>
            <p className="px-5 mt-2 text-[13px] leading-6 text-zinc-500 dark:text-zinc-400">
              Upgrade to control blue ticks, get priority placement, and unlock
              everything Pro.
            </p>
            <div className="p-5 flex gap-2">
              <button
                onClick={() => setShowUpgrade(false)}
                className="flex-1 px-4 py-2.5 rounded-lg border border-zinc-200 text-sm font-medium text-zinc-600 hover:bg-zinc-50 transition-all dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
              >
                Maybe later
              </button>
              <button
                onClick={() => {
                  setShowUpgrade(false);
                  navigate("/price");
                }}
                className="flex-1 px-4 py-2.5 rounded-lg bg-[#3838EC] text-sm font-medium text-[#FCFCFC] transition-all hover:scale-[1.02]"
              >
                View plans
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};

export default ChatSettings;
