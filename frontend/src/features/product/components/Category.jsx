import { memo } from "react";
import { Link } from "react-router-dom";
import CategoryIcon from "./CategoryIcon.jsx";

const Category = ({ title, value }) => {
  const slug = (value || title).toLowerCase().replace(/\s+/g, "_");
  return (
    <Link
      to={`/category/${slug}`}
      aria-label={`Browse ${title} category`}
      className="group
w-24
md:w-28
lg:w-32
xl:w-32
aspect-[9/8]
flex
flex-col
items-center
justify-center
gap-3
rounded-xl
border
border-[#E1E5EA]
bg-white
dark:bg-neutral-900
dark:border-neutral-700
dark:hover:bg-neutral-800
transition-all
duration-300
ease-out
hover:shadow-lg
hover:border-primary
active:scale-[0.98]
focus-visible:outline-none
focus-visible:ring-2
focus-visible:ring-primary
focus-visible:ring-offset-2
dark:focus-visible:ring-offset-neutral-900
font-figtree"
    >
      <CategoryIcon
        value={slug}
        className="h-10 w-10 lg:h-12 lg:w-12 transition-transform duration-300 group-hover:scale-110"
      />
      <h3 className="px-1 text-xs sm:text-sm md:text-base xl:text-sm font-semibold text-center line-clamp-2 text-[#4A5565] dark:text-white">
        {title}
      </h3>
    </Link>
  );
};

export default memo(Category);
