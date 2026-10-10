import { useState, useMemo, useEffect } from "react";
import Profile_left_part from "../components/Profile_left_part.jsx";
import TabSwitcher from "../components/manageorderanime.jsx";
import MyOrdersCard from "../components/MyOrdersCard.jsx";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import { getUserProducts } from "../../product/api/productApi.js";
import toast from "react-hot-toast";

function Myorders() {
  const [activeTab, setActiveTab] = useState("All");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        setLoading(true);
        setLoadError("");
        const res = await getUserProducts();
        if (!cancelled) setProducts(res.data?.data || []);
      } catch (err) {
        if (!cancelled) {
          setLoadError(err?.response?.data?.message || "Failed to load your sales");
          toast.error("Failed to load your sales");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  const statusOf = (p) => (p.status || "listed").toLowerCase().trim();
  const isActive = (p) => ["listed", "active", "in progress"].includes(statusOf(p));
  const isSold = (p) => ["sold", "delivered"].includes(statusOf(p));
  const isUnlisted = (p) => statusOf(p) === "unlisted";

  // Compute counts for the tabs (real statuses)
  const tabCounts = useMemo(() => {
    return {
      All: products.length,
      Active: products.filter(isActive).length,
      Sold: products.filter(isSold).length,
      Unlisted: products.filter(isUnlisted).length,
    };
  }, [products]);

  const filteredOrders = useMemo(() => {
    const tab = (activeTab || "All").toLowerCase().trim();
    if (tab === "all") return products;
    if (tab === "active" || tab === "in progress") return products.filter(isActive);
    if (tab === "sold" || tab === "delivered") return products.filter(isSold);
    return products.filter((p) => statusOf(p) === tab);
  }, [activeTab, products]);

  const handleProductDeleted = (orderId) => {
    setProducts((prev) => prev.filter((p) => p._id !== orderId));
  };

  const handleProductUnlisted = (orderId) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === orderId ? { ...p, status: "unlisted" } : p)),
    );
  };

  const handleProductRelisted = (orderId) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === orderId ? { ...p, status: "listed" } : p)),
    );
  };

  return (
    <div className="w-full h-full overflow-hidden dark:bg-[#131313] bg-[#F7F9FD] font-figtree">
      <div className="flex h-[calc(100vh-70px)] ">
        {/* LEFT PANEL */}
        <div className="hidden md:block md:w-auto md:shrink-0 bg-[#F7F8FA] dark:bg-[#131313] xl:pt-2  xl:pb-0   ">
          <Profile_left_part />
        </div>

        {/* RIGHT PANEL */}
        <div className="h-full md:flex-1 overflow-y-auto no-scrollbar bg-[#F7F9FD] dark:bg-[#131313] p-6 lg:p-8 xl:px-[5.7rem] xl:py-6 ">
          <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="flex items-center gap-2 text-[1.2rem] lg:text-xl xl:text-xl font-bold text-gray-900 dark:text-white mb-1">
              <h1>My Sales</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Your listed, sold, and unlisted products
            </p>

            <div className="mb-4 rounded-2xl border border-indigo-100 bg-indigo-50/60 px-4 py-3 text-[13px] font-medium leading-6 text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300">
              Buyer orders coming soon — for now this is your sales history.
            </div>

            {/* Tabs */}
            <div className="mb-5">
              <TabSwitcher
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                counts={tabCounts}
              />
            </div>

            {/* Orders List */}
            <div className="flex flex-col gap-6 pb-10">
              {loading ? (
                <div className="flex justify-center py-12">
                  <BrandLoader size="md" />
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl border border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-red-500">{loadError}</p>
                  <button
                    onClick={() => window.location.reload()}
                    className="rounded-xl bg-[#3838EC] px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400 bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  No listings found for &quot;{activeTab}&quot;
                </div>
              ) : (
                filteredOrders.map((p) => (
                  <MyOrdersCard
                    key={p._id}
                    orderId={p._id}
                    placedOn={
                      p.createdAt
                        ? new Date(p.createdAt)
                            .toLocaleDateString("en-GB")
                            .replace(/\//g, "-")
                        : ""
                    }
                    imageUrl={
                      typeof p.images?.[0] === "string"
                        ? p.images[0]
                        : p.images?.[0]?.url || "/logo.svg"
                    }
                    name={p.title || "Untitled listing"}
                    color={p.attributes?.color || ""}
                    attr={p.attributes?.usage_duration?.replaceAll?.("_", " ") || ""}
                    status={p.status || "listed"}
                    price={p.selling_price}
                    isOwnListing
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

export default Myorders;
