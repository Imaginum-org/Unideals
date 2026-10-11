import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Toaster } from "../components/ui/Toast.jsx";
import { toast } from "../components/ui/toast.js";
import AppRoutes from "./routes.jsx";
import { useUser } from "../context/useUserContext.jsx";

function App() {
  const navigate = useNavigate();
  const { clearUserData } = useUser();

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
      clearUserData();
      toast.error("Your session expired. Please log in again.");
      navigate("/login", { replace: true });
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
