import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUser } from "../context/useUserContext.jsx";
import BrandLoader from "../Components/ui/BrandLoader.jsx";

const ProtectedLayout = () => {
  const { userDetails, isLoggedIn, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return <BrandLoader size="full" />;
  }

  // Require both flag and verified profile to avoid trusting forgeable cache alone.
  // fetchUserProfile runs on mount and will clear stale cache on 401.
  if (!isLoggedIn || !userDetails?._id) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedLayout;
