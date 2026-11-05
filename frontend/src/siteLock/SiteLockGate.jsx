// ===========================================================================
// SITE-LOCK (testing password gate for app.unideals.in).
// Everything about the lock lives in `src/siteLock/` + the blocks marked
// [SITE-LOCK]. TO REMOVE COMPLETELY:
//   Frontend: delete this whole `src/siteLock/` folder, then
//     1. `src/app/App.jsx` — delete the 2 lines marked [SITE-LOCK]
//     2. `src/services/authInterceptor.js` — delete the block marked [SITE-LOCK]
//   Backend: delete `src/middlewares/siteGate.middleware.js`,
//     `src/controllers/siteGate.controller.js`,
//     `src/routes/siteGate.routes.js`, then in `src/app.js` and
//     `src/sockets/index.js` delete the blocks marked [SITE-LOCK].
//   (Or just set SITE_GATE_ENABLED=false on the backend and
//   VITE_SITE_LOCK_ENABLED=false on the frontend to disable without deleting.)
// ===========================================================================
import { useEffect, useState } from "react";
import instance from "../services/axiosInstance";
import SiteLock, { clearSiteUnlocked, isSiteUnlocked } from "./SiteLock.jsx";

const isLockEnabled = () =>
  String(
    import.meta.env.VITE_SITE_LOCK_ENABLED ?? "true",
  ).toLowerCase() !== "false";

/**
 * Wraps the real app. When locked, renders the password page instead of
 * `children` — no routes are touched, the URL never changes.
 */
export default function SiteLockGate({ children }) {
  const [unlocked, setUnlocked] = useState(
    () => !isLockEnabled() || isSiteUnlocked(),
  );

  // Re-verify the server cookie on boot: a faked localStorage flag alone
  // must never unlock — if the cookie is missing/expired, lock again.
  useEffect(() => {
    if (!isLockEnabled() || !isSiteUnlocked()) return;
    let cancelled = false;
    instance
      .get("/api/site-gate/status")
      .then((res) => {
        if (!cancelled && res.data?.data?.locked) {
          clearSiteUnlocked();
          setUnlocked(false);
        }
      })
      .catch(() => {
        // Offline/backend down: keep current UI, API calls will surface it.
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Any API answering SITE_LOCKED means the browser lost the gate cookie —
  // drop the flag and show the password page again.
  useEffect(() => {
    const handleSiteLocked = () => {
      clearSiteUnlocked();
      setUnlocked(false);
    };
    window.addEventListener("unideals:site-locked", handleSiteLocked);
    return () => {
      window.removeEventListener("unideals:site-locked", handleSiteLocked);
    };
  }, []);

  if (!unlocked) {
    return <SiteLock onUnlock={() => setUnlocked(true)} />;
  }
  return children;
}
