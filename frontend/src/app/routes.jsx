import { Routes, Route, Navigate } from "react-router-dom";

import MainLayout from "../Layouts/MainLayout.jsx";
import ProtectedLayout from "../Layouts/ProtectedLayout.jsx";

// Auth
import Login from "../features/auth/pages/Login.jsx";
import Signup from "../features/auth/pages/Signup.jsx";
import ForgotPassword from "../features/auth/pages/ForgotPassword.jsx";
import ResetPassword from "../features/auth/pages/ResetPassword.jsx";
import VerifyEmail from "../features/auth/pages/VerifyEmail.jsx";
import CheckEmail from "../features/auth/pages/CheckEmail.jsx";

// Product
import Home from "../features/product/pages/Home.jsx";
import ProductDescription from "../features/product/pages/ProductDescription.jsx";
import ProductListing from "../features/product/pages/ProductListing.jsx";
import ProductListed from "../features/product/pages/ProductListed.jsx";
import ProductCategory from "../features/product/pages/ProductCategory.jsx";
import PricingModel from "../features/product/pages/PricingModel.jsx";

// User
import ProfileOverview from "../features/user/pages/ProfileOverview.jsx";
import Settings from "../features/user/pages/Settings.jsx";
import Subscription from "../features/user/pages/Subscription.jsx";
import Wishlist from "../features/user/pages/Wishlist.jsx";
import Myorders from "../features/user/pages/Myorders.jsx";
import ContactUs from "../features/user/pages/ContactUs.jsx";
import Termscondition from "../features/user/pages/Termscondition.jsx";
import PrivacyPolicy from "../features/legal/pages/PrivacyPolicy.jsx";

import Chat from "../features/chat/pages/Chat.jsx";
import Notification from "../features/notification/pages/Notification.jsx";

import SearchResults from "../features/search/pages/SearchResults.jsx";

export default function AppRoutes() {
  return (
    <Routes>
      {/* AUTH (NO HEADER) */}
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password/:token" element={<ResetPassword />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/checkEmail" element={<CheckEmail />} />

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
          <Route path="/myorders" element={<Myorders />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/notification" element={<Notification />} />
          <Route path="/upload" element={<ProductListing />} />
          <Route path="/productlisted" element={<ProductListed />} />
          <Route path="/contact" element={<ContactUs />} />
        </Route>
      </Route>
    </Routes>
  );
}
