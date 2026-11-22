import { useEffect, useState } from "react";
import { BellRing, MapPin } from "lucide-react";
import { Switch, inputClass } from "../../product/components/listing/ListingKit.jsx";
import { toast } from "../../../components/ui/toast.js";
import { cn } from "../../../utils/cn.js";
import { updateRentProfile, rentErrorMessage } from "../api/rentApi.js";
import { Sheet, btnPrimary } from "./RentKit.jsx";

/**
 * First visit (or "Change block"): pick your hostel block and whether to get
 * "someone in your block needs …" alerts.
 */
export default function BlockSetupSheet({ open, onOpenChange, blocks = [], profile, onSaved, firstRun = false }) {
  const [block, setBlock] = useState(profile?.block || "");
  const [alerts, setAlerts] = useState(profile ? profile.alerts !== false : true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setBlock(profile?.block || "");
    setAlerts(profile ? profile.alerts !== false : true);
  }, [open, profile]);

  const save = async () => {
    if (!block.trim()) {
      toast.error("Pick your block first");
      return;
    }
    setSaving(true);
    try {
      const saved = await updateRentProfile({ block: block.trim(), alerts });
      toast.success(`You're set: ${saved.block}`);
      onSaved?.(saved);
      onOpenChange(false);
    } catch (error) {
      toast.error(rentErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      title={firstRun ? "Which block are you in?" : "Your block"}
      description="We show things from your block first, so help is a few steps away, even after the gates close."
      footer={
        <button type="button" onClick={save} disabled={saving || !block.trim()} className={cn(btnPrimary, "w-full")}>
          {saving ? "Saving…" : firstRun ? "Start browsing" : "Save"}
        </button>
      }
    >
      <div className="space-y-5 pt-2">
        {blocks.length ? (
          <div role="radiogroup" aria-label="Block" className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {blocks.map((b) => {
              const active = b === block;
              return (
                <button
                  key={b}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setBlock(b)}
                  className={cn(
                    "min-h-11 rounded-xl border px-2 text-[13.5px] font-semibold transition-colors",
                    active
                      ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent-text)]"
                      : "border-neutral-200 bg-white text-slate-700 hover:border-[var(--accent-ring)] dark:border-neutral-700 dark:bg-[#131313] dark:text-zinc-200",
                  )}
                >
                  {b}
                </button>
              );
            })}
          </div>
        ) : (
          <label className="block">
            <span className="mb-1.5 flex items-center gap-1.5 text-[13.5px] font-semibold text-slate-800 dark:text-zinc-200">
              <MapPin className="h-4 w-4" aria-hidden="true" /> Block or hostel
            </span>
            <input
              value={block}
              onChange={(e) => setBlock(e.target.value.slice(0, 40))}
              placeholder="e.g. Block C"
              className={cn(inputClass(false), "h-11")}
            />
          </label>
        )}

        <div className="flex items-start justify-between gap-4 rounded-2xl bg-neutral-50 p-4 dark:bg-white/5">
          <div className="flex min-w-0 items-start gap-3">
            <BellRing className="mt-0.5 h-5 w-5 shrink-0 text-[var(--accent-text)]" aria-hidden="true" />
            <div>
              <p className="text-[14px] font-semibold text-slate-900 dark:text-white">Alert me when my block needs something</p>
              <p className="mt-0.5 text-[12.5px] text-slate-500 dark:text-zinc-400">
                A few pings a day at most. Help out, earn a little.
              </p>
            </div>
          </div>
          <Switch checked={alerts} onChange={setAlerts} label="Block alerts" />
        </div>
      </div>
    </Sheet>
  );
}
