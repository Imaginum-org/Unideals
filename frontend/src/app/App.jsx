import { Toaster } from "react-hot-toast";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-hot-toast";
import AppRoutes from "./routes.jsx";
import { useUser } from "../context/useUserContext.jsx";
import SmoothScroll from "../components/common/SmoothScroll.jsx";

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
      {/* <SmoothScroll /> */}
      <AppRoutes />
      <Toaster position="top-center" />
    </div>
  );
}

export default App;
