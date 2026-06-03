import Profile_left_part from "../../../features/user/components/Profile_left_part.jsx";
import OrderCard from "../../../features/user/components/OrderCard.jsx";
import { useState, useMemo, useEffect } from "react";
import { getUserProducts } from "../api/productApi.js";
import toast from "react-hot-toast";
import Loader from "../../../Components/ui/Loader.jsx";
import { FiPlus, FiEye, FiHeart, FiMessageSquare } from "react-icons/fi";

// Custom Tabs matching the new screenshot
const tabs = ["All", "Active", "Unlisted", "Sold"];

function ProductListed() {
  const [activeTab, setActiveTab] = useState("All");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchUserProducts();
  }, []);

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

  return (
    <div className="w-full h-screen overflow-hidden dark:bg-[#131313] bg-[#F7F9FD] font-figtree">
      <div className="flex h-[calc(100vh-70px)] ">
        {/* LEFT PANEL */}
        <div className="hidden md:block md:w-[37%] lg:w-[28%] xl:w-[20.5%] 2xl:w-[20.5%] bg-[#FFFFFF] dark:bg-[#131313] xl:pt-2  xl:pb-0   ">
          <Profile_left_part />
        </div>

        {/* RIGHT PANEL */}
        <div className="h-full md:w-[63%] lg:w-[72%] xl:w-[79.5%] 2xl:w-[79.5%] overflow-y-auto no-scrollbar bg-[#F7F9FD] dark:bg-[#131313] p-6 lg:p-8 xl:px-[5.7rem] xl:py-6">
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
              <button className="bg-[#3838EC] hover:bg-blue-700 text-white px-3 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium transition-colors shadow-sm shadow-blue-500/20">
                <FiPlus size={18} />
                List New Product
              </button>
              </div>
            </div>

            {/* 2. Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
              <div className="bg-white dark:bg-[#1c1c1c] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="text-gray-400 dark:text-gray-500">
                  <FiEye size={20} />
                </div>
                <div>
                  <div className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    1,380
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Impressions
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1c1c1c] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="text-gray-400 dark:text-gray-500">
                  <FiHeart size={20} />
                </div>
                <div>
                  <div className="text-base font-bold text-gray-900 dark:text-white leading-tight">
                    62
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Saves
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-[#1c1c1c] border border-gray-100 dark:border-gray-800 rounded-2xl p-4 flex items-center gap-4 shadow-sm">
                <div className="text-gray-400 dark:text-gray-500">
                  <FiMessageSquare size={20} />
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
                    onProductDeleted={handleProductDeleted}
                    onProductUnlisted={handleProductUnlisted}
                    onProductRelisted={handleProductRelisted}
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
