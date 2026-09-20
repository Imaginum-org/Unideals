import Profile_left_part from "../components/Profile_left_part.jsx";
import ProductCard from "../../product/components/ProductCard.jsx";
import BrandLoader from "../../../Components/ui/BrandLoader.jsx";
import { useEffect } from "react";
import { useWishlist } from "../../../context/WishlistContext";

function Wishlist() {
  // Single source of truth: the shared wishlist context (freshly fetched
  // on mount). No local copy, so the count here can never drift from the
  // Subscription tab, which reads the same server data.
  const { wishlist, loading, fetchWishlist, setWishlist } = useWishlist();

  useEffect(() => {
    fetchWishlist();
  }, [fetchWishlist]);

  const getId = (product) =>
    typeof product === "string" ? product : product?._id;

  const visibleItems = (wishlist || []).filter(
    (product) => getId(product) && typeof product !== "string",
  );

  const handleRemoveFromView = (productId) => {
    setWishlist((currentWishlist) =>
      (currentWishlist || []).filter((product) => getId(product) !== productId),
    );
  };

  const handleRestoreView = () => {
    // Restore from the server, not from possibly stale local state.
    fetchWishlist();
  };

  return (
    <>
      <div className="w-full h-full overflow-hidden dark:bg-[#131313] bg-[#F7F9FD] font-figtree">
        <div className="flex h-[calc(100vh-70px)] ">
          {/* LEFT PANEL */}
          <div className="hidden md:block md:w-auto md:shrink-0 bg-[#FFFFFF] dark:bg-[#131313] xl:pt-2  xl:pb-0   ">
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
              ) : visibleItems && visibleItems.length > 0 ? (
                <div className="w-full grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-x-5 2xl:gap-x-4 gap-y-7 dark:bg-[#131313]">
                  {visibleItems.map((product) => {
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
              ) : (
                <div className="flex flex-col justify-center items-center h-64">
                  <p className="text-zinc-500 dark:text-zinc-400 text-lg">
                    Your wishlist is empty
                  </p>
                  <p className="text-zinc-400 dark:text-zinc-500 text-sm mt-2">
                    Add products to your wishlist to see them here
                  </p>
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
