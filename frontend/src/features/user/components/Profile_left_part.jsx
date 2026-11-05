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
import { Crown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import Loader from "../../../Components/ui/Loader.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import AvatarComponent from "../../../Components/common/AvatarComponent.jsx";

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
        <Loader />
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
  ];

  const accountMenu = [
    { path: "/subscription", label: "Subscription", icon: Crown },
    { path: "/settings", label: "Settings", icon: Settings01Icon },
    { path: "/contact", label: "Help and Support", icon: ContactIcon },
    { path: "/termscondition", label: "Terms and Privacy", icon: FolderIcon },
  ];

  const NavItem = ({ path, label, icon: Icon, badge }) => {
    // Create a reference for the icon
    const iconRef = useRef(null);
    const isActive =
      pathname === path ||
      (path === "/profile" && pathname === "/profileoverview");

    return (
      <Link to={path} className="block w-full">
        <div
          // Trigger the animation manually on container hover
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
          {/* Attach the ref to the animate-icon */}
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
              className={`absolute flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-bold ${
                isCollapsed ? "right-1 top-1" : "right-4"
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

  return (
    <div
      className={`h-full flex flex-col font-figtree relative border-r border-gray-100 bg-white transition-[width] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-gray-800/50 dark:bg-[#131313] ${
        isCollapsed
          ? "w-[5.75rem]"
          : "w-[12.6rem] lg:w-[14.7rem] xl:w-[17.15rem] xl:max-w-[17.15rem]"
      }`}
    >
      <button
        type="button"
        onClick={() => setIsCollapsed((current) => !current)}
        className="absolute right-0 top-12 z-10 flex h-8 w-8 translate-x-1/2 items-center justify-center rounded-full border border-gray-200 bg-white text-[#8292A6] shadow-[0_8px_20px_rgba(15,23,42,0.08)] transition-colors duration-200 hover:border-[#C7CDFE] hover:bg-[#F5F4FF] hover:text-[#3838EC] dark:border-gray-800 dark:bg-[#171717] dark:text-[#AAB9C5] dark:hover:bg-[#1c1c1c]"
        aria-label={isCollapsed ? "Expand profile menu" : "Collapse profile menu"}
        title={isCollapsed ? "Expand" : "Collapse"}
      >
        {isCollapsed ? (
          <PanelLeftOpen size={18} strokeWidth={1.8} />
        ) : (
          <PanelLeftClose size={18} strokeWidth={1.8} />
        )}
      </button>

      {/* Scrollable Menu Area */}
      <div className="flex-1 overflow-y-auto no-scrollbar px-2">
        {/* Top Profile Section */}
        <div
          className={`flex items-center border-b border-gray-200 px-2 py-[1.35rem] transition-[padding] duration-500 ease-[cubic-bezier(0.22,1,0.36,1)] dark:border-gray-800/50 mb-4 ${
            isCollapsed ? "justify-center" : ""
          }`}
        >
          <div className="relative">
            <AvatarComponent
              name={userDetails?.name || "User"}
              imageUrl={userDetails?.avatar?.url}
              plan={userDetails?.subscription}
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
        </div>

        {/* Main Menu */}
        <nav className="flex flex-col gap-1">
          {mainMenu.map((item) => (
            <NavItem key={item.path} {...item} />
          ))}
        </nav>

        <div className="w-full h-px bg-gray-200 dark:bg-gray-800 my-3.5"></div>

        {/* Account Menu */}
        <div className={`mb-2 px-4 ${isCollapsed ? "hidden" : ""}`}>
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
