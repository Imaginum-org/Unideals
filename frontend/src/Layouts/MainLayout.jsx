import React from "react";
import { Outlet, useLocation } from "react-router-dom";
import Header from "../Components/layout/Header.jsx";
import Footer from "../Components/layout/Footer";

const MainLayout = () => {
  const location = useLocation();

  const shouldShowFooter = !location.pathname.startsWith("/chat");

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
