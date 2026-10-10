import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import Profile_left_part from "../components/Profile_left_part.jsx";
import ProductCard from "../../product/components/ProductCard.jsx";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import Seo from "../../../components/Seo.jsx";
import { useWishlist } from "../../../context/WishlistContext";

const PAGE_SIZE = 20;

function Wishlist() {
  // Single source of truth: the shared wishlist context (freshly fetched
  // on mount). No local copy, so the count here can never drift from the
  // Subscription tab, which reads the same server data.
  const { wishlist, loading, fetchWishlist, setWishlist } = useWishlist();
  const navigate = useNavigate();
  const [loadError, setLoadError] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await fetchWishlist();
        if (!cancelled) setLoadError("");
      } catch (err) {
        if (!cancelled) {
          setLoadError(
            err?.response?.data?.message || "Failed to load your wishlist",
          );
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchWishlist]);

  const getId = (product) =>
    typeof product === "string" ? product : product?._id;

  // Dedup by id (server + optimistic entries can repeat during refetch).
  const visibleItems = useMemo(() => {
    const seen = new Set();
    return (wishlist || []).filter((product) => {
      const id = getId(product);
      if (!id || typeof product === "string") return false;
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }, [wishlist]);

  const pagedItems = useMemo(
    () => visibleItems.slice(0, visibleCount),
    [visibleItems, visibleCount],
  );

  const handleRemoveFromView = (productId) => {
    setWishlist((currentWishlist) =>
      (currentWishlist || []).filter((product) => getId(product) !== productId),
    );
  };

  const handleRestoreView = () => {
    // Restore from the server, not from possibly stale local state.
    fetchWishlist().catch(() => {});
  };

  const handleRetry = async () => {
    try {
      await fetchWishlist();
      setLoadError("");
    } catch (err) {
      setLoadError(
        err?.response?.data?.message || "Failed to load your wishlist",
      );
    }
  };

  return (
    <>
      <Seo title="Wishlist — Unideals" robots="noindex,nofollow" />
      <div className="w-full h-full overflow-hidden dark:bg-[#131313] bg-[#F7F9FD] font-figtree">
        <div className="flex h-[calc(100vh-70px)] ">
          {/* LEFT PANEL */}
          <div className="hidden md:block md:w-auto md:shrink-0 bg-[#F7F8FA] dark:bg-[#131313] xl:pt-2  xl:pb-0   ">
            <Profile_left_part />
          </div>

          <div className="h-full md:flex-1 overflow-y-auto no-scrollbar bg-[#F7F9FD] dark:bg-[#131313] p-6 lg:p-8 xl:px-[5.7rem] xl:py-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-[1.4rem] lg:text-2xl font-bold text-gray-900 dark:text-white mb-1 xl:text-xl">
                    Wishlist
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {visibleItems?.length || 0} saved item
                    {visibleItems?.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-64">
                  <BrandLoader size="md" />
                </div>
              ) : loadError ? (
                <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-gray-100 bg-[#F7F8FA] p-10 text-center dark:border-gray-800 dark:bg-[#1c1c1c]">
                  <p className="text-sm font-medium text-red-500">{loadError}</p>
                  <button
                    onClick={handleRetry}
                    className="rounded-xl bg-[#3838EC] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2f2fd9]"
                  >
                    Retry
                  </button>
                </div>
              ) : visibleItems && visibleItems.length > 0 ? (
                <>
                  <div className="w-full grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-x-5 2xl:gap-x-4 gap-y-7 dark:bg-[#131313]">
                    {pagedItems.map((product) => {
                      const id = getId(product);
                      return (
                        <ProductCard
                          key={id}
                          product={product}
                          showRemoveButton={true}
                          onRemove={handleRemoveFromView}
                          onRemoveError={handleRestoreView}
                        />
                      );
                    })}
                  </div>
                  {visibleCount < visibleItems.length && (
                    <div className="mt-8 text-center">
                      <button
                        onClick={() =>
                          setVisibleCount((c) => c + PAGE_SIZE)
                        }
                        className="rounded-xl border border-[#3838EC] px-6 py-2.5 text-sm font-semibold text-[#3838EC] transition hover:bg-[#EEF0FF]"
                      >
                        Load more ({visibleItems.length - visibleCount} more)
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col justify-center items-center h-64 gap-2">
                  <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                    Your wishlist is empty
                  </p>
                  <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-2">
                    Save products you love and find them here
                  </p>
                  <button
                    onClick={() => navigate("/")}
                    className="mt-4 rounded-xl bg-[#3838EC] px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-[#2f2fd9]"
                  >
                    Discover products
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Wishlist;
