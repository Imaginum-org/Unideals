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

    window.addEventListener("unideals:account-blocked", handleBlockedAccount);

    return () => {
      window.removeEventListener(
        "unideals:account-blocked",
        handleBlockedAccount,
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
