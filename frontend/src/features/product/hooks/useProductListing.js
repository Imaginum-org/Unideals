import { useProductListingContext } from "../context/ProductListingContext";

const useProductListing = () => {
  return useProductListingContext();
};

export default useProductListing;
