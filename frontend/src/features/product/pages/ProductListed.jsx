import Profile_left_part from "../../../features/user/components/Profile_left_part.jsx";
import OrderCard from "../../../features/user/components/OrderCard.jsx";
import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  boostProduct,
  getBoostSummary,
  getUserProducts,
} from "../api/productApi.js";
import toast from "react-hot-toast";
import Loader from "../../../Components/ui/Loader.jsx";
import { FiPlus } from "react-icons/fi";
import {
  EyeIcon,
  HeartIcon,
  MessageCircleIcon,
} from "@animateicons/react/lucide";
// Custom Tabs matching the new screenshot
const tabs = ["All", "Active", "Unlisted", "Sold"];

function ProductListed() {
  const [activeTab, setActiveTab] = useState("All");
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [boostSummary, setBoostSummary] = useState(null);

  useEffect(() => {
    fetchUserProducts();
    fetchBoostSummary();
  }, []);

  const totalImpressions = useMemo(
    () => products.reduce((sum, p) => sum + Number(p.views_count || 0), 0),
    [products],
  );

  const totalWishlisted = useMemo(
    () =>
      products.reduce(
        (sum, p) =>
          sum +
          Number(
            p.wishlist_count ?? p.wishlisted_count ?? p.wishlist?.length ?? 0,
          ),
        0,
      ),
    [products],
  );

  const fetchUserProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getUserProducts();
      if (res.data.success) {
        setProducts(res.data.data || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to fetch products");
      toast.error("Failed to load your products");
    } finally {
      setLoading(false);
    }
  };

  const fetchBoostSummary = async () => {
    try {
      const res = await getBoostSummary();
      if (res.data?.success) {
        setBoostSummary(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch boost summary", err);
    }
  };

  const filteredProducts = useMemo(() => {
    const tab = (activeTab || "All").toLowerCase().trim();
    if (tab === "all") return products;

    return products.filter((p) => {
      const productStatus = (p.status || "").toLowerCase().trim();
      // Map "Sold" tab to "Delivered" status based on typical backend flows
      if (
        tab === "sold" &&
        (productStatus === "delivered" || productStatus === "sold")
      )
        return true;
      if (
        tab === "active" &&
        (productStatus === "listed" || productStatus === "active")
      )
        return true;
      return productStatus === tab;
    });
  }, [activeTab, products]);

  const handleProductDeleted = (productId) => {
    setProducts((prev) => prev.filter((p) => p._id !== productId));
  };

  const handleProductUnlisted = (productId) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === productId ? { ...p, status: "UNLISTED" } : p)),
    );
  };

  const handleProductRelisted = (productId) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === productId ? { ...p, status: "LISTED" } : p)),
    );
  };

  const handleBoostProduct = async (productId) => {
    const res = await boostProduct(productId);
    const boostedProduct = res.data?.data?.product;

    if (res.data?.success && boostedProduct) {
      setProducts((prev) =>
        prev.map((p) => (p._id === productId ? { ...p, ...boostedProduct } : p)),
      );

      if (res.data?.data?.usage) {
        setBoostSummary((prev) => ({
          ...prev,
          ...res.data.data.usage,
        }));
      }
    }

    return res;
  };

  return (
    <div className="w-full h-screen overflow-hidden dark:bg-[#131313] bg-[#F7F9FD] font-figtree">
      <div className="flex h-[calc(100vh-70px)] ">
        {/* LEFT PANEL */}
        <div className="hidden md:block md:w-[22.5%] lg:w-[21%] xl:w-[20.5%] 2xl:w-[20.5%] bg-[#FFFFFF] dark:bg-[#131313] xl:pt-2  xl:pb-0   ">
          <Profile_left_part />
        </div>

        {/* RIGHT PANEL */}
        <div className="h-full md:w-[77.5%] lg:w-[79%] xl:w-[79.5%] 2xl:w-[79.5%] overflow-y-auto no-scrollbar bg-[#F7F9FD] dark:bg-[#131313] p-6 lg:p-8 xl:px-[5.7rem] xl:py-6">
          <div className="max-w-4xl mx-auto">
            {/* 1. Page Header */}
            <div className="flex justify-between items-start mb-4">
              <div>
                <h1 className="text-[1.4rem] lg:text-2xl font-bold text-gray-900 dark:text-white mb-1 xl:text-xl">
                  My Listings
                </h1>
                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                  {
                    products.filter(
                      (p) =>
                        p.status?.toLowerCase() === "listed" ||
                        p.status?.toLowerCase() === "active",
                    ).length
                  }{" "}
                  active · {products.length} total
                </p>
              </div>
              <div className="hidden md:block">
                <button
                  onClick={() => navigate("/upload")}
                  className="bg-[#3838EC] hover:bg-blue-700 text-white px-3 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors shadow-sm shadow-blue-500/20"
                >
                  <FiPlus size={18} />
                  List New Product
                </button>
              </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-3 gap-2 md:grid-cols-4 md:gap-5 mb-5">
              <div className="bg-white dark:bg-[#1c1c1c] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="text-gray-400 dark:text-gray-500">
                  <EyeIcon size={20} className="text-black" />
                </div>
                <div>
                  <div className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    {totalImpressions.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Impressions
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1c1c1c] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="text-gray-400 dark:text-gray-500">
                  <HeartIcon size={20} className="text-pink-600" />
                </div>
                <div>
                  <div className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    {totalWishlisted.toLocaleString()}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Saves
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1c1c1c] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="text-gray-400 dark:text-gray-500">
                  <MessageCircleIcon size={20} className="text-blue-600" />
                </div>
                <div>
                  <div className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    17
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Chats
                  </div>
                </div>
              </div>
              <div className="col-span-3 md:col-span-1 bg-white dark:bg-[#1c1c1c] border border-indigo-100 dark:border-indigo-900/50 rounded-2xl p-4 flex items-center justify-between md:block shadow-sm">
                <div>
                  <div className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    {boostSummary
                      ? `${boostSummary.monthlyRemaining}/${boostSummary.monthlyLimit}`
                      : "--"}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Boosts left
                  </div>
                </div>
                <div className="text-right md:text-left md:mt-2 text-[11px] font-medium text-indigo-600 dark:text-indigo-400">
                  {boostSummary
                    ? `${boostSummary.activeBoosts}/${boostSummary.maxActiveBoosts} active`
                    : "Plan quota"}
                </div>
              </div>
            </div>

            {/* 3. Tabs */}
            <div className="flex gap-2 mb-6">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-4 py-[0.45rem] rounded-xl text-sm font-medium transition-colors ${
                    activeTab === tab
                      ? "bg-[#1A1D20] text-white dark:bg-white dark:text-black shadow-md"
                      : "text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            {/* 4. Products List */}
            <div className="flex flex-col gap-5 pb-10">
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <Loader />
                </div>
              ) : error ? (
                <div className="py-8 text-center text-red-500 dark:text-red-400 bg-white dark:bg-[#1c1c1c] rounded-2xl border border-gray-100 dark:border-gray-800">
                  {error}
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-[#1c1c1c] rounded-2xl border border-gray-100 dark:border-gray-800">
                  No products found for "{activeTab}"
                </div>
              ) : (
                filteredProducts.map((p) => (
                  <OrderCard
                    key={p._id}
                    orderId={p._id}
                    placedOn={new Date(p.createdAt)
                      .toLocaleDateString("en-GB")
                      .replace(/\//g, "-")}
                    imageUrl={
                      p.images?.[0] ||
                      "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=150&q=80"
                    } // Fallback image
                    name={p.title}
                    color={p.attributes?.color || "N/A"}
                    attr={p.attributes?.usage_duration || "Wireless"}
                    status={p.status}
                    price={p.selling_price}
                    viewsCount={p.views_count || 0}
                    wishlistedCount={
                      p.wishlist_count ??
                      p.wishlisted_count ??
                      p.wishlist?.length ??
                      0
                    }
                    onProductDeleted={handleProductDeleted}
                    onProductUnlisted={handleProductUnlisted}
                    onProductRelisted={handleProductRelisted}
                    isBoosted={Boolean(p.is_boosted)}
                    boostExpiresAt={p.boost_expires_at}
                    boostTier={p.boost_tier}
                    onBoostProduct={handleBoostProduct}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductListed;
