import { useEffect, useMemo, useState } from "react";
import ProductCard from "../../product/components/ProductCard.jsx";
import { Link } from "react-router-dom";
import { AccountLayout, ErrorState, btnSecondary } from "../components/account/AccountKit.jsx";
import { ProductGridSkeleton } from "../../product/components/browse/BrowseKit.jsx";
import { useWishlist } from "../../../context/WishlistContext";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { Compass } from "lucide-react";

const PAGE_SIZE = 20;

function Wishlist() {
  // Single source of truth: the shared wishlist context (freshly fetched
  // on mount). No local copy, so the count here can never drift from the
  // Subscription tab, which reads the same server data.
  const { wishlist, loading, fetchWishlist, setWishlist } = useWishlist();
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

  const count = visibleItems?.length || 0;

  return (
    <AccountLayout
      seoTitle="Wishlist | Unideals"
      width="xl"
      title="Wishlist"
      description={count ? `${count} saved · price-drop alerts on` : undefined}
      actions={
        count > 0 ? (
          <Link to="/explore" className={btnSecondary}>
            <Compass className="h-4 w-4" aria-hidden="true" />
            Discover more
          </Link>
        ) : null
      }
    >
      {loading && count === 0 ? (
        <ProductGridSkeleton count={6} className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:gap-5" />
      ) : loadError ? (
        <ErrorState message={loadError} onRetry={handleRetry} />
      ) : count > 0 ? (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3 xl:gap-5">
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
          {visibleCount < count && (
            <div className="mt-8 text-center">
              <button type="button" onClick={() => setVisibleCount((c) => c + PAGE_SIZE)} className={btnSecondary}>
                Show more ({count - visibleCount})
              </button>
            </div>
          )}
        </>
      ) : (
        <EmptyState
          variant="wishlist"
          title="Your wishlist is empty"
          description="Tap the heart on anything you're eyeing to save it here. We'll let you know when it drops in price."
          primaryAction={{ label: "Discover listings", to: "/explore", icon: Compass }}
        />
      )}
    </AccountLayout>
  );
}

export default Wishlist;
