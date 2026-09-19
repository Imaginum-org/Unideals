import { Navigate, Outlet } from "react-router-dom";
import { useUser } from "../context/useUserContext.jsx";

// Redirect authenticated users away from auth pages (login/signup/etc.)
const PublicOnlyRoute = () => {
  const { userDetails, isLoggedIn, loading } = useUser();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (isLoggedIn && userDetails?._id) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
};

export default PublicOnlyRoute;
