import Profile_left_part from "../components/Profile_left_part.jsx";
import ProductCard from "../../product/components/ProductCard.jsx";
import { useState, useEffect } from "react";
import toast from "react-hot-toast";
import { useWishlist } from "../../../context/useWishlist.js";

function Wishlist() {
  const { wishlist, fetchWishlist } = useWishlist();
  const [visibleWishlist, setVisibleWishlist] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadWishlist = async () => {
      try {
        setIsLoading(true);
        await fetchWishlist();
      } catch (error) {
        console.error("Error loading wishlist:", error);
        toast.error("Failed to load wishlist");
      } finally {
        setIsLoading(false);
      }
    };

    loadWishlist();
  }, [fetchWishlist]);

  useEffect(() => {
    setVisibleWishlist(wishlist || []);
  }, [wishlist]);

  const handleRemoveFromView = (productId) => {
    setVisibleWishlist((currentWishlist) =>
      currentWishlist.filter((product) => product._id !== productId),
    );
  };

  const handleRestoreView = () => {
    setVisibleWishlist(wishlist || []);
  };

  return (
    <>
      <div className="w-full h-screen overflow-hidden dark:bg-[#131313] bg-[#F7F9FD] font-figtree">
        <div className="flex h-[calc(100vh-70px)] ">
          {/* LEFT PANEL */}
          <div className="hidden md:block md:w-[22.5%] lg:w-[21%] xl:w-[20.5%] 2xl:w-[20.5%] bg-[#FFFFFF] dark:bg-[#131313] xl:pt-2  xl:pb-0   ">
            <Profile_left_part />
          </div>

          <div className="h-full md:w-[77.5%] lg:w-[79%] xl:w-[79.5%] 2xl:w-[79.5%] overflow-y-auto no-scrollbar bg-[#F7F9FD] dark:bg-[#131313] p-6 lg:p-8 xl:px-[5.7rem] xl:py-6">
            <div className="max-w-4xl mx-auto">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-[1.4rem] lg:text-2xl font-bold text-gray-900 dark:text-white mb-1 xl:text-xl">
                    Wishlist
                  </h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    {visibleWishlist?.length || 0} saved item
                    {visibleWishlist?.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : visibleWishlist && visibleWishlist.length > 0 ? (
                <div className="w-full grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-x-5 2xl:gap-x-12  gap-y-7 dark:bg-[#131313]">
                  {visibleWishlist.map((product) => (
                    <ProductCard
                      key={product._id}
                      product={product}
                      showRemoveButton={true}
                      onRemove={handleRemoveFromView}
                      onRemoveError={handleRestoreView}
                    />
                  ))}
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
