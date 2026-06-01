import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import {
  FiUser,
  FiMessageSquare,
  FiBell,
  FiBox,
  FiShoppingBag,
  FiHeart,
  FiSettings,
  FiHelpCircle,
  FiFileText,
} from "react-icons/fi";

import whitebag from "../../../assets/bag.png";
import bluebag from "../../../assets/bag.png";
import { useTheme } from "../../../context/ThemeContext.jsx";
import Loader from "../../../Components/ui/Loader.jsx";
import { useUser } from "../../../context/useUserContext.jsx";

function Profile_left_part() {
  const { darkMode } = useTheme();
  const { userDetails, loading } = useUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  useEffect(() => {
    if (!loading && !userDetails) {
      navigate("/login");
    }
  }, [loading, userDetails, navigate]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#FBFBFB] dark:bg-[#131313]">
        <Loader />
      </div>
    );
  }

  // --- MENU CONFIGURATIONS ---
  const mainMenu = [
    { path: "/profile", label: "Profile", icon: FiUser },
    { path: "/chat", label: "Message", icon: FiMessageSquare, badge: 4 },
    { path: "/notification", label: "Notification", icon: FiBell, badge: 3 },
    { path: "/myorders", label: "Orders", icon: FiBox },
    { path: "/productlisted", label: "My Listings", icon: FiShoppingBag },
    { path: "/wishlist", label: "Wishlist", icon: FiHeart },
  ];

  const accountMenu = [
    { path: "/settings", label: "Settings", icon: FiSettings },
    { path: "/contact", label: "Help and Support", icon: FiHelpCircle },
    { path: "/termscondition", label: "Terms and Privacy", icon: FiFileText },
  ];

  const NavItem = ({ path, label, icon: Icon, badge }) => {
    const isActive =
      pathname === path ||
      (path === "/profile" && pathname === "/profileoverview");

    return (
      <Link to={path} className="block w-full">
        <div
          className={`relative flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
            isActive
              ? "bg-[#3838EC] text-white shadow-md shadow-blue-500/20"
              : "text-[#64707D] dark:text-[#AAB9C5] hover:bg-gray-100 dark:hover:bg-[#1c1c1c] hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          <Icon
            size={18}
            className={isActive ? "text-white" : ""}
            strokeWidth={isActive ? 2.5 : 2}
          />

          <span
            className={`ml-4 text-[15px] ${isActive ? "font-semibold" : "font-medium"}`}
          >
            {label}
          </span>

          {badge !== undefined && badge > 0 && (
            <span
              className={`absolute right-4 flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                isActive ? "bg-white text-[#364EF2]" : "bg-red-500 text-white"
              }`}
            >
              {badge}
            </span>
          )}
        </div>
      </Link>
    );
  };

  return (
    <div className="h-full flex flex-col font-figtree relative pl-[1.1vw] pr-[1vw]">
      {/* Scrollable Menu Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar lg:pr-2">
        
        {/* Top Profile Section */}
        <div className="flex items-center px-4 py-6 border-b border-gray-100 dark:border-gray-800/50 mb-4">
          <div className="relative">
            <img
              src={userDetails?.profilePic || "https://ui-avatars.com/api/?name=" + (userDetails?.name || "User")}
              alt="Profile avatar"
              className="w-12 h-12 rounded-full object-cover bg-blue-50 dark:bg-gray-800"
            />
            {/* Green Online Indicator Dot */}
            <span className="absolute bottom-0 right-0 w-[14px] h-[14px] bg-[#22C55E] border-2 border-white dark:border-[#131313] rounded-full"></span>
          </div>
          <div className="ml-3 flex flex-col">
            <h2 className="text-[17px] font-semibold text-gray-900 dark:text-white leading-tight">
              {userDetails?.name || "Anurag Adarsh"}
            </h2>
            <p className="text-[14px] font-medium text-[#94A3B8] dark:text-gray-500 mt-0.5">
              {userDetails?.college || "VIT Vellore"}
            </p>
          </div>
        </div>

        {/* Main Menu */}
        <nav className="flex flex-col gap-1">
          {mainMenu.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>
        
        <div className="w-full h-px bg-gray-100 dark:bg-gray-800 my-4"></div>

        {/* Account Menu */}
        <div className="mb-2 px-4">
          <h3 className="text-[13px] font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
            Account
          </h3>
        </div>
        <nav className="flex flex-col gap-1.5 pb-4">
          {accountMenu.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>
      </div>

      {/* Bottom Branding (Sticky at bottom of sidebar) */}
      <div className="bg-[#FFFFFF] dark:bg-[#131313] border-t pt-4 border-gray-100 dark:border-gray-800/50 pb-4">
        <div className="flex items-center justify-center gap-2">
          {/* Bag Icon */}
          <div className="flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="image"
              className="h-6 w-6 object-contain"
            />
          </div>
          {/* Logo Text */}
          <div className="flex items-center text-lg font-bold tracking-tight">
            <span className="text-[#012436] dark:text-white mr-1.5">
              Unideals
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile_left_part;