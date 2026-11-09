import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ProductListingProvider } from "../context/ProductListingContext";
import ListingLayout from "../components/listing/ListingLayout";
import { getProductById } from "../api/productApi";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import { useProductListingContext } from "../context/ProductListingContext";
import { toast } from "../../../components/ui/toast.js";
import { productPath } from "../../../utils/productPath.js";

// Inner wrapper that has access to context (so it can call initEditMode).
const EditModeInitializer = ({ productId, onReady }) => {
  const { initEditMode } = useProductListingContext();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(Boolean(productId));

  useEffect(() => {
    if (!productId) {
      onReady();
      return;
    }

    let cancelled = false;

    const currentUserId = () => {
      try {
        const cached = localStorage.getItem("cachedUserDetails");
        return cached ? JSON.parse(cached)?._id : null;
      } catch {
        return null;
      }
    };

    (async () => {
      try {
        // view=edit: the owner's form skips buyer-page extras server-side.
        const res = await getProductById(productId, { view: "edit" }, { fresh: true });
        const product =
          res.data?.data || res.data?.product || res.data;
        if (cancelled) return;
        if (!product?._id) {
          toast.error("Could not load product for editing.");
          navigate(productPath(productId), { replace: true });
          return;
        }
        // Ownership guard: never leak another seller's listing into the form.
        const sellerId =
          typeof product.seller_id === "object"
            ? product.seller_id?._id
            : product.seller_id;
        const me = currentUserId();
        if (me && sellerId && String(sellerId) !== String(me)) {
          toast.error("You can only edit your own listing.");
          navigate(productPath(productId), { replace: true });
          return;
        }
        initEditMode(product);
      } catch {
        if (!cancelled) toast.error("Failed to load product.");
      } finally {
        if (!cancelled) {
          setLoading(false);
          onReady();
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [productId, initEditMode, onReady, navigate]);

  if (loading) {
    return (
      <div className="min-h-[calc(100dvh-var(--header-h)-var(--tabbar-h))] w-full bg-[#F7F9FD] dark:bg-[#131313]">
        <BrandLoader size="full" label="Loading product…" />
      </div>
    );
  }

  return null;
};

const ProductListing = () => {
  const { productId } = useParams();
  const [ready, setReady] = useState(!productId); // immediately ready when no edit

  return (
    <ProductListingProvider>
      {!ready && (
        <EditModeInitializer
          productId={productId}
          onReady={() => setReady(true)}
        />
      )}
      {ready && <ListingLayout />}
    </ProductListingProvider>
  );
};

export default ProductListing;
