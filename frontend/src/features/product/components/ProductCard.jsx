import {
  memo,
  forwardRef,
  useState,
  useEffect,
  useCallback,
  useMemo,
} from "react";
import { Link } from "react-router-dom";
import { FaStar } from "react-icons/fa";
import { MdOutlineCurrencyRupee } from "react-icons/md";
import { FaHeart, FaRegHeart } from "react-icons/fa";
import { useWishlist } from "../../../context/useWishlist.js";
import toast from "react-hot-toast";
import { IoLocationOutline, IoEyeOutline } from "react-icons/io5";
import { BiMessageRounded } from "react-icons/bi";
const FALLBACK_IMAGE = "/image10.png";

const ProductCard = memo(
  forwardRef(
    ({ product, showRemoveButton = false, onRemove, onRemoveError }, ref) => {
      const { toggleWishlist, removeFromWishlist, checkProductInWishlist } =
        useWishlist();

      const [inWishlist, setInWishlist] = useState(false);
      const [loading, setLoading] = useState(false);

      const productId = product?._id;

      useEffect(() => {
        let isMounted = true;

        const checkWishlist = async () => {
          if (!productId) return;

          try {
            const inWish = await checkProductInWishlist(productId);

            if (isMounted) {
              setInWishlist(inWish);
            }
          } catch (error) {
            console.error("Wishlist check failed:", error);
          }
        };

        checkWishlist();

        return () => {
          isMounted = false;
        };
      }, [productId, checkProductInWishlist]);

      if (!product) {
        return null;
      }

     const {
       _id,
       title,
       images,
       category,
       selling_price,
       original_price,
       location,
       createdAt,
       seller_id,
       views_count,
       attributes = {},
     } = product;

     const { brand, color, usage_duration, purchase_date } = attributes;

      
     const formattedPurchaseDate = purchase_date
       ? new Date(purchase_date).toLocaleDateString("en-IN", {
           day: "numeric",
           month: "short",
           year: "numeric",
         })
       : null;
      
      
            const isBoosted =
        product.is_boosted &&
        (!product.boost_expires_at ||
          new Date(product.boost_expires_at) > new Date());

      const imageUrl = useMemo(
        () => (images?.length ? images[0] : FALLBACK_IMAGE),
        [images],
      );

      const discount = useMemo(
        () =>
          original_price && original_price > selling_price
            ? original_price - selling_price
            : 0,
        [original_price, selling_price],
      );

      const discountPercentage = useMemo(
        () =>
          original_price && original_price > selling_price
            ? Math.round(
                ((original_price - selling_price) / original_price) * 100,
              )
            : 0,
        [original_price, selling_price],
      );

      const handleClick = useCallback(() => {
        window.scrollTo({
          top: 0,
          behavior: "smooth",
        });
      }, []);

      const handleWishlistClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        if (loading || !_id) return;

        setLoading(true);

        try {
          const result = await toggleWishlist(_id, product);

          setInWishlist(result);

          toast.success(
            result ? "Added to Wishlist" : "Removed from Wishlist",
            {
              id: "wishlist-toast",
            },
          );
        } catch (error) {
          toast.error("Failed to update wishlist", {
            id: "wishlist-error",
          });

          console.error("Wishlist error:", error);
        } finally {
          setLoading(false);
        }
      };

      const getRelativeTime = (date) => {
        if (!date) return "";

        const now = new Date();
        const created = new Date(date);

        const diffInSeconds = Math.floor((now - created) / 1000);

        const minutes = Math.floor(diffInSeconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);

        if (days > 0) {
          return `${days}d ago`;
        }

        if (hours > 0) {
          return `${hours}h ago`;
        }

        if (minutes > 0) {
          return `${minutes}m ago`;
        }

        return "Just now";
      };

      const handleRemoveClick = async (e) => {
        e.preventDefault();
        e.stopPropagation();

        setInWishlist(false);

        onRemove?.(_id);

        toast.success("Removed from Wishlist", {
          id: "wishlist-remove",
        });

        try {
          await removeFromWishlist(_id);
        } catch (error) {
          setInWishlist(true);

          onRemoveError?.(_id);

          toast.error("Failed to remove from wishlist", {
            id: "wishlist-error",
          });

          console.error("Remove error:", error);
        }
      };

      const usageLabel = {
        less_than_one_month: "Like New",
        one_to_three_months: "1-3 Months Used",
        three_to_six_months: "3-6 Months Used",
        six_to_twelve_months: "6-12 Months Used",
        more_than_one_year: "1+ Year Used",
      };

   return (
     <Link
       ref={ref}
       to={`/product/${_id}`}
       onClick={handleClick}
       className="
      group
      bg-white
      dark:bg-[#18181B]
      rounded-[24px]
      overflow-hidden
      border
      border-zinc-200
      dark:border-zinc-800
      shadow-sm
      hover:shadow-2xl
      hover:-translate-y-1
      transition-all
      duration-300
      lg:w-[28vw]
      xl:w-[21vw]
      md:w-[29vw]
      w-[44.7vw]
    "
     >
       {/* IMAGE */}
       <div className="relative h-[220px] md:h-[250px] overflow-hidden">
         <img
           src={imageUrl}
           alt={title}
           onError={(e) => {
             e.currentTarget.src = FALLBACK_IMAGE;
           }}
           className="
          w-full
          h-full
          object-cover
          transition-transform
          duration-700
          group-hover:scale-105
        "
         />

         <div className="absolute inset-0 bg-gradient-to-t from-black/30 via-transparent to-transparent" />

         {discountPercentage > 0 && (
           <div
             className="
            absolute
            top-3
            left-3
            bg-emerald-500
            text-white
            text-xs
            font-bold
            px-3
            py-1.5
            rounded-full
          "
           >
             {discountPercentage}% OFF
           </div>
         )}

         {usage_duration && (
           <div
             className="
            absolute
            bottom-3
            left-3
            bg-white/95
            backdrop-blur-md
            px-3
            py-1.5
            rounded-full
            text-xs
            font-semibold
            text-zinc-800
          "
           >
             {usageLabel[usage_duration]}
           </div>
         )}

         <button
           onClick={showRemoveButton ? handleRemoveClick : handleWishlistClick}
           disabled={loading}
           className="
          absolute
          top-3
          right-3
          h-11
          w-11
          rounded-full
          bg-white/95
          backdrop-blur-md
          flex
          items-center
          justify-center
          shadow-lg
        "
         >
           {inWishlist ? (
             <FaHeart className="text-pink-500" />
           ) : (
             <FaRegHeart className="text-zinc-500" />
           )}
         </button>
       </div>

            {isBoosted && (
              <div className="absolute left-4 top-4 md:left-6 md:top-6 rounded bg-amber-400 px-2 py-1 text-[10px] md:text-xs font-bold uppercase tracking-wide text-amber-950 shadow-sm">
                Boosted
              </div>
            )}

       {/* CONTENT */}
       <div className="p-4">
         {/* CATEGORY */}
         <div
           className="
          inline-flex
          px-2.5
          py-1
          rounded-full
          bg-indigo-50
          dark:bg-indigo-950/30
          text-[10px]
          font-semibold
          uppercase
          tracking-wider
          text-indigo-600
        "
         >
           {category?.replaceAll("_", " ")}
         </div>

         {/* TITLE */}
         <h3
           className="
          mt-3
          text-[17px]
          md:text-[18px]
          font-bold
          text-zinc-900
          dark:text-white
          line-clamp-2
          min-h-[48px]
        "
         >
           {title}
         </h3>

         {/* PRICE */}
         <div>
           <div className="flex items-end gap-2">
             <span
               className="
              text-2xl
              font-semibold
              text-zinc-900
              dark:text-white
            "
             >
               ₹{Number(selling_price).toLocaleString()}
             </span>
           </div>

         </div>

         {/* FOOTER */}
         <div
           className="
          mt-4
          pt-4
          border-t
          border-zinc-200
          dark:border-zinc-800
        "
         >
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-2">
               <div
                 className="
                h-8
                w-8
                rounded-full
                bg-gradient-to-r
                from-indigo-500
                to-purple-500
                flex
                items-center
                justify-center
                text-white
                text-xs
                font-bold
              "
               >
                 {seller_id?.name?.charAt(0)?.toUpperCase() || "U"}
               </div>

               <div>
                 <p
                   className="
                  text-xs
                  font-semibold
                  text-zinc-900
                  dark:text-white
                "
                 >
                   {seller_id?.name || "Seller"}
                 </p>

                 <p className="text-[11px] text-zinc-500">
                   {getRelativeTime(createdAt)}
                 </p>
               </div>
             </div>

             <div className="flex items-center gap-1 text-zinc-500">
               <IoEyeOutline size={15} />
               <span className="text-xs">{views_count || 0}</span>
             </div>
           </div>

           {location && (
             <div className="flex items-center gap-1 mt-3 text-zinc-500">
               <IoLocationOutline size={15} />
               <span className="text-xs truncate">{location}</span>
             </div>
           )}
         </div>
       </div>
     </Link>
   );
    },
  ),
);

ProductCard.displayName = "ProductCard";

export default ProductCard;
