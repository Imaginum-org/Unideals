import { Link } from "react-router-dom";
import cmlogo from "/logo.svg";
import whitecmlogo from "/white_cm_logo_mobile.webp";

function AuthBrandLogo() {
  return (
    <Link
      to="/"
      className="inline-flex items-center gap-2.5 sm:gap-3 font-figtree text-xl font-semibold text-white md:gap-1.5 md:text-sm md:text-[#012436] dark:md:text-white lg:gap-2 lg:text-sm xl:gap-0 xl:text-base 2xl:gap-0 2xl:text-lg"
    >
      <img
        src={cmlogo}
        className="h-10 w-10 object-cover mb-1 hidden md:block"
        alt="image"
      />
      <img
        src={whitecmlogo}
        className="mb-1 block h-7 w-6  size-5 md:hidden sm:h-7.5 sm:w-6"
        alt="image"
      />
      <span className="text-xl md:text-lg lg:text-xl font-semibold  dark:text-white">
        Unideals
      </span>
    </Link>
  );
}

export default AuthBrandLogo;
