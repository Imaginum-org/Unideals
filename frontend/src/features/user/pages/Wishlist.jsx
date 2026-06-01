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
      <div className="w-screen h-screen overflow-hidden dark:bg-[#131313]">
        <div className="flex h-[calc(100vh-70px)]">
          <div className="hidden md:block md:w-[37%] lg:w-[28%] xl:w-[25%] 2xl:w-[25%] bg-[#FFFFFF] dark:bg-[#131313] xl:pt-5  xl:pb-0 rounded-2xl lg:my-5 lg:ml-7">
            <Profile_left_part />
          </div>

          <div className="h-full md:w-[63%] lg:w-[72%] xl:w-[73.5%] overflow-y-auto no-scrollbar bg-[#FBFBFB] dark:bg-[#131313]">
            <div className="mx-[5.5vw] md:mx-[1.7vh] lg:mr-[3.2vw] lg:ml-[1.5vw]">
              <div
                className="justify-start text-zinc-800 lg:text-2xl dark:bg-[#131313] 
          font-['Poppins'] dark:text-[#D6D6D6] mb-[2vh] mt-[3vh]  
          lg:mt-[5.5vh] lg:mb-[2vh] text-[1.1rem] lg:font-medium"
              >
                Wishlist ({visibleWishlist?.length || 0})
              </div>

              {isLoading ? (
                <div className="flex justify-center items-center h-64">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
                </div>
              ) : visibleWishlist && visibleWishlist.length > 0 ? (
                <div
                  className="w-full grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3  
            gap-x-4 gap-y-7 dark:bg-[#131313]"
                >
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
