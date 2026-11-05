import { ProductListingProvider } from "../context/ProductListingContext";

import ListingLayout from "../components/listing/ListingLayout";

const ProductListing = () => {
  return (
    <ProductListingProvider>
      <ListingLayout />
    </ProductListingProvider>
  );
};

export default ProductListing;
