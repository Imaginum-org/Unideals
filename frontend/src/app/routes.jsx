import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../Layouts/MainLayout.jsx";
import ProtectedLayout from "../Layouts/ProtectedLayout.jsx";
import PublicOnlyRoute from "../Layouts/PublicOnlyRoute.jsx";
import BrandLoader from "../Components/ui/BrandLoader.jsx";

// Route-level code splitting: each page loads on demand instead of bloating
// the initial Home bundle. BrandLoader matches existing loading UX.
// Auth
const Login = lazy(() => import("../features/auth/pages/Login.jsx"));
const Signup = lazy(() => import("../features/auth/pages/Signup.jsx"));
const ForgotPassword = lazy(
  () => import("../features/auth/pages/ForgotPassword.jsx"),
);
const ResetPassword = lazy(
  () => import("../features/auth/pages/ResetPassword.jsx"),
);
const VerifyEmail = lazy(
  () => import("../features/auth/pages/VerifyEmail.jsx"),
);
const CheckEmail = lazy(
  () => import("../features/auth/pages/CheckEmail.jsx"),
);
// Product
const Home = lazy(() => import("../features/product/pages/Home.jsx"));
const ProductDescription = lazy(
  () => import("../features/product/pages/ProductDescription.jsx"),
);
const ProductListing = lazy(
  () => import("../features/product/pages/ProductListing.jsx"),
);
const ProductListed = lazy(
  () => import("../features/product/pages/ProductListed.jsx"),
);
const ProductCategory = lazy(
  () => import("../features/product/pages/ProductCategory.jsx"),
);
const PricingModel = lazy(
  () => import("../features/product/pages/PricingModel.jsx"),
);
// User
const ProfileOverview = lazy(
  () => import("../features/user/pages/ProfileOverview.jsx"),
);
const Achievements = lazy(
  () => import("../features/user/pages/Achievements.jsx"),
);
const Settings = lazy(() => import("../features/user/pages/Settings.jsx"));
const Subscription = lazy(
  () => import("../features/user/pages/Subscription.jsx"),
);
const Wishlist = lazy(() => import("../features/user/pages/Wishlist.jsx"));
const Myorders = lazy(() => import("../features/user/pages/Myorders.jsx"));
const ContactUs = lazy(() => import("../features/user/pages/ContactUs.jsx"));
const Termscondition = lazy(
  () => import("../features/user/pages/Termscondition.jsx"),
);
const PrivacyPolicy = lazy(
  () => import("../features/legal/pages/PrivacyPolicy.jsx"),
);
const Chat = lazy(() => import("../features/chat/pages/Chat.jsx"));
const Notification = lazy(
  () => import("../features/notification/pages/Notification.jsx"),
);
const SearchResults = lazy(
  () => import("../features/search/pages/SearchResults.jsx"),
);
const PhoneUpload = lazy(
  () => import("../features/handoff/pages/PhoneUpload.jsx"),
);

function RouteFallback() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <BrandLoader size="md" label="Loading…" />
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* AUTH (NO HEADER) - redirect logged-in users to home */}
        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/checkEmail" element={<CheckEmail />} />
        </Route>

        {/* PUBLIC WITH HEADER */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/product/:id" element={<ProductDescription />} />
          <Route path="/category/:categoryName" element={<ProductCategory />} />
          <Route path="/price" element={<PricingModel />} />
          <Route path="/termscondition" element={<Termscondition />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
        </Route>

        {/* PROTECTED WITH HEADER */}
        <Route element={<ProtectedLayout />}>
          <Route element={<MainLayout />}>
            <Route path="/profile" element={<ProfileOverview />} />
            <Route
              path="/profileoverview"
              element={<Navigate to="/profile" replace />}
            />
            <Route path="/subscription" element={<Subscription />} />
            <Route path="/settings" element={<Settings />} />
            <Route
              path="/setting"
              element={<Navigate to="/settings" replace />}
            />
            <Route path="/wishlist" element={<Wishlist />} />
            <Route path="/achievements" element={<Achievements />} />
            <Route path="/badge" element={<Navigate to="/achievements" replace />} />
            <Route path="/myorders" element={<Myorders />} />
            <Route path="/chat" element={<Chat />} />
            <Route path="/notification" element={<Notification />} />
            <Route path="/upload" element={<ProductListing />} />
            <Route path="/upload/:productId" element={<ProductListing />} />
            <Route path="/productlisted" element={<ProductListed />} />
            <Route path="/contact" element={<ContactUs />} />
          </Route>
        </Route>

        {/* Phone photo handoff: public, secret-in-URL auth, no layout.
            Must stay outside PublicOnlyRoute (logged-in phones use it too). */}
        <Route path="/p/:code" element={<PhoneUpload />} />

        {/* 404 - must be last */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
