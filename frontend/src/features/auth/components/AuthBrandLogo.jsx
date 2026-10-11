import { Link } from "react-router-dom";
import Wordmark from "../../../components/ui/Wordmark.jsx";

// Same animated wordmark as the navbar, reversed (logo mark at rest, U on
// hover), with metrics matched per breakpoint: 17/500 on mobile, 21/700 on
// sm and up — exactly the two navbar sizes. Shared by every auth screen.
function AuthBrandLogo() {
  return (
    <Link
      to="/"
      aria-label="Unideals home"
      className="inline-flex items-center font-figtree"
    >
      <span className="sm:hidden">
        <Wordmark
          fontSize={17}
          fontWeight={500}
          letterSpacing={0}
          reversed
          className="text-white md:text-[#012436] dark:md:text-white"
        />
      </span>
      <span className="hidden sm:block">
        <Wordmark
          fontSize={21}
          fontWeight={700}
          letterSpacing={-0.5}
          reversed
          className="text-white md:text-[#012436] dark:md:text-white"
        />
      </span>
    </Link>
  );
}

export default AuthBrandLogo;
