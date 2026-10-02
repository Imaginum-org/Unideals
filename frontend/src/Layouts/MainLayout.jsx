import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../Components/layout/Header.jsx";
import Footer from "../Components/layout/Footer";
import CampusGate from "../features/campus/components/CampusGate.jsx";
import { useCampus } from "../context/CampusContext.jsx";
import { useUser } from "../context/useUserContext.jsx";

const MainLayout = () => {
  const location = useLocation();
  const { loading: userLoading } = useUser();
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

  // Campus-less sessions never see app content: the gate is the only UI
  // until a campus is chosen (one screen, asked once, stored server-side).
  // While identity/directory is still loading, render content normally to
  // avoid flashing the gate on every refresh.
  const gateReady = !userLoading && !directoryLoading;
  if (gateReady && needsGate) {
    return <CampusGate />;
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
