import { useEffect, useState } from "react";
import Footer from "../../../components/layout/Footer.jsx";
import { useNavigate } from "react-router-dom";
import {
  Heart,
  Share2,
  MessageSquare,
  Eye,
  MapPin,
  ShieldCheck,
  Clock3,
} from "lucide-react";
import toast from "react-hot-toast"

import { LuMessageSquareText } from "react-icons/lu";
import { useParams, Link } from "react-router-dom";
import { IoIosArrowForward } from "react-icons/io";
import { getProductById } from "../api/productApi";
import { useWishlist } from "../../../context/useWishlist";
import { HiOutlineBuildingLibrary } from "react-icons/hi2";
import { MdLocationPin } from "react-icons/md";
// condition
import { GoChecklist } from "react-icons/go";
//color
import { IoColorPaletteOutline } from "react-icons/io5";

//date of purchase
import { IoCalendarOutline } from "react-icons/io5";
import { FaArrowRight } from "react-icons/fa6";

const FALLBACK_IMAGE = "/image10.png";

const ProductDescription = () => {
  const { id } = useParams();

  const [product, setProduct] = useState(null);

  const [activeImage, setActiveImage] = useState("");

  const [loading, setLoading] = useState(true);

  const [inWishlist, setInWishlist] = useState(false);

  const { toggleWishlist, checkProductInWishlist } = useWishlist();
  const navigate = useNavigate();
  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const res = await getProductById(id);

        const fetchedProduct = res?.data?.data;

        setProduct(fetchedProduct);

        if (fetchedProduct?.images?.length > 0) {
          setActiveImage(fetchedProduct.images[0]);
        }
      } catch (error) {
        console.log(error);
      } finally {
        setLoading(false);
      }
    };

    fetchProduct();
  }, [id]);

  useEffect(() => {
    const checkWishlist = async () => {
      const exists = await checkProductInWishlist(id);

      setInWishlist(exists);
    };

    checkWishlist();
  }, [id]);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);

      toast.success("Product link copied");
    } catch (error) {
      console.log(error);

      toast.error("Failed to copy link");
    }
  };
  const original = Number(product?.original_price);
  const selling = Number(product?.selling_price);
  const savedPricedPercentage = Math.round(
    ((original - selling) / original) * 100,
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F7F8FA]">
        Loading...
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

  console.log(product);

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
    product?.images?.length > 0 ? product.images : [FALLBACK_IMAGE];

  return (
    <div className="w-full min-h-screen bg-[#F7F9FD] font-figtree">
      <div className="w-full max-w-[1380px] mx-auto px-3 sm:px-4 md:px-5 lg:px-6 xl:px-0 pt-4 md:pt-6 xl:pt-4 text-[#454655]">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1 text-sm text-[#454655] mb-4 overflow-x-auto whitespace-nowrap font-semibold">
          <button
            onClick={() => navigate("/")}
            className="hover:text-[#3838EC] transition-colors"
          >
            Home
          </button>

          <IoIosArrowForward size={12} />

          <button
            onClick={() => navigate(`/category/${product?.category}`)}
            className="capitalize font-semibold text-[#454655] hover:text-[#3838EC] transition-colors"
          >
            {product?.category.replaceAll("_", " ")}
          </button>

          <IoIosArrowForward size={12} />

          <span className="font-bold text-black">{product?.title}</span>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-[530px_1fr] gap-6 xl:gap-5">
          {/* LEFT */}
          <div className="flex flex-col gap-4">
            {/* Image Card */}
            <div className="bg-[#FFFFFF] rounded-xl border border-[#C9D1DC] p-3 md:p-4 xl:p-4">
              {/* Main Image */}
              <div className="relative overflow-hidden rounded-2xl">
                <img
                  src={activeImage}
                  alt="Product"
                  className="w-full aspect-[1/0.93] object-cover"
                />
                {/* Top Actions */}
                <div className="absolute top-3 right-3 flex items-center gap-2">
                  <button
                    onClick={() => {
                      toggleWishlist(id);

                      setInWishlist(!inWishlist);
                    }}
                    className="w-10 h-10 md:w-11 md:h-11 lg:w-9 lg:h-9 rounded-full bg-white shadow-md flex items-center justify-center"
                  >
                    <Heart
                      size={18}
                      className={`transition-all duration-200 ${
                        inWishlist
                          ? "fill-red-500 text-red-500"
                          : "text-[#181C1F]"
                      }`}
                    />
                  </button>

                  <button
                    onClick={handleShare}
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
                      className="w-full h-full object-fill"
                    />
                  </button>
                ))}
              </div>

              {/* Stats */}
              <div className="mt-4 border border-[#E2E8F0] rounded-xl px-3 bg-[#FFFFFF] py-3 flex flex-wrap items-center justify-between gap-3 text-[13px] md:text-sm text-[#6B7280]">
                <div className="flex items-center gap-2 text-[#475569] font-medium">
                  <Eye size={16} className="text-[#2563EB]" />

                  <span>{product?.views_count || 0} views</span>
                </div>

                <div className="flex items-center gap-2 text-[#475569] font-medium">
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
            <div className="bg-white shadow-sm rounded-xl border border-[#E2E8F0] p-5 md:p-6">
              <h2 className="text-[24px] md:text-[28px] xl:text-xl font-bold text-[#0F172A] mb-5">
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
                  <div key={index} className="flex items-start justify-between">
                    <div className="flex items-center gap-3 text-[#6B7280]">
                      <div className="flex items-center justify-center">
                        {item.icon}
                      </div>

                      <span className="text-base text-[#64748B]">
                        {item.label}
                      </span>
                    </div>

                    <span className="capitalize max-w-[180px] text-start text-base font-medium text-[#0F172A]">
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
            <div className="bg-white rounded-xl border border-[#C9D1DC] p-5 md:p-7 xl:px-7 xl:py-5">
              {/* Tags */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="bg-[#E9F9EE] text-[#319F43] text-sm font-medium px-4 py-1 rounded-full">
                  Available
                </div>

                <div className="bg-[#2E40DC] text-[#CFD5FF] text-sm font-medium px-4 py-1 rounded-full capitalize">
                  {product?.category?.replaceAll("_", " ")}
                </div>
              </div>

              {/* Title */}
              <h1 className="mt-4 md:mt-5 text-[28px] sm:text-[34px] md:text-[38px] xl:text-4xl leading-[1.1] tracking-[-1px] font-bold text-[#0F172A]">
                {product?.title}
              </h1>

              {/* Price */}
              <div className="mt-4 flex flex-wrap items-center gap-4">
                <div className="text-[#3838EC] flex items-center">
                  <span className="text-[30px] sm:text-[36px] md:text-[42px] xl:text-3xl font-extrabold leading-none">
                    ₹{product?.selling_price}
                  </span>
                </div>

                {product?.original_price && (
                  <span className="line-through text-[#94A3B8] text-xl md:text-2xl xl:text-xl font-medium">
                    ₹{product?.original_price}
                  </span>
                )}

                <div className="bg-[#EEF0FF] text-[#3838EC] text-xs font-semibold px-3 py-1 rounded-md">
                  Save {savedPricedPercentage}%
                </div>
              </div>

              {/* Seller */}
              <div className="mt-5 flex flex-wrap items-center gap-5">
                <div className="flex items-center gap-3">
                  <img
                    src={product.seller_id?.avatar || FALLBACK_IMAGE}
                    alt="seller"
                    className="w-9 h-9 rounded-full object-cover"
                  />

                  <span className="font-semibold text-[#181C1F]">
                    {product?.seller_id?.name}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[#181C1F] text-sm">
                  <Clock3 size={16} />

                  <span> Listed {getRelativeTime(product?.createdAt)}</span>
                </div>
              </div>

              {/* About */}
              <div className="mt-9">
                <h2 className="text-[26px] md:text-xl font-bold text-[#181C1F]">
                  About This Product
                </h2>

                <p className="max-w-[820px] mt-3 text-[#454655] text-[14px] sm:text-[15px] md:text-base leading-[1.9] whitespace-pre-line">
                  {product?.description}
                </p>
              </div>

              {/* CTA */}
              <Link
                to={`/chat?seller=${product?.seller_id?._id}`}
                className="mt-10 h-[55px] rounded-2xl bg-gradient-to-r from-[#2E3FDC] to-[#4B5CF5] flex items-center justify-center gap-3 text-white font-semibold text-base tracking-wider"
              >
                <LuMessageSquareText size={20} />
                Chat with Seller
              </Link>
            </div>

            {/* Pickup & Safety */}
            <div className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-5 md:p-7 xl:px-7 xl:py-5">
              <h2 className="text-[26px] md:text-xl font-bold text-[#111827] mb-7">
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
                    <p className="text-[#64748B] text-sm">Campus Location</p>

                    <h4 className="mt-1 font-semibold text-[#0F172A] text-base">
                      VIT Vellore
                    </h4>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="w-11 h-11 rounded-full bg-[#F3F4FF] flex items-center justify-center">
                    <MdLocationPin size={22} className="text-[#3838EC]" />
                  </div>

                  <div>
                    <p className="text-[#64748B] text-sm">Meetup Point</p>

                    <h4 className="mt-1 font-semibold text-[#0F172A] text-base">
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
              <div className="mt-7 rounded-2xl bg-[#F5F6FF] border border-[#F1F5F9] p-5 flex gap-4">
                <div className="w-11 h-11 rounded-full bg-white flex items-center justify-center">
                  <ShieldCheck size={22} className="text-[#3838EC]" />
                </div>

                <div>
                  <h4 className="font-semibold text-[#3838EC] text-lg">
                    Safe campus-only exchange
                  </h4>

                  <p className="mt-1 text-[#666] leading-7">
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
            <h2 className="text-[26px] md:text-xl font-bold text-[#0F172A]">
              You might also like
            </h2>

            <button className="text-[#2563EB] text-sm md:text-base font-semibold whitespace-nowrap capitalize flex items-center gap-2">
              Browse all {product?.category?.replaceAll("_", " ")}{" "}
              <FaArrowRight />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4 md:gap-5">
            {[1, 2, 3, 4, 5].map((item) => (
              <div
                key={item}
                className="bg-white rounded-[20px] border border-[#ECECEC] overflow-hidden hover:-translate-y-1 transition-all duration-200"
              >
                <div className="relative">
                  <img
                    src="/image10.png"
                    alt=""
                    className="w-full aspect-square object-cover"
                  />

                  <button className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white shadow-md flex items-center justify-center">
                    <Heart size={16} />
                  </button>
                </div>

                <div className="p-4">
                  <h3 className="line-clamp-2 font-semibold text-[15px] text-[#111827]">
                    Dell XPS 15 Laptop
                  </h3>

                  <p className="mt-2 text-[#4F46E5] text-xl font-bold">
                    ₹1,15,000
                  </p>

                  <div className="mt-2 flex items-center gap-1 text-[#777] text-sm">
                    <MapPin size={14} />

                    <span>Main Canteen</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default ProductDescription;
