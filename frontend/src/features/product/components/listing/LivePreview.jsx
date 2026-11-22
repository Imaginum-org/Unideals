import { useMemo } from "react";
import { Eye } from "lucide-react";
import useProductListing from "../../hooks/useProductListing";
import { useUser } from "../../../../context/useUserContext.jsx";
import ProductCard from "../ProductCard.jsx";
import { CARD } from "./ListingKit.jsx";
import { cn } from "../../../../utils/cn.js";

/**
 * Buyer preview: the real feed ProductCard, fed from the form as the seller
 * types, so it always looks exactly like what buyers will see (including
 * the seller's own name, avatar, plan badge, rating and verified tick).
 * Display-only: inert, so it can't be clicked, focused or wishlisted.
 */
export default function LivePreview({ className }) {
  const { formData } = useProductListing();
  const { userDetails } = useUser();

  const product = useMemo(() => {
    const cover = formData.imagePreviews?.[0]?.preview || formData.imagePreviews?.[0]?.url;
    return {
      _id: "listing-preview",
      title: String(formData.title || "").trim() || "Your listing title",
      images: cover ? [{ url: cover }] : [],
      category: formData.category || "",
      selling_price: Number(formData.sellingPrice || 0),
      original_price: Number(formData.originalPrice || 0),
      isGirlsOnly: Boolean(formData.isGirlsOnly),
      seller_id: {
        _id: userDetails?._id,
        name: userDetails?.name || "You",
        avatar: userDetails?.avatar,
        subscription: userDetails?.subscription,
        rating: userDetails?.rating,
        is_college_verified: userDetails?.is_college_verified,
      },
    };
  }, [
    formData.imagePreviews,
    formData.title,
    formData.category,
    formData.sellingPrice,
    formData.originalPrice,
    formData.isGirlsOnly,
    userDetails?._id,
    userDetails?.name,
    userDetails?.avatar,
    userDetails?.subscription,
    userDetails?.rating,
    userDetails?.is_college_verified,
  ]);

  return (
    <section className={cn(CARD, "p-4", className)} aria-label="Buyer preview">
      <p className="mb-3 flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        Buyer preview
      </p>
      {/* inert: the card's link, chat and wishlist buttons do nothing here. */}
      <div inert="" aria-hidden="true" className="pointer-events-none select-none">
        <ProductCard product={product} />
      </div>
      <p className="mt-2.5 text-center text-[11.5px] text-slate-400 dark:text-zinc-500">How your listing appears in the feed</p>
    </section>
  );
}
