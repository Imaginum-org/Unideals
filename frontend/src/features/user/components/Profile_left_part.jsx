import { Link, useLocation, useNavigate } from "react-router-dom";
import { useEffect, useRef, useState } from "react";
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
import { ChevronLeft, Crown, Menu, Trophy } from "lucide-react";
import BrandLoader from "../../../Components/ui/BrandLoader.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import AvatarComponent from "../../../Components/common/AvatarComponent.jsx";

// ─── NavItem defined OUTSIDE the parent so hooks are stable across renders ───
// Having it inside caused React to reset state (including isCollapsed) on every
// navigation because the component reference changed each render.
const NavItem = ({ path, label, icon: Icon, badge, isCollapsed, pathname }) => {
  const iconRef = useRef(null);
  const isActive =
    pathname === path ||
    (path === "/profile" && pathname === "/profileoverview");

  return (
    <Link to={path} className="block w-full">
      <div
        onMouseEnter={() => iconRef.current?.startAnimation?.()}
        onMouseLeave={() => iconRef.current?.stopAnimation?.()}
        title={isCollapsed ? label : undefined}
        className={`relative flex items-center rounded-xl py-2.5 transition-all duration-300 cursor-pointer ${
          isCollapsed ? "justify-center px-2" : "px-4"
        } ${
          isActive
            ? isCollapsed
              ? "bg-[#EEEAFE] text-[#3838EC]"
              : "bg-[#3838EC] text-white shadow-md shadow-blue-500/20"
            : "text-[#64707D] dark:text-[#AAB9C5] hover:bg-gray-100 dark:hover:bg-[#1c1c1c] hover:text-gray-900 dark:hover:text-white"
        }`}
      >
        <Icon
          ref={iconRef}
          size={17}
          className={isActive && !isCollapsed ? "text-white" : ""}
          strokeWidth={isActive ? 2.5 : 1.5}
        />

        {!isCollapsed && (
          <span
            className={`ml-2.5 text-[14px] ${isActive ? "font-semibold" : "font-medium"}`}
          >
            {label}
          </span>
        )}

        {badge !== undefined && badge > 0 && (
          <span
            className={`absolute flex items-center justify-center rounded-full text-[10px] font-bold ${
              isCollapsed
                ? "h-[1.05rem] w-[1.05rem] right-[0.2rem] top-[0.2rem]"
                : "h-5 w-5 right-4"
            } ${
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

function Profile_left_part() {
  const { userDetails, loading } = useUser();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    if (!loading && !userDetails) {
      navigate("/login");
    }
  }, [loading, userDetails, navigate]);

  if (loading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-[#FBFBFB] dark:bg-[#131313]">
        <BrandLoader size="md" />
      </div>
    );
  }

  // MENU CONFIGURATIONS
  const mainMenu = [
    { path: "/profile", label: "Overview", icon: DashboardIcon },
    { path: "/chat", label: "Message", icon: MessageCircleIcon, badge: 4 },
    { path: "/notification", label: "Notification", icon: BellIcon, badge: 3 },
    { path: "/myorders", label: "Orders", icon: BoxIcon },
    { path: "/productlisted", label: "My Listings", icon: ShoppingBagIcon },
    { path: "/wishlist", label: "Wishlist", icon: HeartIcon },
    { path: "/achievements", label: "Achievements", icon: Trophy },
  ];

  const accountMenu = [
    { path: "/subscription", label: "Subscription", icon: Crown },
    { path: "/settings", label: "Settings", icon: Settings01Icon },
    { path: "/contact", label: "Help and Support", icon: ContactIcon },
    { path: "/termscondition", label: "Terms and Privacy", icon: FolderIcon },
  ];

  return (
    <div
      className={`h-full flex flex-col font-figtree relative border-r border-gray-100 bg-white transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-gray-800/50 dark:bg-[#131313] ${
        isCollapsed
          ? "w-[4.9rem]"
          : "w-[12.6rem] lg:w-[14.7rem] xl:w-[17.15rem] xl:max-w-[17.15rem]"
      }`}
    >
      {/* Scrollable Menu Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2">
        {/* Top Profile Section */}
        <div
          className={`relative flex items-center px-2 transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] mb-3 ${
            isCollapsed
              ? "justify-center border-b-0 py-4"
              : "border-b border-gray-200 py-[1.35rem] dark:border-gray-800/50"
          }`}
        >
          <div className="relative">
            <AvatarComponent
              name={userDetails?.name || "User"}
              imageUrl={userDetails?.avatar?.url}
              plan={userDetails?.subscription}
              showBadge
              className="rounded-full bg-blue-50 dark:bg-gray-800"
              size="xmedium"
            />
          </div>
          <div
            className={`ml-3 min-w-0 flex-col overflow-hidden transition-all duration-300 ${
              isCollapsed
                ? "pointer-events-none hidden w-0 opacity-0"
                : "flex w-auto opacity-100"
            }`}
          >
            <h2 className="text-[0.95rem] font-semibold text-gray-900 dark:text-white leading-tight">
              {userDetails?.name || "User"}
            </h2>
            <p className="text-xs font-medium text-[#94A3B8] dark:text-gray-500 mt-0.5">
              {userDetails?.college || "VIT Vellore"}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsCollapsed((current) => !current)}
            className={`ml-auto flex shrink-0 items-center justify-center text-[#8292A6] transition-all duration-200 hover:text-[#3838EC] dark:text-[#AAB9C5] dark:hover:text-white ${
              isCollapsed
                ? "absolute left-1/2 top-[4.35rem] h-10 w-10 -translate-x-1/2 rounded-xl border border-gray-100 bg-white shadow-sm hover:border-[#DDD8FF] hover:bg-[#F5F2FF] dark:border-gray-800 dark:bg-[#171717] dark:hover:bg-[#1c1c1c]"
                : "h-8 w-8 rounded-lg hover:bg-gray-100 dark:hover:bg-[#1c1c1c]"
            }`}
            aria-label={
              isCollapsed ? "Expand profile menu" : "Collapse profile menu"
            }
            title={isCollapsed ? "Expand" : "Collapse"}
          >
            {isCollapsed ? (
              <Menu size={21} strokeWidth={2} />
            ) : (
              <ChevronLeft size={21} strokeWidth={2.2} />
            )}
          </button>
        </div>

        {/* Main Menu */}
        <nav
          className={`flex flex-col gap-1 transition-[padding] duration-300 ${
            isCollapsed ? "pt-9" : ""
          }`}
        >
          {mainMenu.map((item) => (
            <NavItem
              key={item.path}
              {...item}
              isCollapsed={isCollapsed}
              pathname={pathname}
            />
          ))}
        </nav>

        <div
          className={`w-full h-px bg-gray-200 dark:bg-gray-800 ${
            isCollapsed ? "my-2" : "my-3.5"
          }`}
        ></div>

        {/* Account Menu */}
        <div className={`mb-2 px-4 ${isCollapsed ? "hidden" : ""}`}>
          <h3 className="text-xs font-bold tracking-wider text-gray-400 dark:text-gray-500 uppercase">
            Account
          </h3>
        </div>
        <nav className="flex flex-col gap-1.5 pb-4">
          {accountMenu.map((item) => (
            <NavItem
              key={item.path}
              {...item}
              isCollapsed={isCollapsed}
              pathname={pathname}
            />
          ))}
        </nav>
      </div>

      {/* Bottom Branding (Sticky at bottom of sidebar) */}
      <div className="bg-[#FFFFFF] dark:bg-[#131313] border-t pt-4 border-gray-100 dark:border-gray-800/50 pb-4">
        <div className="flex items-center justify-center">
          {/* Bag Icon */}
          <div className="flex items-center justify-center">
            <img
              src="/logo.svg"
              alt="image"
              className="h-8 w-8 object-contain"
            />
          </div>
          {/* Logo Text */}
          <div
            className={`items-center overflow-hidden text-[1.1rem] font-bold tracking-tight transition-all duration-300 ${
              isCollapsed ? "hidden w-0 opacity-0" : "flex w-auto opacity-100"
            }`}
          >
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
