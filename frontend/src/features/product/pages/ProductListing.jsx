import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ProductListingProvider } from "../context/ProductListingContext";
import ListingLayout from "../components/listing/ListingLayout";
import { getProductById } from "../api/productApi";
import BrandLoader from "../../../Components/ui/BrandLoader.jsx";
import { useProductListingContext } from "../context/ProductListingContext";
import toast from "react-hot-toast";

// Inner wrapper that has access to context (so it can call initEditMode).
const EditModeInitializer = ({ productId, onReady }) => {
  const { initEditMode } = useProductListingContext();
  const [loading, setLoading] = useState(Boolean(productId));

  useEffect(() => {
    if (!productId) {
      onReady();
      return;
    }

    let cancelled = false;

    (async () => {
      try {
        const res = await getProductById(productId);
        const product =
          res.data?.data || res.data?.product || res.data;
        if (!cancelled && product?._id) {
          initEditMode(product);
        } else if (!cancelled) {
          toast.error("Could not load product for editing.");
        }
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
  }, [productId, initEditMode, onReady]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FAFAFA] dark:bg-[#131313]">
        <BrandLoader size="lg" label="Loading product…" />
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
