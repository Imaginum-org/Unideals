import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Profile_left_part from "../components/Profile_left_part.jsx";
import AvatarComponent from "../../../Components/common/AvatarComponent.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import { useWishlist } from "../../../context/WishlistContext";
import { getUserProducts } from "../../product/api/productApi.js";

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

  useEffect(() => {
    fetchUserProfile();
    const loadUserProducts = async () => {
      try {
        const res = await getUserProducts();
        if (res.data.success) {
          setUserProducts(res.data.data || []);
        }
      } catch (error) {
        console.error("Failed to load profile products:", error);
      }
    };

    loadUserProducts();
  }, [fetchUserProfile]);

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
    : "October 2022";

  const campus = userDetails?.college || userDetails?.campus || "VIT Vellore";
  const savedItems = useMemo(
    () => (wishlist ?? []).filter(Boolean).slice(0, 3),
    [wishlist],
  );
  const formatPrice = (price) => {
    if (price === undefined || price === null || price === "") return "";
    return `\u20B9${Number(price).toLocaleString("en-IN")}`;
  };

  return (
    <div className="w-full h-screen overflow-hidden dark:bg-[#131313] bg-[#F7F9FD] font-figtree">
      <div className="flex h-[calc(100vh-70px)] ">
        {/* LEFT PANEL */}
        <div className="hidden md:block md:w-[22.5%] lg:w-[21%] xl:w-[20.5%] 2xl:w-[20.5%] bg-[#FFFFFF] dark:bg-[#131313] xl:pt-2  xl:pb-0   ">
          <Profile_left_part />
        </div>

        {/* RIGHT PANEL */}
        <div className="h-full md:w-[77.5%] lg:w-[79%] xl:w-[79.5%] 2xl:w-[79.5%] overflow-y-auto no-scrollbar bg-[#F7F9FD] dark:bg-[#131313] p-6 lg:p-8 xl:px-[5.7rem] xl:py-6 ">
          <div className="max-w-5xl mx-auto space-y-7 pb-2">
            {/* 1. PROFILE HEADER CARD */}
            <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl p-5 md:p-6 shadow-sm border border-gray-100 dark:border-gray-800 grid grid-cols-[auto_1fr] md:grid-cols-[auto_1fr_auto] gap-x-4 md:gap-x-6 items-center">
              {/* 1. Avatar (Left side, spans both rows vertically on desktop) */}
              <div className="relative shrink-0 col-span-1 md:row-span-2 self-start md:self-center">
                <AvatarComponent
                  name={userDetails?.name || "User"}
                  imageUrl={userDetails?.avatar.url}
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
                    <span className="truncate">{campus}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FiCalendar size={14} className="text-gray-400 shrink-0" />
                    <span className="truncate">Member since {memberSince}</span>
                  </div>
                </div>
              </div>

              {/* 3. Divider & Stats (Full width on Mobile, Bottom Middle on Desktop) */}
              <div className="col-span-2 md:col-span-1 md:col-start-2 md:row-start-2 w-full mt-4 md:mt-0">
                {/* The Divider Line */}
                <div className="w-full md:max-w-[32.1rem] h-px bg-gray-100 dark:bg-gray-800 mb-3 md:my-3"></div>

                {/* Stats */}
                <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 sm:gap-4 md:gap-7 text-[0.82rem] md:text-[0.92rem] font-semibold text-gray-900 dark:text-gray-100">
                  <div className="flex items-center gap-1 md:gap-2">
                    <StarIcon size={15} className="text-orange-400 shrink-0" />
                    <span>
                      4.8{" "}
                      <span className="text-gray-400 font-normal ml-0.5">
                        Trust Score
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FaBolt
                      size={15}
                      className="text-indigo-600 dark:text-indigo-400 shrink-0"
                    />
                    <span>
                      94%{" "}
                      <span className="text-gray-400 font-normal ml-0.5">
                        Response Rate
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-1 md:gap-2">
                    <FiClock size={15} className="text-gray-400 shrink-0" />
                    <span>
                      &lt; 1 hour{" "}
                      <span className="text-gray-400 font-normal ml-0.5 hidden sm:inline">
                        Avg Response
                      </span>
                      <span className="text-gray-400 font-normal ml-0.5 sm:hidden">
                        Avg
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
                <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl px-5 py-4 shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-green-100 dark:bg-green-900/20 p-2.5 rounded-xl text-green-500 ">
                      <FiShoppingBag size={18} />
                    </div>
                    <span className="text-xs font-semibold text-green-500  flex items-center gap-1">
                      <FiArrowUpRight size={14} /> +3 this month
                    </span>
                  </div>
                  <h2 className="text-xl font-extrabold text-gray-900 dark:text-white">
                    {stats.productsSold}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Products Sold
                  </p>
                </div>

                {/* Card 2 */}
                <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl p-5  shadow-sm border border-gray-100 dark:border-gray-800">
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
                <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl p-5  shadow-sm border border-gray-100 dark:border-gray-800">
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
                <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl p-5  shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                      <FiEye size={18} />
                    </div>
                    <span className="text-xs font-semibold text-green-500  flex items-center gap-1">
                      <FiArrowUpRight size={14} /> +24 this week
                    </span>
                  </div>
                  <h2 className="text-[1.2rem] font-extrabold text-gray-900 dark:text-white">
                    {stats.profileViews}
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Profile Views
                  </p>
                </div>

                {/* Card 5 */}
                <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl p-5  shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-yellow-100 dark:bg-yellow-900/20 p-2.5 rounded-xl text-yellow-400 dark:text-yellow-400">
                      <FaStar size={18} />
                    </div>
                  </div>
                  <h2 className="text-[1.2rem] font-extrabold text-gray-900 dark:text-white">
                    4.8
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Avg Rating
                  </p>
                </div>

                {/* Card 6 */}
                <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl p-5  shadow-sm border border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-start mb-4">
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-2.5 rounded-xl text-blue-600 dark:text-blue-400">
                      <FiClock size={18} />
                    </div>
                  </div>
                  <h2 className="text-[1.2rem] font-extrabold text-gray-900 dark:text-white">
                    &lt; 1 hour
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Response Time
                  </p>
                </div>
              </div>
            </div>

            {/* 3. RECENT ORDERS */}
            <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center mb-5">
                <div>
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                    Recent Orders
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Your latest transactions
                  </p>
                </div>
                <button className="text-xs font-semibold text-blue-600 dark:text-blue-400 flex items-center gap-1 hover:underline">
                  View all <FiArrowUpRight size={14} />
                </button>
              </div>

              <div className="flex flex-col gap-2">
                {/* Order 1 */}
                <div className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#252525] p-2 -mx-2 rounded-xl transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <img
                      src="https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=150&q=80"
                      alt="Sony Headphones"
                      className="w-12 h-12 rounded-xl object-cover bg-gray-100"
                    />
                    <div>
                      <h4 className="text-sm font-normal md:font-semibold text-gray-900 dark:text-white">
                        Sony WH-1000XM4 Headphones
                      </h4>
                      <p className="text-xs text-gray-400">
                        #130525-01 · 13-05-2025
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                      ₹750
                    </p>
                    <span className="text-[8px] font-semibold bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-500 px-2 py-1 rounded-md">
                      In Progress
                    </span>
                  </div>
                </div>

                <div className="w-full h-px bg-gray-200 dark:bg-gray-800/50 my-1"></div>

                {/* Order 2 */}
                <div className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#252525] p-2 -mx-2 rounded-xl transition-colors cursor-pointer">
                  <div className="flex items-center gap-4">
                    <img
                      src="https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=150&q=80"
                      alt="MacBook"
                      className="w-12 h-12 rounded-xl object-cover bg-gray-100"
                    />
                    <div>
                      <h4 className="text-sm font-normal md:font-semibold text-gray-900 dark:text-white">
                        MacBook Pro M1
                      </h4>
                      <p className="text-xs text-gray-400">
                        #ORD-23 · 10-03-2024
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-gray-900 dark:text-white mb-1">
                      ₹72,000
                    </p>
                    <span className="text-[9px] font-semibold bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400 px-2 py-1 rounded-md">
                      Delivered
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. BOTTOM GRID (Chats & Saved Items) */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Recent Chats */}
              <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center mb-5">
                  <h2 className="text-sm font-bold text-gray-900 dark:text-white">
                    Recent Chats
                  </h2>
                  <button className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline">
                    View all
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#252525] p-2 -mx-2 rounded-xl transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <img
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Rahul"
                        alt="Rahul"
                        className="w-10 h-10 rounded-full bg-red-100"
                      />
                      <div>
                        <h4 className="text-sm font-normal md:font-semibold text-gray-900 dark:text-white">
                          Rahul Kumar
                        </h4>
                        <p className="text-xs text-gray-500 truncate w-40 sm:w-56">
                          Is the MacBook still available? Can we meet tomorrow?
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400">3h ago</span>
                  </div>

                  <div className="w-full h-px bg-gray-200 dark:bg-gray-800/50 my-1"></div>

                  <div className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#252525] p-2 -mx-2 rounded-xl transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <img
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Priya"
                        alt="Priya"
                        className="w-10 h-10 rounded-full bg-pink-100"
                      />
                      <div>
                        <h4 className="text-sm font-normal md:font-semibold text-gray-900 dark:text-white">
                          Priya Singh
                        </h4>
                        <p className="text-xs text-gray-500 truncate w-40 sm:w-56">
                          Thanks! I'll pick it up this evening.
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400">5h ago</span>
                  </div>

                  <div className="w-full h-px bg-gray-200 dark:bg-gray-800/50 my-1"></div>

                  <div className="flex items-center justify-between hover:bg-gray-50 dark:hover:bg-[#252525] p-2 -mx-2 rounded-xl transition-colors cursor-pointer">
                    <div className="flex items-center gap-3">
                      <img
                        src="https://api.dicebear.com/7.x/avataaars/svg?seed=Arjun"
                        alt="Arjun"
                        className="w-10 h-10 rounded-full bg-green-100"
                      />
                      <div>
                        <h4 className="text-sm font-normal md:font-semibold text-gray-900 dark:text-white">
                          Arjun Sharma
                        </h4>
                        <p className="text-xs text-gray-500 truncate w-40 sm:w-56">
                          Can you reduce the price a bit?
                        </p>
                      </div>
                    </div>
                    <span className="text-[10px] text-gray-400">1d ago</span>
                  </div>
                </div>
              </div>

              {/* Saved Items */}
              <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
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
                          className="flex items-center justify-between group cursor-pointer hover:bg-gray-50 dark:hover:bg-[#252525] p-2 -mx-2 rounded-xl transition-colors"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img
                              src={item.images?.[0] || "/default-avatar.webp"}
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
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      No saved items yet
                    </p>
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
