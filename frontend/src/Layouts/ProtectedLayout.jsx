import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useUser } from "../context/useUserContext.jsx";

const ProtectedLayout = () => {
  const { userDetails, isLoggedIn, loading } = useUser();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  // Require both flag and verified profile to avoid trusting forgeable cache alone.
  // fetchUserProfile runs on mount and will clear stale cache on 401.
  if (!isLoggedIn || !userDetails?._id) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <Outlet />;
};

export default ProtectedLayout;
