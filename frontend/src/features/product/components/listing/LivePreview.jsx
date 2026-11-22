import { useMemo } from "react";
import { Eye } from "lucide-react";
import useProductListing from "../../hooks/useProductListing";
import ProductCard from "../ProductCard.jsx";
import { CARD } from "./ListingKit.jsx";
import { cn } from "../../../../utils/cn.js";

/**
 * Buyer preview: the real feed ProductCard in `preview` mode, fed from the
 * form as the seller types. Preview mode shows a "Cover photo" placeholder
 * until a photo is added and leaves out the seller/location footer.
 * Display-only: inert, so it can't be clicked, focused or wishlisted.
 */
export default function LivePreview({ className }) {
  const { formData } = useProductListing();

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
    };
  }, [
    formData.imagePreviews,
    formData.title,
    formData.category,
    formData.sellingPrice,
    formData.originalPrice,
    formData.isGirlsOnly,
  ]);

  return (
    <section className={cn(CARD, "p-3", className)} aria-label="Buyer preview">
      <p className="mb-2 flex items-center gap-1.5 px-1 text-[12px] font-semibold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
        <Eye className="h-3.5 w-3.5" aria-hidden="true" />
        Buyer preview
      </p>
      {/* inert: the card's link does nothing here. */}
      <div inert="" aria-hidden="true" className="pointer-events-none select-none">
        <ProductCard product={product} preview />
      </div>
    </section>
  );
}
