import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../context/useUserContext.jsx";
import BrandLoader from "../Components/ui/BrandLoader.jsx";

// Redirect authenticated users away from auth pages (login/signup/etc.)
const PublicOnlyRoute = () => {
  const { userDetails, isLoggedIn, loading } = useUser();

  if (loading) {
    return <BrandLoader size="full" />;
  }

  if (isLoggedIn && userDetails?._id) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PublicOnlyRoute;
