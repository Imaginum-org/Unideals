import { Link } from "react-router-dom";
import cmlogo from "../../../assets/final_cm_logo.png";
import whitecmlogo from "../../../assets/white_cm_logo_mobile.png";

function AuthBrandLogo() {
  return (
    <Link
      to="/"
      className="inline-flex items-center justify-center gap-2.5 sm:gap-3 font-figtree text-xl font-semibold text-white md:gap-1.5 md:text-sm md:text-[#012436] dark:md:text-white lg:gap-2 lg:text-sm xl:gap-2 xl:text-base 2xl:gap-2.5 2xl:text-lg"
    >
      <img
        src={cmlogo}
        className="mb-1 hidden size-5 md:block md:h-[1.0625rem] md:w-[0.8125rem] lg:h-[1.1875rem] lg:w-[0.9375rem] xl:h-[1.3125rem] xl:w-[1.0625rem] 2xl:h-[3vh] 2xl:w-[1.2vw]"
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
