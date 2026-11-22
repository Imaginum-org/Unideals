import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import NotFound from "../../../components/NotFound.jsx";
import { useRentConfig } from "../hooks/useRentConfig.js";

/** Renders children only while Rent & Borrow is on for this campus; otherwise Not Found. */
export default function RentGate({ children }) {
  const rent = useRentConfig();
  if (rent.loading) return <BrandLoader size="full" />;
  if (!rent.enabled) return <NotFound />;
  return typeof children === "function" ? children(rent) : children;
}
