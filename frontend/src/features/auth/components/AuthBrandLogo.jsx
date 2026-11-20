import { Link } from "react-router-dom";
import Wordmark from "../../../components/ui/Wordmark.jsx";

// Same animated wordmark as the navbar. Shared by every auth screen.
//
// - Phones (< md): sits on the indigo hero, so it stays a plain white
//   "Unideals" (the reversed variant rests on the indigo logo mark, which
//   would vanish against the gradient). 17/500 below sm, 21/700 from sm.
// - md and up: reversed (logo mark at rest, U on hover) on the light/dark
//   page background, 21/700 like the navbar.
function AuthBrandLogo() {
  return (
    <Link
      to="/"
      aria-label="Unideals home"
      className="inline-flex items-center rounded-md font-figtree focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 md:focus-visible:ring-[#393AF2]/45"
    >
      <span className="sm:hidden">
        <Wordmark fontSize={17} fontWeight={500} letterSpacing={0} className="text-white" />
      </span>
      <span className="hidden sm:block md:hidden">
        <Wordmark fontSize={21} fontWeight={700} letterSpacing={-0.5} className="text-white" />
      </span>
      <span className="hidden md:block">
        <Wordmark
          fontSize={21}
          fontWeight={700}
          letterSpacing={-0.5}
          reversed
          className="text-[#012436] dark:text-white"
        />
      </span>
    </Link>
  );
}

export default AuthBrandLogo;
