import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Toaster } from "../components/ui/Toast.jsx";
import { toast } from "../components/ui/toast.js";
import AppRoutes from "./routes.jsx";
import { useUser } from "../context/useUserContext.jsx";

// Prefixes that require a session (must mirror ProtectedLayout in
// routes.jsx). A dead session on any other page clears state silently
// so guests keep browsing freely instead of being yanked to /login.
const PROTECTED_PREFIXES = [
  "/profile",
  "/profileoverview",
  "/subscription",
  "/settings",
  "/setting",
  "/wishlist",
  "/achievements",
  "/badge",
  "/myorders",
  "/chat",
  "/notification",
  "/upload",
  "/productlisted",
];

const isProtectedPath = (pathname = "") =>
  PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );

function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const { clearUserData, isLoggedIn } = useUser();

  // Refs so the one-time event listeners always see fresh values.
  const isLoggedInRef = useRef(isLoggedIn);
  isLoggedInRef.current = isLoggedIn;
  const locationRef = useRef(location);
  locationRef.current = location;

  useEffect(() => {
    const handleBlockedAccount = (event) => {
      clearUserData();
      toast.error(
        event.detail?.message || "Your account access has been restricted.",
      );
      navigate("/login", { replace: true });
    };

    // Fired only when the refresh endpoint itself returns 401 — the
    // session is truly dead (expired/revoked). Ordinary 401s are healed
    // silently by the interceptor and never reach here.
    const handleSessionExpired = () => {
      const wasLoggedIn = isLoggedInRef.current;
      clearUserData();
      // Never-logged-in guests: stay silent, stay put. A background
      // request failing must not bounce public browsing to /login.
      // Protected pages have their own gate (ProtectedLayout) which
      // redirects when the user actually tries to visit them.
      if (!wasLoggedIn) return;
      toast.error("Your session expired. Please log in again.");
      if (isProtectedPath(locationRef.current?.pathname)) {
        navigate("/login", { replace: true });
      }
    };

    window.addEventListener("unideals:account-blocked", handleBlockedAccount);
    window.addEventListener("unideals:session-expired", handleSessionExpired);

    return () => {
      window.removeEventListener(
        "unideals:account-blocked",
        handleBlockedAccount,
      );
      window.removeEventListener(
        "unideals:session-expired",
        handleSessionExpired,
      );
    };
  }, [clearUserData, navigate]);

  return (
    <div className="App">
      <AppRoutes />
      <Toaster />
    </div>
  );
}

export default App;
