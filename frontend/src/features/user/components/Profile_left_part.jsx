import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef } from "react";
import {
  DashboardIcon,
  MessageCircleIcon,
  BellIcon,
  BoxIcon,
  ShoppingBagIcon,
  HeartIcon,
  ContactIcon,
  FolderIcon,
} from "@animateicons/react/lucide";
import { Settings01Icon } from "@animateicons/react/huge";

import whitebag from "../../../assets/bag.png";
import bluebag from "../../../assets/bag.png";
import { useTheme } from "../../../context/ThemeContext.jsx";
import Loader from "../../../Components/ui/Loader.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import AvatarComponent from "../../../Components/common/AvatarComponent.jsx";

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
    { path: "/profile", label: "Overview", icon: DashboardIcon },
    { path: "/chat", label: "Message", icon: MessageCircleIcon, badge: 4 },
    { path: "/notification", label: "Notification", icon: BellIcon, badge: 3 },
    { path: "/myorders", label: "Orders", icon: BoxIcon },
    { path: "/productlisted", label: "My Listings", icon: ShoppingBagIcon },
    { path: "/wishlist", label: "Wishlist", icon: HeartIcon },
  ];

  const accountMenu = [
    { path: "/settings", label: "Settings", icon: Settings01Icon },
    { path: "/contact", label: "Help and Support", icon: ContactIcon },
    { path: "/termscondition", label: "Terms and Privacy", icon: FolderIcon },
  ];

  const NavItem = ({ path, label, icon: Icon, badge }) => {
    // 1. Create a reference for the icon
    const iconRef = useRef(null);
    const isActive =
      pathname === path ||
      (path === "/profile" && pathname === "/profileoverview");

    return (
      <Link to={path} className="block w-full">
        <div
          // 2. Trigger the animation manually on container hover
          onMouseEnter={() => iconRef.current?.startAnimation?.()}
          onMouseLeave={() => iconRef.current?.stopAnimation?.()}
          className={`relative flex items-center px-4 py-2.5 rounded-xl transition-all duration-200 cursor-pointer ${
            isActive
              ? "bg-[#3838EC] text-white shadow-md shadow-blue-500/20"
              : "text-[#64707D] dark:text-[#AAB9C5] hover:bg-gray-100 dark:hover:bg-[#1c1c1c] hover:text-gray-900 dark:hover:text-white"
          }`}
        >
          {/* 3. Attach the ref to the animate-icon */}
          <Icon
            ref={iconRef}
            size={17}
            className={isActive ? "text-white" : ""}
            strokeWidth={isActive ? 2.5 : 1.5}
          />

          <span
            className={`ml-2.5 text-[14px] ${isActive ? "font-semibold" : "font-medium"}`}
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
    <div className="h-full flex flex-col font-figtree relative pl-[0.3rem] ">
      {/* Scrollable Menu Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar lg:pr-2">
        {/* Top Profile Section */}
        <div className="flex items-center px-4 py-[0.95rem] border-b border-gray-200 dark:border-gray-800/50 mb-4">
          <div className="relative">
            <AvatarComponent
              name={userDetails?.name || "User"}
              imageUrl={userDetails?.avatar}
              plan={userDetails?.subscription} // <-- Just add this line!
              className="rounded-full bg-blue-50 dark:bg-gray-800"
              size="xmedium"
            />
          </div>
          <div className="ml-3 flex flex-col">
            <h2 className="text-[0.95rem] font-semibold text-gray-900 dark:text-white leading-tight">
              {userDetails?.name || "User"}
            </h2>
            <p className="text-xs font-medium text-[#94A3B8] dark:text-gray-500 mt-0.5">
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

        <div className="w-full h-px bg-gray-200 dark:bg-gray-800 my-3.5"></div>

        {/* Account Menu */}
        <div className="mb-2 px-4">
          <h3 className="text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
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
        <div className="flex items-center justify-center gap-1">
          {/* Bag Icon */}
          <div className="flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="image"
              className="h-5 w-5 object-contain"
            />
          </div>
          {/* Logo Text */}
          <div className="flex items-center text-[1.1rem] font-bold tracking-tight">
            <span className="text-[#012436] dark:text-white mt-[0.3rem]">
              Unideals
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Profile_left_part;
