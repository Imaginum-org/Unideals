import { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { getProducts } from "../api/productApi";
import { Share2, MessageSquare, Eye, ShieldCheck, Clock3 } from "lucide-react";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import ProductCard from "../../../features/product/components/ProductCard.jsx";
import toast from "react-hot-toast";
import { Expand, Minimize2 } from "lucide-react";
import { LuMessageSquareText } from "react-icons/lu";
import { useParams, Link } from "react-router-dom";
import { IoIosArrowForward } from "react-icons/io";
import { getProductById } from "../api/productApi";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import { MdLocationPin } from "react-icons/md";
import AvatarComponent from "../../../Components/common/AvatarComponent.jsx";
import { motion } from "framer-motion";
import { FaWhatsapp, FaTelegram, FaLink } from "react-icons/fa";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";
import { IoClose } from "react-icons/io5";
// condition
import { GoChecklist } from "react-icons/go";
// color
import { IoColorPaletteOutline } from "react-icons/io5";
import { useWishlist } from "../../../context/WishlistContext";
// date of purchase
import { IoCalendarOutline } from "react-icons/io5";
import { FaArrowRight } from "react-icons/fa6";

const FALLBACK_IMAGE = "/image10.png";

const ProductDescription = () => {
  const { toggleWishlist, isInWishlist } = useWishlist();
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [activeImage, setActiveImage] = useState("");
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [similarProducts, setSimilarProducts] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isContainMode, setIsContainMode] = useState(false);

  const staticCTARef = useRef(null);
  const floatingCTARef = useRef(null);
  const productId = product?._id;
  const inWishlist = isInWishlist(productId);
  const navigate = useNavigate();

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [id]);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await getProductById(id);

        const fetchedProduct = res?.data?.data;

        setProduct(fetchedProduct);

        if (fetchedProduct?.images?.length > 0) {
          setActiveImage(fetchedProduct.images[0].url);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  // useEffect(() => {
  //   let isMounted = true;

  //   const checkWishlist = async () => {
  //     if (!productId) return;

  //     try {
  //       const inWish = await checkProductInWishlist(productId);

  //       if (isMounted) {
  //         setInWishlist(inWish);
  //       }
  //     } catch (error) {
  //       console.error("Wishlist check failed:", error);
  //     }
  //   };

  //   checkWishlist();

  //   return () => {
  //     isMounted = false;
  //   };
  // }, [productId, checkProductInWishlist]);

  useEffect(() => {
    const fetchSimilarProducts = async () => {
      if (!product?.category) return;

      try {
        setSimilarLoading(true);

        const res = await getProducts({
          category: product.category,
        });

        const filteredProducts = (res?.data?.data || [])
          .filter((item) => item._id !== product._id)
          .slice(0, 4);

        setSimilarProducts(filteredProducts);
      } catch (error) {
        console.log("Failed to fetch similar products", error);
      } finally {
        setSimilarLoading(false);
      }
    };

    fetchSimilarProducts();
  }, [product]);

  useEffect(() => {
    let rafId;
    let wasVisible = false;

    const check = () => {
      if (staticCTARef.current && floatingCTARef.current) {
        const rect = staticCTARef.current.getBoundingClientRect();
        const isStaticVisible = rect.top < window.innerHeight;

        if (isStaticVisible && !wasVisible) {
          // Static CTA just came into view — animate floating bar TO that position
          wasVisible = true;
          const floating = floatingCTARef.current;

          const targetBottom = window.innerHeight - rect.bottom;
          const targetLeft = rect.left;
          const targetRight = window.innerWidth - rect.right;

          // Set destination position directly on DOM (no React re-render)
          floating.style.bottom = `${targetBottom}px`;
          floating.style.left = `${targetLeft}px`;
          floating.style.right = `${targetRight}px`;
          floating.style.opacity = "0";
          floating.style.pointerEvents = "none";
        } else if (!isStaticVisible && wasVisible) {
          // Scrolled back up — snap floating bar back to bottom instantly (no transition)
          wasVisible = false;
          const floating = floatingCTARef.current;

          floating.style.transition = "none";
          floating.style.bottom = "16px";
          floating.style.left = "16px";
          floating.style.right = "16px";
          floating.style.opacity = "1";
          floating.style.pointerEvents = "auto";

          // Re-enable transition after snap
          requestAnimationFrame(() => {
            floating.style.transition =
              "bottom 450ms cubic-bezier(0.4, 0, 0.2, 1), left 450ms cubic-bezier(0.4, 0, 0.2, 1), right 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease";
          });
        }
      }
      rafId = requestAnimationFrame(check);
    };

    rafId = requestAnimationFrame(check);
    return () => cancelAnimationFrame(rafId);
  }, []);

  const getShareData = () => {
    const shareUrl = `${window.location.origin}/product/${product._id}`;

    const title = product?.title || "Product";

    const text = `🎓 Found this on Unideals

${title}
₹${product?.selling_price}

Available on campus.

${shareUrl}`;

    return {
      title,
      text,
      url: shareUrl,
    };
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "ArrowLeft") {
        goToPreviousImage();
      }

      if (e.key === "ArrowRight") {
        goToNextImage();
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeImage]);

  // const handleShare = async () => {
  //   const shareData = getShareData();

  //   try {
  //     if (navigator.share) {
  //       await navigator.share(shareData);

  //       toast.success("Shared successfully");

  //       return;
  //     }

  //     await navigator.clipboard.writeText(shareData.url);

  //     toast.success("Link copied to clipboard");
  //   } catch (error) {
  //     if (error?.name !== "AbortError") {
  //       toast.error("Unable to share product");
  //     }
  //   }
  // };

  const shareUrl = `${window.location.origin}/product/${product?._id}`;

  const shareText = `🎓 Found this on Unideals

📦 ${product?.title}
💰 ₹${product?.selling_price}

Available for pickup on campus.

${shareUrl}`;

  const original = Number(product?.original_price || 0);
  const selling = Number(product?.selling_price || 0);

  const savedPricedPercentage =
    original > 0 ? Math.round(((original - selling) / original) * 100) : 0;

  const handleWishlistClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!product?._id || wishlistLoading) return;

    setWishlistLoading(true);

    try {
      const result = await toggleWishlist(product._id, product);
      toast.success(result ? "Added to Wishlist" : "Removed from Wishlist", {
        id: "wishlist-toast",
      });
    } catch (error) {
      toast.error("Failed to update wishlist", {
        id: "wishlist-error",
      });
    } finally {
      setWishlistLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FD] animate-pulse">
        <div className="max-w-[1380px] mx-auto px-6 py-8">
          <div className="h-8 w-48 bg-gray-200 rounded" />
          <div className="mt-6 grid lg:grid-cols-[530px_1fr] gap-6">
            <div className="aspect-square rounded-xl bg-gray-200" />
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded" />
              <div className="h-6 w-40 bg-gray-200 rounded" />
              <div className="h-32 bg-gray-200 rounded" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        Product not found
      </div>
    );
  }

  const getRelativeTime = (date) => {
    const now = new Date();

    const created = new Date(date);

    const diffInSeconds = Math.floor((now - created) / 1000);

    const minutes = Math.floor(diffInSeconds / 60);

    const hours = Math.floor(minutes / 60);

    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days > 1 ? "s" : ""} ago`;
    }

    if (hours > 0) {
      return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    }

    if (minutes > 0) {
      return `${minutes} minute${minutes > 1 ? "s" : ""} ago`;
    }

    return "Just now";
  };

  const images =
    product?.images?.length > 0
      ? product.images.map((image) => image.url)
      : [FALLBACK_IMAGE];

  const currentImageIndex = images.findIndex((img) => img === activeImage);

  const goToPreviousImage = () => {
    if (currentImageIndex > 0) {
      setActiveImage(images[currentImageIndex - 1]);
    }
  };

  const goToNextImage = () => {
    if (currentImageIndex < images.length - 1) {
      setActiveImage(images[currentImageIndex + 1]);
    }
  };

  return (
    <motion.div
      initial={{
        opacity: 0,
        y: 16,
      }}
      animate={{
        opacity: 1,
        y: 0,
      }}
      transition={{
        duration: 0.35,
        ease: "easeOut",
      }}
      className="w-full min-h-screen bg-[#F7F9FD] font-figtree dark:bg-[#131313]"
    >
      <motion.div
        initial={{
          opacity: 0,
          y: 12,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.4,
          delay: 0.1,
          ease: "easeOut",
        }}
        className="pt-4 text-[#454655] mx-auto w-full max-w-[1380px] px-6 sm:px-8 md:px-11 lg:px-14 2xl:px-0"
      >
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-[#454655] mb-4 overflow-x-auto whitespace-nowrap font-semibold">
          <button
            onClick={() => navigate("/")}
            className="hover:text-[#3838EC] dark:text-slate-300 transition-colors"
          >
            Home
          </button>

          <IoIosArrowForward size={12} />

          <button
            onClick={() => navigate(`/category/${product?.category}`)}
            className="capitalize font-semibold text-[#454655] dark:text-slate-300 hover:text-[#3838EC] transition-colors"
          >
            {product?.category.replaceAll("_", " ")}
          </button>

          <IoIosArrowForward size={12} />

          <span className="font-bold text-black dark:text-white">
            {product?.title}
          </span>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[530px_1fr] gap-6 xl:gap-5">
          {/* LEFT */}
          <div className="flex flex-col gap-4">
            {/* Image Card */}
            <div className="bg-[#FFFFFF] dark:bg-[#1A1D20] dark:border-0 rounded-xl border border-[#C9D1DC] p-3 md:p-4 xl:p-4">
              {/* Main Image */}
              <div className="relative group overflow-hidden rounded-2xl bg-[#F8FAFC]">
                <motion.img
                  key={activeImage}
                  src={activeImage}
                  initial={{
                    opacity: 0,
                    scale: 1.02,
                  }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                  }}
                  transition={{
                    duration: 0.25,
                  }}
                  alt="Product"
                  className={`w-full aspect-[1/0.93] transition-all duration-300 ${
                    isContainMode ? "object-contain" : "object-cover"
                  }`}
                />

                {images.length > 1 && currentImageIndex > 0 && (
                  <button
                    onClick={goToPreviousImage}
                    className="
      absolute
      left-4
      top-1/2
      -translate-y-1/2
      h-11
      w-11
      rounded-full
      bg-white/90
      backdrop-blur-md
      shadow-lg
      flex
      items-center
      justify-center
      z-20
      transition-all
      duration-200
      opacity-100
      md:opacity-0
      md:group-hover:opacity-100
      hover:scale-105
    "
                  >
                    <FiChevronLeft size={24} />
                  </button>
                )}

                {images.length > 1 && currentImageIndex < images.length - 1 && (
                  <button
                    onClick={goToNextImage}
                    className="
      absolute
      right-4
      top-1/2
      -translate-y-1/2
      h-11
      w-11
      rounded-full
      bg-white/90
      backdrop-blur-md
      shadow-lg
      flex
      items-center
      justify-center
      z-20
      transition-all
      duration-200
      opacity-100
      md:opacity-0
      md:group-hover:opacity-100
      hover:scale-105
    "
                  >
                    <FiChevronRight size={24} />
                  </button>
                )}

                {/* Image Fit Toggle */}
                <button
                  onClick={() => setIsContainMode((prev) => !prev)}
                  className="absolute bottom-3 right-3 w-10 h-10 rounded-full bg-white shadow-lg border border-gray-200 flex items-center justify-center hover:scale-105 transition-all duration-200"
                >
                  {isContainMode ? (
                    <Minimize2 size={18} className="text-[#181C1F]" />
                  ) : (
                    <Expand size={18} className="text-[#181C1F]" />
                  )}
                </button>
                {/* Top Actions */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={() => setShowShareMenu(true)}
                    className="w-10 h-10 md:w-11 md:h-11 lg:w-9 lg:h-9 rounded-full bg-white shadow-md flex items-center justify-center"
                  >
                    <Share2 size={18} className="text-[#181C1F]" />
                  </button>
                </div>
              </div>

              {/* Thumbnails */}
              <div className="mt-3 flex gap-3 overflow-x-auto scrollbar-hide">
                {images.map((img, index) => (
                  <button
                    key={index}
                    onClick={() => setActiveImage(img)}
                    className={`min-w-[74px] sm:min-w-[84px] w-[74px] sm:w-[90px] h-[74px] sm:h-[90px] rounded-xl overflow-hidden border-2 transition-all duration-200 ${
                      activeImage === img
                        ? "border-[#4F46E5]"
                        : "border-[#ECECEC]"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Preview ${index}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="mt-4 border border-[#E2E8F0] rounded-xl px-3 bg-[#FFFFFF] dark:bg-[#131313] dark:border-0 py-3 flex flex-wrap items-center justify-between gap-3 text-[12px] md:text-sm text-[#6B7280]">
                <div className="flex items-center gap-2 text-[#475569] dark:text-white font-medium">
                  <Eye size={16} className="text-[#2563EB]" />

                  <span>{product?.views_count || 0} views</span>
                </div>

                <div className="flex items-center dark:text-white gap-2 text-[#475569] font-medium">
                  <MessageSquare size={16} />

                  <span>18 users chatted</span>
                </div>

                <div className="flex items-center gap-2 text-[#394FF1] font-medium">
                  <Clock3 size={16} />

                  <span>5 chats in last hour</span>
                </div>
              </div>
            </div>

            {/* Key Details */}
            <div className="bg-white dark:bg-[#1A1D20] dark:border-0 shadow-sm rounded-xl border border-[#E2E8F0] p-5 md:p-6">
              <h2 className="text-lg dark:text-white md:text-xl lg:text-xl xl:text-xl font-bold text-[#0F172A] mb-5">
                Key Details
              </h2>

              <div className="space-y-7">
                {[
                  {
                    icon: <GoChecklist size={17} className="text-[#3838EC]" />,
                    label: "Usage Duration",
                    value: product?.attributes?.usage_duration || "<2 months",
                  },

                  {
                    icon: <GoChecklist size={17} className="text-[#3838EC]" />,
                    label: "Brand",
                    value: product?.attributes?.brand || "N/A",
                  },

                  {
                    icon: <GoChecklist size={17} className="text-[#3838EC]" />,
                    label: "Model",
                    value: product?.title,
                  },
                  {
                    icon: (
                      <IoColorPaletteOutline
                        size={17}
                        className="text-[#3838EC]"
                      />
                    ),
                    label: "Color",
                    value: product?.attributes?.color || "N/A",
                  },
                  {
                    icon: (
                      <IoCalendarOutline size={17} className="text-[#3838EC]" />
                    ),
                    label: "Purchase Date",
                    value: product?.attributes?.purchase_date || "N/A",
                  },
                ].map((item, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between text-sm"
                  >
                    <div className="flex items-center gap-3 text-[#6B7280] dark:text-white">
                      <div className="flex items-center justify-center">
                        {item.icon}
                      </div>

                      <span className="text-[#64748B] text-sm lg:text-base dark:text-slate-300">
                        {item.label}
                      </span>
                    </div>

                    <span className="capitalize max-w-[180px] text-start text-sm lg:text-base font-medium text-[#0F172A] dark:text-slate-300">
                      {item.value.replaceAll("_", " ")}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT */}
          <div className="flex flex-col gap-4">
            {/* Product Info */}
            <div className="bg-white rounded-xl border border-[#C9D1DC] p-5 md:p-7 xl:px-7 xl:py-5 dark:bg-[#1A1D20] dark:border-0 dark:text-white">
              {/* Tags */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-[#EAECFB] text-[#3838EC] text-sm font-medium px-4 py-1 rounded-full capitalize">
                  {product?.category?.replaceAll("_", " ")}
                </div>
                <div className="bg-[#E9F9EE] text-[#319F43] text-sm font-medium px-4 py-1 rounded-full">
                  Available
                </div>
              </div>

              {/* Title */}
              <h1 className="mt-4 md:mt-5 text-2xl sm:text-2xl md:text-2xl lg:text-3xl xl:text-3xl 2xl:text-4xl leading-[1.1] tracking-[-1px] font-bold text-[#0F172A] dark:text-white">
                {product?.title}
              </h1>

              {/* Price */}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="text-[#3838EC] flex items-center">
                  <span className="text-2xl sm:text-2xl md:text-2xl lg:text-2xl xl:text-2xl 2xl:text-3xl font-extrabold leading-none">
                    ₹{product?.selling_price}
                  </span>
                </div>

                {product?.original_price && (
                  <span className="line-through text-[#94A3B8] text-lg md:text-2xl xl:text-xl font-medium">
                    ₹{product?.original_price}
                  </span>
                )}
                {savedPricedPercentage > 0 && (
                  <div className="bg-[#EEF0FF] text-[#3838EC] text-xs font-semibold px-3 py-1 rounded-md">
                    Save {savedPricedPercentage}%
                  </div>
                )}
              </div>

              {/* Seller */}
              <div className="mt-5 flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-3">
                  <AvatarComponent
                    name={product?.seller_id?.name || "Seller"}
                    imageUrl={product?.seller_id?.avatar}
                    plan={product?.seller_id?.subscription} // Shows the seller's badge to buyers!
                    size="small"
                    className="lg:scale-125 origin-left" // This keeps your responsive sizing (w-7 to w-9)
                  />

                  <span className="font-semibold text-[#181C1F] text-sm dark:text-white">
                    {product?.seller_id?.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[#181C1F] text-xs dark:text-slate-300">
                  <Clock3 size={16} />

                  <span> Listed {getRelativeTime(product?.createdAt)}</span>
                </div>
              </div>

              {/* About */}
              <div className="mt-9">
                <h2 className="text-lg md:text-xl font-bold text-[#181C1F] dark:text-white">
                  About This Product
                </h2>

                <p className="max-w-[820px] mt-3 text-[#454655] text-[14px] sm:text-[15px] md:text-base leading-[1.9] whitespace-pre-line dark:text-slate-300">
                  {product?.description}
                </p>
              </div>

              {/* CTA */}
              <div
                ref={staticCTARef}
                className="mt-10 flex flex-row items-stretch gap-3"
              >
                {/* Wishlist */}
                <button
                  onClick={handleWishlistClick}
                  disabled={wishlistLoading}
                  aria-label={
                    inWishlist ? "Remove from wishlist" : "Add to wishlist"
                  }
                  className={`h-[55px] w-[60px] rounded-2xl border flex items-center justify-center transition-all duration-300 ${
                    loading ? "opacity-50 cursor-not-allowed" : ""
                  } ${
                    inWishlist
                      ? "bg-[#FFF1F4] border-pink-200"
                      : "bg-white dark:bg-[#1A1D20] border-[#D6DCE5] dark:border-zinc-700 hover:border-[#3838EC]"
                  }`}
                >
                  {inWishlist ? (
                    <FaHeart className="text-pink-500 text-lg transition-colors duration-300" />
                  ) : (
                    <FaRegHeart className="text-gray-400 hover:text-pink-500 text-lg transition-colors duration-300" />
                  )}
                </button>

                {/* Chat */}
                <Link
                  to={`/chat?seller=${product?.seller_id?._id}`}
                  className="flex-1 h-[55px] rounded-2xl bg-gradient-to-r from-[#2E3FDC] to-[#4B5CF5] flex items-center justify-center gap-3 text-white font-semibold text-base tracking-wide shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <LuMessageSquareText size={20} />
                  Chat with Seller
                </Link>
              </div>
            </div>

            {/* Pickup & Safety */}
            <div className="bg-white dark:bg-[#1A1D20] dark:border-0 rounded-xl shadow-sm border border-[#E2E8F0] p-5 md:p-7 xl:px-7 xl:py-5">
              <h2 className="text-lg md:text-xl font-bold text-[#111827] dark:text-white mb-7">
                Pickup & Safety
              </h2>

              <div className="grid md:grid-cols-2 gap-7">
                <div className="flex gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#F3F4FF] flex items-center justify-center">
                    <HiOutlineBuildingLibrary
                      size={22}
                      className="text-[#3838EC]"
                    />
                  </div>

                  <div>
                    <p className="text-[#64748B] text-sm dark:text-slate-300">
                      Campus Location
                    </p>

                    <h4 className="mt-1 font-semibold text-[#0F172A] text-base dark:text-white">
                      VIT Vellore
                    </h4>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#F3F4FF] flex items-center justify-center">
                    <MdLocationPin size={22} className="text-[#3838EC]" />
                  </div>

                  <div>
                    <p className="text-[#64748B] text-sm dark:text-slate-300">
                      Meetup Point
                    </p>

                    <h4 className="mt-1 font-semibold text-[#0F172A] text-base dark:text-white">
                      {product.pickup_address_snapshot?.address_line} <br />
                      {product.pickup_address_snapshot?.city}
                      <br />
                      {product.pickup_address_snapshot?.pincode}
                      {product.pickup_address_snapshot?.state}
                      <br />
                    </h4>
                  </div>
                </div>
              </div>

              {/* Safety Box */}
              <div className="mt-7 rounded-2xl bg-[#F5F6FF] dark:bg-[#131313] dark:border-0 border border-[#F1F5F9] p-5 flex gap-4">
                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center">
                  <ShieldCheck size={22} className="text-[#3838EC]" />
                </div>

                <div>
                  <h4 className="font-semibold text-[#3838EC] text-base">
                    Safe campus-only exchange
                  </h4>

                  <p className="mt-1 text-[#666] leading-7 dark:text-slate-300">
                    Meet in public places. Avoid sharing personal details.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Similar Products */}
        <div className="w-full mt-12 mb-12">
          <div className="mb-5 flex items-center justify-between gap-4">
            <h2 className="text-lg md:text-xl font-bold text-[#0F172A] dark:text-white">
              You might also like
            </h2>

            <button
              onClick={() => navigate(`/category/${product?.category}`)}
              className="text-[#2563EB] text-sm md:text-base font-semibold whitespace-nowrap capitalize flex items-center gap-2"
            >
              Browse all {product?.category?.replaceAll("_", " ")}{" "}
              <FaArrowRight />
            </button>
          </div>

          {!similarLoading && similarProducts.length === 0 && (
            <div className="text-center py-8">
              <p className="text-zinc-500">No similar products available</p>
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-5">
            {similarProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </div>
      </motion.div>

      <div
        ref={floatingCTARef}
        className="sm:hidden"
        style={{
          position: "fixed",
          bottom: "16px",
          left: "16px",
          right: "16px",
          zIndex: 50,
          opacity: 1,
          pointerEvents: "auto",
          transition:
            "bottom 450ms cubic-bezier(0.4, 0, 0.2, 1), left 450ms cubic-bezier(0.4, 0, 0.2, 1), right 450ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease",
        }}
      >
        <div className="flex gap-3">
          <button
            onClick={handleWishlistClick}
            disabled={wishlistLoading}
            className={`h-[56px] w-[60px] rounded-2xl backdrop-blur-xl border shadow-xl flex items-center justify-center ${
              inWishlist
                ? "bg-[#FFF1F4] border-pink-200"
                : "bg-white/95 border-white/50"
            }`}
          >
            {inWishlist ? (
              <FaHeart className="text-pink-500 text-lg" />
            ) : (
              <FaRegHeart className="text-gray-500 text-lg" />
            )}
          </button>

          <Link
            to={`/chat?seller=${product?.seller_id?._id}`}
            className="flex-1 h-[56px] rounded-2xl bg-gradient-to-r from-[#2E3FDC] to-[#4B5CF5] shadow-[0_12px_30px_rgba(46,63,220,0.35)] flex items-center justify-center gap-3 text-white font-semibold"
          >
            <LuMessageSquareText size={20} />
            Chat with Seller
          </Link>
        </div>
      </div>
      {showShareMenu && (
        <div className="fixed inset-0 z-[999] flex items-end md:items-center justify-center">
          {/* Overlay */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowShareMenu(false)}
            className="absolute
    inset-0
    bg-black/50
    backdrop-blur-lg"
          />

          {/* Modal */}
          <motion.div
            initial={{
              y: 80,
              opacity: 0,
              scale: 0.98,
              backdropFilter: "blur(0px)",
            }}
            drag="y"
            dragConstraints={{
              top: 0,
              bottom: 100,
            }}
            onDragEnd={(e, info) => {
              if (info.offset.y > 120) {
                setShowShareMenu(false);
              }
            }}
            animate={{
              y: 0,
              opacity: 1,
              scale: 1,
              backdropFilter: "blur(12px)",
            }}
            exit={{
              y: 120,
              opacity: 0,
              backdropFilter: "blur(0px)",
            }}
            transition={{
              type: "spring",
              stiffness: 350,
              damping: 28,
            }}
            className="
  relative
  w-full
  md:w-[520px]
  mx-4
  bg-white/95
dark:bg-[#16181B]/95
border
border-white/40
dark:border-white/5
  backdrop-blur-2xl
  rounded-t-[32px]
  md:rounded-[32px]
  p-6
  shadow-[0_-8px_40px_rgba(0,0,0,0.12),0_24px_80px_rgba(0,0,0,0.18)]
"
          >
            {/* Header */}
            <div className="flex justify-center mb-4">
              <div
                className="
      w-12
      h-1.5
      rounded-full
      bg-gray-300
    "
              />
            </div>
            <div className="flex items-center justify-between">
              <div className="text-black">
                <h3 className="text-xl font-bold">Share Product</h3>

                <p className="text-sm text-zinc-500 mt-1">
                  Share this listing with your classmates
                </p>
              </div>

              <button onClick={() => setShowShareMenu(false)}>
                <IoClose className="text-black dark:text-white" size={24} />
              </button>
            </div>

            {/* Product Preview */}

            <div
              className="
mt-5
flex
items-center
gap-4
p-4
rounded-3xl
bg-white
dark:bg-zinc-900
border
border-zinc-200
dark:border-zinc-800
"
            >
              <img
                src={product?.images?.[0]?.url || FALLBACK_IMAGE}
                className="
    w-20
    h-20
    rounded-2xl
    object-cover
    shadow-md
  "
              />

              <div>
                <h4 className="font-semibold text-black dark:text-white">
                  {product?.title}
                </h4>

                <p className="text-[#3838EC] font-bold text-lg">
                  ₹{product?.selling_price}
                </p>
              </div>
            </div>

            {/* Share Buttons */}

            <div className="grid grid-cols-2 gap-4 mt-6">
              <motion.button
                onClick={() => {
                  window.open(
                    `https://wa.me/?text=${encodeURIComponent(shareText)}`,
                    "_blank",
                  );

                  setShowShareMenu(false);
                }}
                whileHover={{
                  y: -1,
                  scale: 1.01,
                }}
                whileTap={{
                  scale: 0.94,
                }}
                className="h-14 rounded-xl text-white transition-all shadow-sm hover:shadow-xl bg-[#25D366] flex items-center justify-center gap-3"
              >
                <FaWhatsapp size={24} />
                <span className="font-medium">WhatsApp</span>
              </motion.button>

              <motion.button
                onClick={() => {
                  window.open(
                    `https://t.me/share/url?url=${encodeURIComponent(
                      shareUrl,
                    )}&text=${encodeURIComponent(product?.title)}`,
                    "_blank",
                  );

                  setShowShareMenu(false);
                }}
                whileHover={{
                  y: -1,
                  scale: 1,
                }}
                whileTap={{
                  scale: 0.94,
                }}
                className="h-14 rounded-xl text-white transition-all shadow-sm hover:shadow-xl bg-[#3390EC] flex items-center justify-center gap-3"
              >
                <FaTelegram size={24} />
                Telegram
              </motion.button>

              <motion.button
                onClick={async () => {
                  await navigator.clipboard.writeText(shareUrl);

                  setCopied(true);

                  setTimeout(() => {
                    setCopied(false);
                  }, 2000);

                  toast.success("Link copied");

                  setShowShareMenu(false);
                }}
                whileHover={{
                  y: -1,
                  scale: 1,
                }}
                whileTap={{
                  scale: 0.97,
                }}
                className="hover:brightness-110 col-span-2 h-14 rounded-xl text-white bg-[#4556F0] flex items-center justify-center gap-3 font-semibold"
              >
                {copied ? (
                  <>✓ Copied</>
                ) : (
                  <>
                    <FaLink />
                    Copy Link
                  </>
                )}
              </motion.button>
            </div>

            <div
              className="
mt-6
rounded-2xl
bg-[#EEF2FF]
border
border-[#DDE4FF]
p-4
"
            >
              <p className="font-semibold text-[#3838EC]">
                🎓 Share with classmates
              </p>

              <p className="text-sm text-slate-600 mt-1">
                Listings shared in hostel groups usually get more views and
                responses.
              </p>
            </div>

            {/* URL Preview */}

            <div className="mt-6 p-3 rounded-xl border text-black bg-[#FAFAFA] text-sm truncate">
              {shareUrl}
            </div>

            <p className="mt-4 text-center text-xs text-zinc-500">
              Anyone with this link can view this listing.
            </p>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
};

export default ProductDescription;
