import { memo, useState } from "react";
import { motion } from "framer-motion";
import { Check, LogOut, User, Users, UserRound } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useUser } from "../../../context/useUserContext.jsx";
import { logoutUser } from "../../auth/api/authApi.js";
import { updateProfile } from "../api/userApi.js";
import { toast } from "../../../components/ui/toast.js";

/**
 * GenderGate — logged-in onboarding takeover (same UI language as CampusGate).
 * Rendered by MainLayout instead of page content when a logged-in user has
 * no gender set. One screen, asked once, stored server-side. No mention of
 * Girls Corner / Girl Mode here — plain identity step.
 */
const OPTIONS = [
  { value: "male", label: "Male", desc: "Continue with standard experience", Icon: User },
  { value: "female", label: "Female", desc: "Continue with standard experience", Icon: UserRound },
  { value: "other", label: "Other", desc: "Continue with standard experience", Icon: Users },
];

const GenderGate = memo(function GenderGate() {
  const { userDetails, updateUserDetails, clearUserData } = useUser();
  const navigate = useNavigate();
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const handleContinue = async () => {
    if (!selected || saving) return;
    setError(null);
    setSaving(true);
    try {
      const res = await updateProfile({ gender: selected });
      const saved = res.data?.user;
      if (res.data?.success && saved) {
        updateUserDetails({ gender: saved.gender ?? selected, genderUpdatedAt: saved.genderUpdatedAt ?? new Date().toISOString() });
        toast.success("Profile set. Welcome in!");
        navigate("/", { replace: true });
      } else {
        setError(res.data?.message || "Could not save. Please try again.");
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Could not save. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
    } catch {
      // Session cleanup happens regardless
    }
    clearUserData();
    navigate("/login", { replace: true });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="min-h-screen w-full bg-[#F7F9FD] font-figtree dark:bg-[#131313]"
    >
      <div className="mx-auto flex min-h-screen w-full max-w-[560px] flex-col items-center justify-center px-6 py-10">
        <div className="flex items-center gap-2">
          <img src="/logo.svg" alt="Unideals" className="h-10 w-10 object-cover" />
          <span className="text-2xl font-semibold text-black dark:text-white">Unideals</span>
        </div>

        <h1 className="mt-6 text-center text-2xl font-bold text-[#0F172A] dark:text-white sm:text-3xl">
          {`Welcome${userDetails?.name ? `, ${userDetails.name.split(" ")[0]}` : ""} 🎓`}
        </h1>
        <p className="mt-2 text-center text-sm text-[#64748B] dark:text-slate-300 sm:text-base">
          Tell us how we should set up your profile.
        </p>

        <div className="mt-6 grid w-full grid-cols-1 gap-3 sm:grid-cols-3">
          {OPTIONS.map((o) => {
            const active = selected === o.value;
            const Icon = o.Icon;
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => setSelected(o.value)}
                aria-pressed={active}
                className={`flex flex-col items-center gap-2 rounded-2xl border-2 p-5 text-center transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4F46E5] focus-visible:ring-offset-2 active:scale-[0.98] ${
                  active
                    ? "border-[#4F46E5] bg-[#EEF0FF] shadow-[0_0_0_3px_rgba(79,70,229,0.15)] dark:bg-[#1A1D20]"
                    : "border-[#E2E8F0] bg-[#F7F8FA] hover:border-[#C7D2FE] dark:border-0 dark:bg-[#1A1D20]"
                }`}
              >
                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${
                    active ? "bg-[#4F46E5] text-white" : "bg-[#EEF0FF] text-[#4F46E5] dark:bg-zinc-800"
                  }`}
                >
                  <Icon size={20} />
                </span>
                <span className="font-bold text-[#0F172A] dark:text-white">{o.label}</span>
                <span className="text-xs text-[#64748B] dark:text-slate-400">{o.desc}</span>
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                    active ? "border-[#4F46E5] bg-[#4F46E5] text-white" : "border-[#CBD5E1] text-transparent dark:border-zinc-700"
                  }`}
                >
                  <Check size={14} strokeWidth={3} />
                </span>
              </button>
            );
          })}
        </div>

        {error && (
          <p className="mt-4 w-full rounded-xl bg-red-50 px-4 py-3 text-sm font-medium text-red-600 ring-1 ring-red-100 dark:bg-red-950/20 dark:text-red-300 dark:ring-red-900/40">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!selected || saving}
          className="mt-6 w-full rounded-xl bg-[#3938EC] py-3.5 text-sm font-semibold text-white transition hover:bg-[#2829D8] focus:outline-none focus:ring-4 focus:ring-[#3938EC]/25 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saving ? "Saving..." : "Continue"}
        </button>

        <div className="mt-4 flex items-center gap-4 text-xs text-[#64748B] dark:text-slate-400">
          <button
            type="button"
            onClick={handleLogout}
            className="flex items-center gap-1.5 font-medium transition hover:text-[#3938EC]"
          >
            <LogOut size={13} />
            Log out
          </button>
        </div>
      </div>
    </motion.div>
  );
});

export default GenderGate;
