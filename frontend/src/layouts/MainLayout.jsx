import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/layout/Header.jsx";
import Footer from "../components/layout/Footer";
import CampusGate from "../features/campus/components/CampusGate.jsx";
import GenderGate from "../features/user/components/GenderGate.jsx";
import { useCampus } from "../context/CampusContext.jsx";
import { useUser } from "../context/useUserContext.jsx";

const MainLayout = () => {
  const location = useLocation();
  const { loading: userLoading, isLoggedIn, userDetails } = useUser();
  const { needsGate, directoryLoading } = useCampus();

  const hideFooterRoutes = [
    "/chat",
    "/profile",
    "/notification",
    "/myorders",
    "/productlisted",
    "/settings",
    "/contact",
    "/wishlist",
    "/termscondition",
    "/subscription",
    "/achievements",
  ];

  const shouldShowFooter = !hideFooterRoutes.some((route) =>
    location.pathname.startsWith(route),
  );

  // Location (campus) gate first, then gender gate. Same blocking
  // takeover language so everything stays in sync. Guests never gated.
  const gateReady = !userLoading && !directoryLoading;
  if (gateReady && needsGate) {
    return <CampusGate />;
  }
  const needsGenderGate = gateReady && isLoggedIn && userDetails && (userDetails.gender === null || userDetails.gender === undefined || userDetails.gender === "");
  if (needsGenderGate) {
    return <GenderGate />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />

      <main className="flex-1">
        <Outlet />
      </main>

      {shouldShowFooter && <Footer />}
    </div>
  );
};

export default React.memo(MainLayout);
