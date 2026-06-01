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
    <div className="h-full  flex flex-col font-figtree relative pl-[1.1vw] pr-[1vw] ">
      {/* Scrollable Menu Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar lg:pr-2">
        {/* Main Menu */}
        <nav className="flex flex-col gap-1">
          {mainMenu.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>
        <div className="w-full h-px bg-gray-100 dark:bg-gray-800"></div>

        {/* Account Menu */}
        <div className="mt-3 mb-3 px-4">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
            Account
          </h3>
        </div>
        <nav className="flex flex-col gap-1.5">
          {accountMenu.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>
      </div>

      {/* Bottom Branding (Sticky at bottom of sidebar) */}
      <div className="bg-[#FFFFFF] dark:bg-[#131313]  border-t pt-4 border-gray-100 dark:border-gray-800/50 ">
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
