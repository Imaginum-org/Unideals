import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Profile_left_part from "../components/Profile_left_part.jsx";
import AvatarComponent from "../../../components/common/AvatarComponent.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import { useWishlist } from "../../../context/WishlistContext";
import { getUserProducts } from "../../product/api/productApi.js";
import BadgeMiniStrip from "../components/BadgeMiniStrip.jsx";
import { fetchMyBadges } from "../api/badgeApi.js";

// React Icons Imports
import {
  FiShoppingBag,
  FiCalendar,
  FiClock,
  FiPackage,
  FiHeart,
  FiEye,
  FiArrowUpRight,
  FiChevronRight,
} from "react-icons/fi";
import {
  MapPinIcon,
  EyeIcon,
  StarIcon,
  CircleCheckIcon,
} from "@animateicons/react/lucide";
import { FaStar, FaBolt } from "react-icons/fa";

function ProfileOverview() {
  const { userDetails, fetchUserProfile } = useUser();
  const { wishlist } = useWishlist();
  const [userProducts, setUserProducts] = useState([]);
  const [gamification, setGamification] = useState(null);
  const [gamificationLoading, setGamificationLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    fetchUserProfile();
    const loadUserProducts = async () => {
      try {
        const res = await getUserProducts();
        if (!cancelled && res.data.success) {
          setUserProducts(res.data.data || []);
        }
      } catch (error) {
        if (!cancelled) console.error("Failed to load profile products:", error);
      }
    };

    loadUserProducts();

    const loadGamification = async () => {
      try {
        const res = await fetchMyBadges();
        if (!cancelled && res.data.success) setGamification(res.data.data);
      } catch (_) {}
      finally { if (!cancelled) setGamificationLoading(false); }
    };
    loadGamification();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stats = useMemo(() => {
    const activeListings = userProducts.filter((product) =>
      ["listed", "active"].includes((product.status || "").toLowerCase()),
    ).length;
    const productsSold = userProducts.filter((product) =>
      ["sold", "delivered", "completed"].includes(
        (product.status || "").toLowerCase(),
      ),
    ).length;
    const profileViews = userProducts.reduce(
      (total, product) => total + Number(product.views_count || 0),
      0,
    );

    return {
      activeListings,
      productsSold,
      profileViews,
      wishlistSaved: wishlist?.length || 0,
    };
  }, [userProducts, wishlist]);

  const memberSince = userDetails?.createdAt
    ? new Date(userDetails.createdAt).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : "Recently joined";

  const campusName =
    (userDetails?.campus_id && typeof userDetails.campus_id === "object"
      ? userDetails.campus_id.name
      : null) ||
    userDetails?.college ||
    userDetails?.campus ||
    null;
  const savedItems = useMemo(
    () => (wishlist ?? []).filter(Boolean).slice(0, 3),
    [wishlist],
  );
  const formatPrice = (price) => {
    if (price === undefined || price === null || price === "") return "";
    return `\u20B9${Number(price).toLocaleString("en-IN")}`;
  };

  return (
    <div className="w-full h-full overflow-hidden dark:bg-[#131313] bg-[#F7F9FD] font-figtree">
      <div className="flex h-[calc(100vh-70px)] ">
        {/* LEFT PANEL */}
        <div className="hidden md:block md:w-auto md:shrink-0 bg-[#F7F8FA] dark:bg-[#131313] xl:pt-2  xl:pb-0   ">
          <Profile_left_part />
        </div>

        {/* RIGHT PANEL */}
        <div className="h-full md:flex-1 overflow-y-auto no-scrollbar bg-[#F7F9FD] dark:bg-[#131313] p-6 lg:p-8 xl:px-[5.7rem] xl:py-6 ">
          <div className="max-w-5xl mx-auto space-y-7 pb-2">
            {/* 1. PROFILE HEADER CARD */}
            <div className="bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800 grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] gap-x-4 md:gap-x-6 items-center">
              {/* 1. Avatar (Left side, spans both rows vertically on desktop) */}
              <div className="relative shrink-0 col-span-1 md:row-span-2 self-start md:self-center">
                <AvatarComponent
                  name={userDetails?.name || "User"}
                  imageUrl={userDetails?.avatar?.url}
                  plan={userDetails?.subscription}
                  size="xlarge"
                  className="rounded-2xl"
                  showBadge
                  shape="square"
                />
                {/* Active Dot */}
              </div>

              {/* 2. Top Info: Name & Location (Top Right on Mobile, Top Middle on Desktop) */}
              <div className="flex flex-col min-w-0 col-span-1 md:col-start-2 md:row-start-1 w-full">
                {/* Row 1: Name & Badge */}
                <div className="flex flex-wrap items-center gap-2 md:gap-3 mb-1.5 mt-1 md:mt-0">
                  <h1 className="text-[1.15rem] md:text-xl font-bold text-gray-900 dark:text-white leading-none truncate">
                    {userDetails?.name || "User"}
                  </h1>
                  <div className="hidden md:flex items-center gap-1 bg-indigo-50/80 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 px-2.5 py-1 rounded-full text-[0.68rem] font-semibold shrink-0">
                    <CircleCheckIcon size={13} />
                    Verified Student
                  </div>
                  <div className=" flex items-center md:hidden text-indigo-600 dark:text-indigo-400 ">
                    <CircleCheckIcon className="" size={15} />
                  </div>
                </div>

                {/* Row 2: Location & Date */}
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 md:gap-5 text-[0.80rem] md:text-[0.85rem] text-gray-400 dark:text-gray-400">
                  <div className="flex items-center gap-1.5">
                    <MapPinIcon
                      size={14}
                      className="text-indigo-500/70 shrink-0"
                    />
                    {campusName ? (
                      <span className="truncate">{campusName}</span>
                    ) : (
                      <Link
                        to="/settings"
                        className="font-semibold text-indigo-600 hover:underline dark:text-indigo-400"
                      >
                        Set campus →
                      </Link>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FiCalendar size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">
                      {userDetails?.createdAt
                        ? `Member since ${memberSince}`
                        : memberSince}
                    </span>
                  </div>
                </div>
              </div>

              {/* 3. Divider & Stats (Full width on Mobile, Bottom Middle on Desktop) */}
              <div className="col-span-2 md:col-span-1 md:col-start-2 md:row-start-2 w-full mt-4 md:mt-0">
                {/* The Divider Line */}
                <div className="w-full md:max-w-[32.1rem] h-px bg-gray-100 dark:bg-gray-800 mb-3 md:my-3"></div>

                {/* Stats — real counts only */}
                <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-4 md:gap-7 text-[0.82rem] md:text-[0.92rem] font-semibold text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-1 md:gap-2">
                    <FiPackage size={15} className="text-indigo-600 shrink-0" />
                    <span>
                      {stats.activeListings}{" "}
                      <span className="text-gray-400 font-normal ml-0.5">
                        Listings
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FiEye size={15} className="text-blue-500 shrink-0" />
                    <span>
                      {stats.profileViews}{" "}
                      <span className="text-gray-400 font-normal ml-0.5">
                        Views
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <FiHeart size={15} className="text-pink-500 shrink-0" />
                    <span>
                      {stats.wishlistSaved}{" "}
                      <span className="text-gray-400 font-normal ml-0.5">
                        Saves
                      </span>
                    </span>
                  </div>
                </div>
              </div>

              {/* 4. Edit Profile Button (Full width on Mobile, Far Right on Desktop) */}
              <div className="col-span-2 md:col-span-1 md:col-start-3 md:row-start-1 md:row-span-2 mt-5 md:mt-0">
                <Link
                  to="/settings"
                  className="block bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/20 dark:hover:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 px-6 py-2.5 rounded-xl text-[0.82rem] font-semibold transition-colors w-full md:w-auto text-center"
                >
                  Edit Profile
                </Link>
              </div>
            </div>
            {/* 2. YOUR ACTIVITY SECTION */}
            <div>
              <h3 className="text-xs sm:text-sm md:text-sm lg:text-sm xl:text-sm 2xl:text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">
                Your Activity
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Card 1 */}
                <div className="bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl px-5 py-4 shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-green-100 dark:bg-green-900/20 p-2.5 rounded-xl text-green-500 ">
                      <FiShoppingBag size={18} />
                    </div>
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                    {stats.productsSold}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Products Sold
                  </p>
                </div>

                {/* Card 2 */}
                <div className="bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl p-5  shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-2.5 rounded-xl text-indigo-600 dark:text-indigo-400">
                      <FiPackage size={20} />
                    </div>
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                    {stats.activeListings}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Active Listings
                  </p>
                </div>

                {/* Card 3 */}
                <div className="bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl p-5  shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-pink-100 dark:bg-pink-900/20 p-2.5 rounded-xl text-pink-500 ">
                      <FiHeart size={18} />
                    </div>
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                    {stats.wishlistSaved}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Wishlist Saved
                  </p>
                </div>

                {/* Card 4 */}
                <div className="bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl p-5  shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                      <FiEye size={18} />
                    </div>
                  </div>
                  <h2 className="text-[1.2rem] font-extrabold text-gray-900 dark:text-white">
                    {stats.profileViews}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Profile Views
                  </p>
                </div>

                {/* Card 5 — no invented rating */}
                <div className="bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl p-5  shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-yellow-100 dark:bg-yellow-900/20 p-2.5 rounded-xl text-yellow-400 dark:text-yellow-400">
                      <FaStar size={18} />
                    </div>
                  </div>
                  <h2 className="text-[1.2rem] font-extrabold text-gray-900 dark:text-white">
                    —
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Avg Rating · no ratings yet
                  </p>
                </div>

                {/* Card 6 — no invented response time */}
                <div className="bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl p-5  shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                      <FiClock size={18} />
                    </div>
                  </div>
                  <h2 className="text-[1.2rem] font-extrabold text-gray-900 dark:text-white">
                    —
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Response Time · no data yet
                  </p>
                </div>
              </div>

              {/* Level & Badges Mini Widget */}
              <div className="mt-5 sm:mt-6">
                <BadgeMiniStrip gamification={gamification} loading={gamificationLoading} />
              </div>
            </div>

            {/* 3. RECENT LISTINGS (real data) */}
            <div className="bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                    Recent Listings
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Your latest listings
                  </p>
                </div>
                <Link
                  to="/productlisted"
                  className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline"
                >
                  View all <FiArrowUpRight size={14} />
                </Link>
              </div>

              <div className="flex flex-col gap-2">
                {userProducts.length === 0 ? (
                  <div className="py-6 text-center">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No orders yet —{" "}
                      <Link to="/" className="font-semibold text-blue-600 hover:underline">
                        browse the marketplace
                      </Link>
                    </p>
                  </div>
                ) : (
                  userProducts.slice(0, 2).map((item, idx) => (
                    <React.Fragment key={item._id || idx}>
                      <Link
                        to={`/product/${item._id}`}
                        className="flex items-center justify-between hover:bg-[#F7F8FA] dark:hover:bg-[#252525] p-2 -mx-2 rounded-xl transition-colors cursor-pointer"
                      >
                        <div className="flex items-center gap-4 min-w-0">
                          <img
                            src={
                              typeof item.images?.[0] === "string"
                                ? item.images[0]
                                : item.images?.[0]?.url || "/logo.svg"
                            }
                            alt={item.title || "Listing"}
                            className="w-12 h-12 rounded-xl object-cover bg-gray-100 shrink-0"
                          />
                          <div className="min-w-0">
                            <h4 className="text-sm font-normal md:font-semibold text-gray-900 dark:text-white truncate">
                              {item.title || "Untitled listing"}
                            </h4>
                            <p className="text-xs text-gray-400">
                              {String(item.status || "listed").toLowerCase()} ·{" "}
                              {item.createdAt
                                ? new Date(item.createdAt)
                                    .toLocaleDateString("en-GB")
                                    .replace(/\//g, "-")
                                : ""}
                            </p>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                            {formatPrice(item.selling_price)}
                          </p>
                          <span className="text-[8px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-900/20 dark:text-indigo-400 px-2 py-1 rounded-md capitalize">
                            {item.status || "listed"}
                          </span>
                        </div>
                      </Link>
                      {idx < Math.min(userProducts.length, 2) - 1 && (
                        <div className="w-full h-px bg-gray-200 dark:bg-gray-800/50 my-1"></div>
                      )}
                    </React.Fragment>
                  ))
                )}
              </div>
            </div>

            {/* 4. BOTTOM GRID (Chats & Saved Items) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Chats */}
              <div className="bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                    Recent Chats
                  </h2>
                  <Link
                    to="/chat"
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View all
                  </Link>
                </div>

                <div className="py-6 text-center">
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    No chats yet —{" "}
                    <Link to="/" className="font-semibold text-blue-600 hover:underline">
                      browse products
                    </Link>{" "}
                    to start a conversation.
                  </p>
                </div>
              </div>

              {/* Saved Items */}
              <div className="bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                    Saved Items
                  </h2>
                  <Link
                    to="/wishlist"
                    className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                  >
                    View all
                  </Link>
                </div>

                <div className="flex flex-col gap-2">
                  {savedItems.length > 0 ? (
                    savedItems.map((item, index) => (
                      <React.Fragment key={item._id || index}>
                        <Link
                          to={`/product/${item._id}`}
                          className="flex items-center justify-between group cursor-pointer hover:bg-[#F7F8FA] dark:hover:bg-[#252525] p-2 -mx-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={
                                typeof item.images?.[0] === "string"
                                  ? item.images[0]
                                  : item.images?.[0]?.url || "/default-avatar.webp"
                              }
                              alt={item.title || "Saved item"}
                              className="w-10 h-10 rounded-lg object-cover bg-gray-100 shrink-0"
                            />
                            <div className="min-w-0">
                              <h4 className="text-sm font-medium text-gray-900 dark:text-white group-hover:text-blue-600 transition-colors truncate">
                                {item.title || "Untitled product"}
                              </h4>
                              <p className="text-xs font-bold text-blue-600">
                                {formatPrice(item.selling_price)}
                              </p>
                            </div>
                          </div>
                          <FiChevronRight
                            size={16}
                            className="text-gray-400 group-hover:text-blue-600 transition-colors shrink-0"
                          />
                        </Link>
                        {index < savedItems.length - 1 && (
                          <div className="w-full h-px bg-gray-200 dark:bg-gray-800/50 my-1"></div>
                        )}
                      </React.Fragment>
                    ))
                  ) : (
                    <div className="py-6 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        No saved items yet —{" "}
                        <Link to="/" className="font-semibold text-blue-600 hover:underline">
                          browse the marketplace
                        </Link>
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProfileOverview;
