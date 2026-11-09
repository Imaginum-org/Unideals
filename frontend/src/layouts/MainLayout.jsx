import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../components/layout/Header.jsx";
import Footer from "../components/layout/Footer";
import MobileTabBar, { shouldShowTabBar } from "../components/layout/MobileTabBar.jsx";
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
    "/faq",
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
    <div className="flex min-h-[100dvh] flex-col">
      <Header />

      <main className="flex-1">
        <Outlet />
      </main>

      {shouldShowFooter && <Footer />}

      {/* Phones: app-style bottom tabs. The spacer keeps the last content
          (and the footer) clear of the fixed bar + home-indicator inset. */}
      {shouldShowTabBar(location.pathname) && !location.pathname.startsWith("/chat") && (
        <div aria-hidden="true" className="tabbar-spacer h-[var(--tabbar-h)] shrink-0 sm:hidden" />
      )}
      <MobileTabBar />
    </div>
  );
};

export default React.memo(MainLayout);
