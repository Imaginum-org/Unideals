import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Bell,
  ChevronRight,
  CircleHelp,
  Crown,
  FileText,
  Heart,
  LifeBuoy,
  LogOut,
  Package,
  Settings,
  ShoppingBag,
  Trophy,
} from "lucide-react";
import { useUser, clearAccountScopedStorage } from "../../../context/useUserContext.jsx";
import { useNotification } from "../../../context/NotificationContext.jsx";
import { logoutUser } from "../../auth/api/authApi.js";
import { toast } from "../../../components/ui/toast.js";
import ButtonLoader from "../../../components/ui/ButtonLoader.jsx";

// Phones only (md:hidden). On desktop the account pages share the left
// sidebar; on a phone that sidebar is hidden, so the Profile tab ends with
// this native-style settings list — every account destination one tap
// away, plus Log out.

const GROUPS = [
  {
    title: "Buying & selling",
    items: [
      { to: "/myorders", label: "Orders", icon: Package },
      { to: "/productlisted", label: "My listings", icon: ShoppingBag },
      { to: "/wishlist", label: "Wishlist", icon: Heart },
      { to: "/notification", label: "Notifications", icon: Bell, badgeKey: "notif" },
    ],
  },
  {
    title: "Account",
    items: [
      { to: "/achievements", label: "Achievements", icon: Trophy },
      { to: "/subscription", label: "Subscription", icon: Crown },
      { to: "/settings", label: "Settings", icon: Settings },
    ],
  },
  {
    title: "Support",
    items: [
      { to: "/faq", label: "FAQ", icon: CircleHelp },
      { to: "/contact", label: "Help & support", icon: LifeBuoy },
      { to: "/termscondition", label: "Terms & privacy", icon: FileText },
    ],
  },
];

function Row({ to, label, icon: Icon, badge }) {
  return (
    <Link
      to={to}
      className="flex min-h-[52px] items-center gap-3 px-4 transition-colors active:bg-neutral-100 dark:active:bg-white/5"
    >
      <Icon className="h-[17px] w-[17px] shrink-0 text-slate-400 dark:text-zinc-500" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-slate-800 dark:text-zinc-100">{label}</span>
      {badge > 0 && (
        <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#FF3B30] px-1.5 text-[11px] font-bold text-white">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 dark:text-zinc-600" aria-hidden="true" />
    </Link>
  );
}

export default function MobileAccountMenu() {
  const navigate = useNavigate();
  const { clearUserData } = useUser();
  const { unreadCount } = useNotification();
  const [loggingOut, setLoggingOut] = useState(false);

  const handleLogout = async () => {
    if (loggingOut) return;
    setLoggingOut(true);
    try {
      const res = await logoutUser();
      if (res?.data?.success) {
        clearUserData();
        clearAccountScopedStorage();
        toast.success("Logged out successfully");
        navigate("/");
        return;
      }
      toast.error("Logout failed");
    } catch {
      toast.error("Logout failed");
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <nav aria-label="Account" className="space-y-5 md:hidden">
      {GROUPS.map((group) => (
        <section key={group.title}>
          <h2 className="mb-2 px-1 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-zinc-500">
            {group.title}
          </h2>
          <div className="divide-y divide-neutral-100 overflow-hidden rounded-2xl border border-neutral-200/80 bg-white dark:divide-neutral-800 dark:border-neutral-800 dark:bg-[#1A1D20]">
            {group.items.map((item) => (
              <Row key={item.to} {...item} badge={item.badgeKey === "notif" ? unreadCount : 0} />
            ))}
          </div>
        </section>
      ))}

      <button
        type="button"
        onClick={handleLogout}
        disabled={loggingOut}
        className="flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-red-200 bg-white text-[15px] font-semibold text-red-600 transition-colors active:bg-red-50 disabled:opacity-70 dark:border-red-900/50 dark:bg-[#1A1D20] dark:text-red-400 dark:active:bg-red-950/30"
      >
        {loggingOut ? <ButtonLoader /> : <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />}
        Log out
      </button>
    </nav>
  );
}
