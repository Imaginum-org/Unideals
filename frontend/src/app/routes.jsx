import { Suspense, lazy } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import MainLayout from "../layouts/MainLayout.jsx";
import ProtectedLayout from "../layouts/ProtectedLayout.jsx";
import PublicOnlyRoute from "../layouts/PublicOnlyRoute.jsx";
import BrandLoader from "../components/ui/BrandLoader.jsx";

// Lazy import that survives stale chunks. After a deploy (or when the Vite
// dev cache is rebuilt), a tab opened earlier asks for chunk URLs that no
// longer exist → "Failed to fetch dynamically imported module" and the whole
// app blanks. Retry once, then reload the page ONCE to pick up the new build.
// A sessionStorage stamp prevents reload loops (max one per minute); a
// genuine failure after that is re-thrown as before.
const RELOAD_KEY = "unideals:chunk-reload-at";
const lazyWithReload = (factory) =>
  lazy(async () => {
    try {
      return await factory();
    } catch (firstError) {
      try {
        return await factory();
      } catch {
        let last = 0;
        try {
          last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
        } catch {
          // storage unavailable — fall through to rethrow
        }
        if (Date.now() - last > 60_000) {
          try {
            sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
          } catch {
            // ignore
          }
          window.location.reload();
          // Keep Suspense showing the loader until the reload happens.
          return new Promise(() => {});
        }
        throw firstError;
      }
    }
  });

// Every page's loader is registered so it can be PREFETCHED (idle time,
// link hover / touch — see prefetchRoute below) as well as lazy-loaded.
const loaderByComponent = new Map();
const page = (factory) => {
  let promise = null;
  // Memoised: a prefetch and the real render share one download.
  const load = () => {
    if (!promise) {
      promise = factory().catch((err) => {
        promise = null; // allow a retry on the next attempt
        throw err;
      });
    }
    return promise;
  };
  const Component = lazyWithReload(load);
  loaderByComponent.set(Component, load);
  return Component;
};

// Route-level code splitting: each page loads on demand instead of bloating
// the initial Home bundle. BrandLoader matches existing loading UX.
// Auth
const Login = page(() => import("../features/auth/pages/Login.jsx"));
const Signup = page(() => import("../features/auth/pages/Signup.jsx"));
const ForgotPassword = page(() => import("../features/auth/pages/ForgotPassword.jsx"));
const ResetPassword = page(() => import("../features/auth/pages/ResetPassword.jsx"));
const VerifyEmail = page(() => import("../features/auth/pages/VerifyEmail.jsx"));
const CheckEmail = page(() => import("../features/auth/pages/CheckEmail.jsx"));
// Product
const Home = page(() => import("../features/product/pages/Home.jsx"));
const ProductDescription = page(() => import("../features/product/pages/ProductDescription.jsx"));
const ProductListing = page(() => import("../features/product/pages/ProductListing.jsx"));
const ProductListed = page(() => import("../features/product/pages/ProductListed.jsx"));
const ProductCategory = page(() => import("../features/product/pages/ProductCategory.jsx"));
const Explore = page(() => import("../features/product/pages/Explore.jsx"));
const PricingModel = page(() => import("../features/product/pages/PricingModel.jsx"));
// User
const ProfileOverview = page(() => import("../features/user/pages/ProfileOverview.jsx"));
const Achievements = page(() => import("../features/user/pages/Achievements.jsx"));
const Settings = page(() => import("../features/user/pages/Settings.jsx"));
const Subscription = page(() => import("../features/user/pages/Subscription.jsx"));
const Wishlist = page(() => import("../features/user/pages/Wishlist.jsx"));
const Myorders = page(() => import("../features/user/pages/Myorders.jsx"));
const ContactUs = page(() => import("../features/user/pages/ContactUs.jsx"));
const FAQ = page(() => import("../features/help/pages/FAQ.jsx"));
const Termscondition = page(() => import("../features/user/pages/Termscondition.jsx"));
const PrivacyPolicy = page(() => import("../features/legal/pages/PrivacyPolicy.jsx"));
const Chat = page(() => import("../features/chat/pages/Chat.jsx"));
const Notification = page(() => import("../features/notification/pages/Notification.jsx"));
const SearchResults = page(() => import("../features/search/pages/SearchResults.jsx"));
const PhoneUpload = page(() => import("../features/handoff/pages/PhoneUpload.jsx"));
const NotFound = page(() => import("../components/NotFound.jsx"));

// Path prefix → page, used by prefetchRoute(). First match wins, so longer
// prefixes ("/profileoverview") come before shorter ones ("/profile").
const PREFETCH_TABLE = [
  ["/explore", Explore],
  ["/category/", ProductCategory],
  ["/product/", ProductDescription],
  ["/search", SearchResults],
  ["/price", PricingModel],
  ["/chat", Chat],
  ["/notification", Notification],
  ["/wishlist", Wishlist],
  ["/myorders", Myorders],
  ["/profileoverview", ProfileOverview],
  ["/profile", ProfileOverview],
  ["/achievements", Achievements],
  ["/badge", Achievements],
  ["/settings", Settings],
  ["/setting", Settings],
  ["/subscription", Subscription],
  ["/upload", ProductListing],
  ["/productlisted", ProductListed],
  ["/login", Login],
  ["/signup", Signup],
  ["/contact", ContactUs],
  ["/faq", FAQ],
];

/** Start downloading the JS for the page at `pathname` (no-op if cached). */
export const prefetchRoute = (pathname = "") => {
  const hit =
    pathname === "/"
      ? [null, Home]
      : PREFETCH_TABLE.find(([prefix]) => pathname.startsWith(prefix));
  const load = hit && loaderByComponent.get(hit[1]);
  if (load) load().catch(() => {});
};

/** Pages most sessions visit next — warmed once the browser is idle. */
export const CORE_ROUTES = ["/", "/explore", "/category/x", "/product/x", "/search", "/chat", "/wishlist", "/notification", "/profile"];

function RouteFallback() {
  return (
    <BrandLoader size="full" />
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
          {/* Token is stripped from the URL after it is read; a refresh lands here. */}
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/checkEmail" element={<CheckEmail />} />
        </Route>

        {/* PUBLIC WITH HEADER */}
        <Route element={<MainLayout />}>
          <Route path="/" element={<Home />} />
          <Route path="/search" element={<SearchResults />} />
          <Route path="/product/:id" element={<ProductDescription />} />
          <Route path="/category/:categoryName" element={<ProductCategory />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/price" element={<PricingModel />} />
          <Route path="/termscondition" element={<Termscondition />} />
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/faq" element={<FAQ />} />
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
          </Route>
        </Route>

        {/* Phone photo handoff: public, secret-in-URL auth, no layout.
            Must stay outside PublicOnlyRoute (logged-in phones use it too). */}
        <Route path="/p/:code" element={<PhoneUpload />} />

        {/* 404 - must be last */}
        <Route path="*" element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
