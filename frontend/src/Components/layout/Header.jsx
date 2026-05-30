import { useState, useEffect, useRef } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";

import { GrLocation } from "react-icons/gr";
import { CiSearch, CiMail } from "react-icons/ci";
import { IoNotificationsOutline } from "react-icons/io5";
import { IoIosSunny, IoMdMoon } from "react-icons/io";
import { FiMessageSquare } from "react-icons/fi";
import { FaPlus } from "react-icons/fa6";
import { LuMessageSquare } from "react-icons/lu";
import { LuUserRound } from "react-icons/lu";
import { BsBoxSeam } from "react-icons/bs";
import { IoIosHeartEmpty } from "react-icons/io";
import { MdOutlineLogout } from "react-icons/md";
import { IoChevronBackOutline } from "react-icons/io5";

import AvatarComponent from "../common/AvatarComponent.jsx";

import { useUser } from "../../context/useUserContext.jsx";
import { logoutUser } from "../../features/auth/api/authApi.js";
import { useTheme } from "../../context/ThemeContext.jsx";

import useDebounce from "../../features/search/hooks/useDebounce";
import { searchProducts } from "../../features/search/api/searchApi";
import SearchDropdown from "../../features/search/components/SearchDropdown";

import { toast } from "react-hot-toast";

const Header = ({ isChat }) => {
  const {
    userDetails,
    isLoggedIn,
    loading: userLoading,
    fetchUserProfile,
    clearUserData,
  } = useUser();

  const campuses = ["VIT Vellore", "VIT Chennai", "VIT Bhopal"];

  const { darkMode, toggleDarkMode } = useTheme();

  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [showmenu, setShowmenu] = useState(false);
  const [notification] = useState(1);
  const [showMobileSearch, setShowMobileSearch] = useState(false);
  const [placeholderIndex, setPlaceholderIndex] = useState(0);
  const [fade, setFade] = useState(true);
  const [selectedCampus, setSelectedCampus] = useState("VIT Vellore");
  const [showCampusDropdown, setShowCampusDropdown] = useState(false);
  const [recentSearches, setRecentSearches] = useState([]);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const storedSearches = localStorage.getItem("recentSearches");

    if (storedSearches) {
      setRecentSearches(JSON.parse(storedSearches));
    }
  }, []);

  const placeholderWords = [
    "Electronics",
    "Study Material",
    "Hostel Essentials",
    "Clothing",
    "Accessories",
    "Lab Equipment",
    "Sports",
    "Fitness",
    "Vehicle",
    "Event Passes",
    "Others",
  ];

  const mobileCategories = [
    {
      label: "Electronics",
      slug: "electronics",
    },
    {
      label: "Study Material",
      slug: "study_material",
    },
    {
      label: "Hostel Essentials",
      slug: "hostel_essentials",
    },
    {
      label: "Clothing",
      slug: "clothing",
    },
    {
      label: "Accessories",
      slug: "accessories",
    },
    {
      label: "Lab Equipment",
      slug: "lab_equipment",
    },
    {
      label: "Sports",
      slug: "sports",
    },
    {
      label: "Fitness",
      slug: "fitness",
    },
    {
      label: "Vehicles",
      slug: "vehicles",
    },
    {
      label: "Event Passes",
      slug: "event_passes",
    },
  ];

  const debouncedQuery = useDebounce(query, 300);

  const navigate = useNavigate();
  const location = useLocation();
  const menuRef = useRef(null);

  useEffect(() => {
    if (isLoggedIn && !userDetails) {
      fetchUserProfile();
    }
  }, [isLoggedIn, userDetails, fetchUserProfile]);

  useEffect(() => {
    const path = location.pathname;

    if (path.startsWith("/search") || path.startsWith("/product")) {
      setSearch("");
      setQuery("");
      setResults([]);
      setShowDropdown(false);
    }
  }, [location.pathname]);

  useEffect(() => {
    if (debouncedQuery.trim().length < 2) {
      setResults([]);
      setHasSearched(false);
      return;
    }

    const fetch = async () => {
      try {
        setSearchLoading(true);

        const res = await searchProducts(debouncedQuery);

        setResults(res.data?.products || []);
        setHasSearched(true);
      } catch (err) {
        console.error(err);
      } finally {
        setSearchLoading(false);
      }
    };

    fetch();
  }, [debouncedQuery]);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);

      setTimeout(() => {
        setPlaceholderIndex((prev) => (prev + 1) % placeholderWords.length);

        setFade(true);
      }, 300);
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!showmenu) return;

    const handleOutsideInteraction = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowmenu(false);
      }
    };

    const handleScroll = () => {
      setShowmenu(false);
    };

    document.addEventListener("mousedown", handleOutsideInteraction);

    window.addEventListener("scroll", handleScroll, {
      passive: true,
    });

    return () => {
      document.removeEventListener("mousedown", handleOutsideInteraction);

      window.removeEventListener("scroll", handleScroll);
    };
  }, [showmenu]);

  useEffect(() => {
    if (!showMobileSearch) return;

    const scrollY = window.scrollY;

    document.body.style.position = "fixed";
    document.body.style.top = `-${scrollY}px`;
    document.body.style.left = "0";
    document.body.style.right = "0";
    document.body.style.width = "100%";

    return () => {
      document.body.style.position = "";
      document.body.style.top = "";
      document.body.style.left = "";
      document.body.style.right = "";
      document.body.style.width = "";

      window.scrollTo(0, scrollY);
    };
  }, [showMobileSearch]);

  const handleMenu = () => {
    setShowmenu((prev) => !prev);
  };

  const handleSearchBar = (e) => {
    setSearch(e.target.value);
    setQuery(e.target.value);
    setShowDropdown(true);
  };

  const goToLogin = () => navigate("/login");
  const goToSignup = () => navigate("/signup");

  const saveRecentSearch = (searchTerm) => {
    if (!searchTerm.trim()) return;

    const updatedSearches = [
      searchTerm,
      ...recentSearches.filter(
        (item) => item.toLowerCase() !== searchTerm.toLowerCase(),
      ),
    ].slice(0, 5);

    setRecentSearches(updatedSearches);

    localStorage.setItem("recentSearches", JSON.stringify(updatedSearches));
  };

  const handleLogoutClick = async () => {
    try {
      const response = await logoutUser();

      if (response.data.success) {
        clearUserData();
        setShowmenu(false);

        toast.success("Logged out successfully");

        navigate("/");
      }
    } catch (err) {
      console.error(err);
      toast.error("Logout failed");
    }
  };

  return (
    <>
      <nav className="sticky top-0 z-50 border-b border-neutral-200 bg-white/80 backdrop-blur-xl dark:border-neutral-800 dark:bg-[#131313] font-figtree">
        <div className="mx-auto flex h-14 sm:h-16 w-full max-w-[1380px] items-center justify-between px-6 sm:px-8 md:px-11 lg:px-14 2xl:px-0">
          {/* Mobile Navbar */}
          <div className="flex w-full items-center justify-between sm:hidden">
            <Link to="/" className="flex items-center gap-2">
              <img
                src="/logo.svg"
                alt="image"
                className="h-6 w-6 object-contain"
              />

              <span className="text-base font-medium text-[#000000] dark:text-white">
                Unideals
              </span>
            </Link>

            <div className="flex items-center gap-5">
              <button
                onClick={toggleDarkMode}
                className="transition-transform duration-200 active:scale-95"
                aria-label="Toggle Theme"
              >
                {darkMode ? (
                  <IoIosSunny className="size-4 text-[#FFD119]" />
                ) : (
                  <IoMdMoon className="size-4 text-[#323232] dark:text-white" />
                )}
              </button>

              <button
                onClick={() => {
                  setShowMobileSearch(true);
                  setShowDropdown(false);
                }}
                className="transition-transform duration-200 active:scale-95"
                aria-label="Open Search"
              >
                <CiSearch
                  size={22}
                  className="text-[#090A0B] dark:text-neutral-400"
                />
              </button>

              {isLoggedIn ? (
                <div className="relative">
                  <button
                    onClick={handleMenu}
                    className="transition-transform duration-200 active:scale-95"
                    aria-label="Open Menu"
                  >
                    <AvatarComponent
                      name={userDetails?.name}
                      imageUrl={userDetails?.avatar}
                      size="small"
                      isLoading={userLoading}
                    />
                  </button>

                  <AnimatePresence>
                    {showmenu && (
                      <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{
                          duration: 0.18,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="
              absolute
              right-0
              top-full
              z-50
              mt-3
              w-[260px]
              overflow-hidden
              rounded-2xl
              border
              border-neutral-200
              bg-white
              shadow-2xl
              dark:border-neutral-800
              dark:bg-[#1A1D20]
            "
                      >
                        <div className="border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
                          <div className="flex items-center gap-4">
                            <AvatarComponent
                              name={userDetails?.name}
                              imageUrl={userDetails?.avatar}
                              size="medium"
                              isLoading={userLoading}
                            />

                            <div>
                              <h1 className="text-sm font-medium text-neutral-900 dark:text-white">
                                {userDetails?.name || "User"}
                              </h1>

                              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                {userDetails?.email || ""}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="py-2">
                          {[
                            {
                              to: "/profile",
                              icon: <LuUserRound />,
                              label: "Profile",
                            },
                            {
                              to: "/myorders",
                              icon: <BsBoxSeam />,
                              label: "Orders",
                            },
                            {
                              to: "/chat",
                              icon: <FiMessageSquare />,
                              label: "Chat",
                            },
                            {
                              to: "/wishlist",
                              icon: <IoIosHeartEmpty />,
                              label: "Wishlist",
                            },
                            {
                              to: "/contact",
                              icon: <CiMail />,
                              label: "Contact Us",
                            },
                          ].map(({ to, icon, label }) => (
                            <Link
                              key={label}
                              to={to}
                              onClick={() => setShowmenu(false)}
                              className="
                    flex
                    items-center
                    gap-3
                    px-4
                    py-3
                    text-sm
                    text-neutral-700
                    transition-colors
                    duration-200
                    active:bg-neutral-100
                    dark:text-neutral-200
                    dark:active:bg-neutral-800
                  "
                            >
                              <span className="text-lg">{icon}</span>
                              <span>{label}</span>
                            </Link>
                          ))}
                        </div>

                        <button
                          onClick={handleLogoutClick}
                          className="
                flex
                w-full
                items-center
                gap-3
                border-t
                border-neutral-200
                px-4
                py-3
                text-sm
                text-red-500
                transition-colors
                duration-200
                active:bg-red-50
                dark:border-neutral-800
                dark:active:bg-red-950/20
              "
                        >
                          <MdOutlineLogout className="text-lg" />
                          <span>Logout</span>
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="relative">
                  <button
                    onClick={handleMenu}
                    className="
      flex
      h-8
      w-8
      items-center
      justify-center
      rounded-full
      bg-neutral-100
      dark:bg-neutral-800
    "
                  >
                    <LuUserRound className="text-lg text-neutral-700 dark:text-neutral-200" />
                  </button>

                  <AnimatePresence>
                    {showmenu && (
                      <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, y: 8, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 8, scale: 0.98 }}
                        transition={{
                          duration: 0.18,
                          ease: [0.22, 1, 0.36, 1],
                        }}
                        className="
          absolute
          right-0
          top-full
          z-50
          mt-3
          w-[220px]
          overflow-hidden
          rounded-2xl
          border
          border-neutral-200
          bg-white
          shadow-2xl
          dark:border-neutral-800
          dark:bg-[#1A1D20]
        "
                      >
                        <div className="p-3">
                          <button
                            onClick={() => {
                              setShowmenu(false);
                              goToLogin();
                            }}
                            className="
              mb-2
              w-full
              rounded-xl
              bg-[#1E1E1E]
              px-4
              py-3
              text-sm
              font-medium
              text-white
              dark:bg-white
              dark:text-black
            "
                          >
                            Login
                          </button>

                          <button
                            onClick={() => {
                              setShowmenu(false);
                              goToSignup();
                            }}
                            className="
              w-full
              rounded-xl
              border
              border-neutral-200
              px-4
              py-3
              text-sm
              font-medium
              text-neutral-700
              dark:border-neutral-700
              dark:text-neutral-200
            "
                          >
                            Sign Up
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </div>
          </div>

          <AnimatePresence>
            {showMobileSearch && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                transition={{
                  duration: 0.2,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="
        fixed
        inset-0
        z-[100]
        bg-white
        dark:bg-[#131313]
        sm:hidden
      "
              >
                {/* Header */}
                <div className="flex h-14 items-center gap-3 border-b border-neutral-200 px-4 dark:border-neutral-800">
                  <button
                    onClick={() => {
                      setShowMobileSearch(false);
                      setShowDropdown(false);
                    }}
                    className="transition-transform duration-200 active:scale-95 dark:text-white"
                  >
                    <IoChevronBackOutline size={22} />
                  </button>

                  {/* Search Input */}
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => {
                        handleSearchBar(e);

                        if (e.target.value.trim()) {
                          setShowDropdown(true);
                        } else {
                          setShowDropdown(false);
                        }
                      }}
                      onFocus={() => setShowDropdown(true)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          const trimmedQuery = query.trim();

                          if (!trimmedQuery) {
                            navigate("/");
                            setShowMobileSearch(false);
                            setShowDropdown(false);
                            return;
                          }

                          saveRecentSearch(trimmedQuery);
                          navigate(
                            `/search?q=${encodeURIComponent(trimmedQuery)}`,
                          );
                          setShowDropdown(false);
                        }
                      }}
                      className="
    h-10
    w-full
    rounded-full
    border
    border-neutral-200
    bg-neutral-100
    pl-4
    pr-10
    text-sm
    outline-none
    focus:border-[#2E40DC]
    dark:border-neutral-700
    dark:bg-[#1A1D20]
    dark:text-white
  "
                      placeholder="Search products..."
                    />

                    <CiSearch
                      size={18}
                      className="
              absolute
              right-3
              top-1/2
              -translate-y-1/2
              text-[#090A0B]
            "
                    />
                  </div>
                </div>

                {/* Results */}
                <div className="h-[calc(100vh-56px)] overflow-y-auto bg-white dark:bg-[#131313]">
                  {showDropdown && query.trim() ? (
                    <SearchDropdown
                      results={results}
                      loading={searchLoading}
                      query={query}
                      hasSearched={hasSearched}
                      mobile
                      onSelect={() => {
                        setShowMobileSearch(false);
                        setShowDropdown(false);
                      }}
                    />
                  ) : (
                    <div className="px-4 py-5">
                      {/* Categories */}
                      <div>
                        <h2 className="mb-3 text-sm font-semibold text-[#090A0B] dark:text-white">
                          Categories
                        </h2>

                        <div className="flex flex-wrap gap-2">
                          {mobileCategories.map((category) => (
                            <button
                              key={category}
                              onClick={() => {
                                navigate(`/category/${category.slug}`);

                                setShowMobileSearch(false);
                                setShowDropdown(false);
                              }}
                              className="
                rounded-full
                border
                border-neutral-200
                bg-neutral-50
                px-4
                py-2
                text-sm
                font-medium
                text-neutral-700
                transition-colors
                duration-200
                active:bg-neutral-100
                dark:border-neutral-700
                dark:bg-[#1A1D20]
                dark:text-neutral-200
              "
                            >
                              {category.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Recent Searches */}
                      <div className="mt-8">
                        <h2 className="mb-3 text-sm font-semibold text-[#090A0B] dark:text-white">
                          Recent Searches
                        </h2>

                        <div className="flex flex-col">
                          {recentSearches.map((item) => (
                            <button
                              key={item}
                              onClick={() => {
                                saveRecentSearch(item);

                                navigate(`/search?q=${item}`);

                                setShowMobileSearch(false);
                                setShowDropdown(false);
                              }}
                              className="
                flex
                items-center
                gap-3
                rounded-xl
                px-3
                py-3
                text-left
                text-sm
                text-neutral-700
                transition-colors
                duration-200
                active:bg-neutral-100
                dark:text-neutral-300
                dark:active:bg-neutral-800
              "
                            >
                              <CiSearch className="text-neutral-400" />
                              {item}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Desktop Navbar */}
          <div className="hidden w-full items-center justify-between sm:flex">
            {/* Logo */}
            <Link to="/" className="flex shrink-0 items-center gap-2">
              <img
                src="/logo.svg"
                alt="image"
                className="h-6 w-6 object-contain"
              />

              <span className="text-xl md:text-lg lg:text-xl font-semibold text-[#000000] dark:text-white">
                Unideals
              </span>
            </Link>

            {/* Location */}
            {isLoggedIn ? (
              <div className="relative ml-3 xl:ml-5">
                <button
                  onClick={() => setShowCampusDropdown((prev) => !prev)}
                  className="
      flex
      items-center
      gap-2
      rounded-full
      border
      border-[#b6bcc4]
      bg-white
      px-2 xl:px-3
      py-2
      transition-all
      duration-200
      hover:bg-neutral-50
      dark:border-neutral-700
      dark:bg-[#1A1D20]
      dark:hover:bg-neutral-800
    "
                >
                  <GrLocation className="size-4 text-[#2E40DC]" />

                  <span className="hidden xl:block text-sm font-medium text-[#090A0B] dark:text-white">
                    {selectedCampus}
                  </span>

                  <svg
                    className={`hidden xl:block h-4 w-4 transition-transform duration-200 ${
                      showCampusDropdown ? "rotate-180" : ""
                    }`}
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M19 9l-7 7-7-7"
                    />
                  </svg>
                </button>

                <AnimatePresence>
                  {showCampusDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.98 }}
                      transition={{
                        duration: 0.18,
                        ease: [0.22, 1, 0.36, 1],
                      }}
                      className="
          absolute
          left-0
          top-full
          z-50
          mt-2
          w-52
          overflow-hidden
          rounded-2xl
          border
          border-[#b6bcc4]
          bg-white
          shadow-2xl
          dark:border-neutral-800
          dark:bg-[#1A1D20]
        "
                    >
                      {campuses.map((campus) => (
                        <button
                          key={campus}
                          onClick={() => {
                            setSelectedCampus(campus);
                            setShowCampusDropdown(false);
                          }}
                          className={`
              flex
              w-full
              items-center
              gap-3
              px-4
              py-3
              text-left
              text-sm
              transition-colors
              duration-200
              hover:bg-neutral-100
              dark:hover:bg-neutral-800
              ${
                selectedCampus === campus
                  ? "bg-blue-50 text-[#2E40DC] dark:bg-blue-950/30"
                  : "text-neutral-700 dark:text-neutral-200"
              }
            `}
                        >
                          <GrLocation className="size-4" />

                          {campus}
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              ""
            )}

            {/* Search */}
            <div className="relative mx-3 xl:mx-6 xl:mr-80 flex-1 max-w-md items-center">
              <input
                type="text"
                value={search}
                onChange={handleSearchBar}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    const trimmedQuery = query.trim();

                    if (!trimmedQuery) {
                      navigate("/");
                      setShowDropdown(false);
                      return;
                    }

                    saveRecentSearch(trimmedQuery);
                    navigate(`/search?q=${encodeURIComponent(trimmedQuery)}`);
                    setShowDropdown(false);
                  }
                }}
                onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
                onFocus={() => {
                  if (query.trim()) {
                    setShowDropdown(true);
                  }
                }}
                className="h-10 w-full rounded-3xl border border-[#b6bcc4] bg-white pl-9 pr-14 text-sm text-neutral-900 outline-none focus:border-blue-500 focus:ring-5 focus:ring-blue-100 dark:border-neutral-700 dark:bg-[#1A1D20] dark:text-white dark:focus:ring-blue-950"
              />

              {search === "" && (
                <span className="pointer-events-none absolute left-5 xl:left-9 top-1/2 flex -translate-y-1/2 items-center gap-1 text-sm">
                  <span className="text-[#64707D] dark:text-neutral-400">
                    Search for
                  </span>

                  <span
                    className={`text-blue-600 transition-opacity duration-500 ${
                      fade ? "opacity-100" : "opacity-0"
                    }`}
                  >
                    {placeholderWords[placeholderIndex]}
                  </span>
                </span>
              )}

              <CiSearch
                size={22}
                className="absolute right-3 xl:right-7 top-1/2 -translate-y-1/2 text-[#090A0B] dark:text-neutral-400"
              />

              {showDropdown && query.trim() && (
                <SearchDropdown
                  results={results}
                  loading={searchLoading}
                  query={query}
                  hasSearched={hasSearched}
                  onSelect={() => {
                    setShowDropdown(false);
                  }}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex shrink-0 items-center gap-4 lg:gap-5 xl:gap-7">
              {isLoggedIn ? (
                <>
                  <button
                    onClick={toggleDarkMode}
                    className="transition-transform duration-200 hover:scale-105"
                    aria-label="Toggle Theme"
                  >
                    {darkMode ? (
                      <IoIosSunny className="size-5 text-[#FFD119]" />
                    ) : (
                      <IoMdMoon className="size-5 text-[#323232] dark:text-white" />
                    )}
                  </button>

                  <button className="relative">
                    <IoNotificationsOutline className="size-6 text-[#323232] dark:text-[#848484]" />

                    {notification > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-medium text-white">
                        {notification}
                      </span>
                    )}
                  </button>

                  <Link to="/chat" className="relative">
                    <LuMessageSquare className="size-6 text-[#323232] dark:text-[#848484]" />

                    {notification > 0 && (
                      <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-[#3838EC] px-1 text-[10px] font-medium text-white">
                        {notification}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/upload"
                    className="flex items-center gap-2 rounded-lg bg-[#3838EC] px-4 lg:px-5 py-2 text-base font-medium text-[#FCFCFC] transition-all duration-200 hover:scale-[1.02]"
                  >
                    <span>Sell</span>
                    <FaPlus className="size-3" />
                  </Link>

                  <div className="relative">
                    <button
                      onClick={handleMenu}
                      className="transition-all duration-200 hover:scale-105"
                    >
                      <AvatarComponent
                        name={userDetails?.name}
                        imageUrl={userDetails?.avatar}
                        size="medium"
                        isLoading={userLoading}
                      />
                    </button>

                    <AnimatePresence>
                      {showmenu && (
                        <motion.div
                          ref={menuRef}
                          initial={{ opacity: 0, y: 8, scale: 0.98 }}
                          animate={{ opacity: 1, y: 0, scale: 1 }}
                          exit={{ opacity: 0, y: 8, scale: 0.98 }}
                          transition={{
                            duration: 0.18,
                            ease: [0.22, 1, 0.36, 1],
                          }}
                          className="absolute right-0 top-full z-50 mt-3 w-[290px] overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-2xl dark:border-neutral-800 dark:bg-[#1A1D20]"
                        >
                          <div className="border-b border-neutral-200 px-4 py-4 dark:border-neutral-800">
                            <div className="flex items-center gap-4">
                              <AvatarComponent
                                name={userDetails?.name}
                                imageUrl={userDetails?.avatar}
                                size="medium"
                                isLoading={userLoading}
                              />

                              <div>
                                <h1 className="text-sm font-medium text-neutral-900 dark:text-white">
                                  {userDetails?.name || "User"}
                                </h1>

                                <p className="text-xs text-neutral-500 dark:text-neutral-400">
                                  {userDetails?.email || ""}
                                </p>
                              </div>
                            </div>
                          </div>

                          <div className="py-2">
                            {[
                              {
                                to: "/profile",
                                icon: <LuUserRound />,
                                label: "Profile",
                              },
                              {
                                to: "/myorders",
                                icon: <BsBoxSeam />,
                                label: "Orders",
                              },
                              {
                                to: "/chat",
                                icon: <FiMessageSquare />,
                                label: "Chat",
                              },
                              {
                                to: "/wishlist",
                                icon: <IoIosHeartEmpty />,
                                label: "Wishlist",
                              },
                              {
                                to: "/contact",
                                icon: <CiMail />,
                                label: "Contact Us",
                              },
                            ].map(({ to, icon, label }) => (
                              <Link
                                key={label}
                                to={to}
                                onClick={() => setShowmenu(false)}
                                className="flex items-center gap-3 px-4 py-3 text-sm text-neutral-700 transition-colors duration-200 hover:bg-neutral-100 dark:text-neutral-200 dark:hover:bg-neutral-800"
                              >
                                <span className="text-lg">{icon}</span>
                                <span>{label}</span>
                              </Link>
                            ))}
                          </div>

                          <button
                            onClick={handleLogoutClick}
                            className="flex w-full items-center gap-3 border-t border-neutral-200 px-4 py-3 text-sm text-red-500 transition-colors duration-200 hover:bg-red-50 dark:border-neutral-800 dark:hover:bg-red-950/20"
                          >
                            <MdOutlineLogout className="text-lg" />
                            <span>Logout</span>
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </>
              ) : (
                <>
                  <button
                    onClick={toggleDarkMode}
                    className="transition-transform duration-200 hover:scale-105"
                    aria-label="Toggle Theme"
                  >
                    {darkMode ? (
                      <IoIosSunny className="size-5 text-[#FFD119]" />
                    ) : (
                      <IoMdMoon className="size-5 text-[#323232] dark:text-white" />
                    )}
                  </button>

                  <button
                    onClick={goToSignup}
                    className="text-base lg:text-base md:text-sm font-medium text-[#090A0B] transition-colors duration-200 hover:text-black dark:text-neutral-300 dark:hover:text-white"
                  >
                    Sign up
                  </button>

                  <button
                    onClick={goToLogin}
                    className="rounded-xl bg-[#1E1E1E] px-6 xl:px-7 py-2 text-base lg:text-base md:text-sm font-medium text-white transition-all duration-200 hover:scale-[1.01] dark:bg-white dark:text-black"
                  >
                    Login
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
    </>
  );
};

export default Header;
