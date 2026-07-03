import { memo } from "react";
import { Link } from "react-router-dom";

const Category = ({ title, imageSrc }) => {
  const slug = title.toLowerCase().replace(/\s+/g, "_");
  return (
    <Link
      to={`/category/${slug}`}
      aria-label={`Browse ${title} category`}
      className="group
w-24
md:w-28
lg:w-32
xl:w-36
aspect-[10/9]
flex
flex-col
items-center
justify-center
gap-3
rounded-xl
border
border-[#E1E5EA]
bg-[#F2F1FD]
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
      {imageSrc ? (
        <img
          src={imageSrc}
          width={40}
          height={40}
          alt={`${title} icon`}
          className="w-8 h-8 lg:w-10 lg:h-10 object-contain transition-transform duration-300 group-hover:scale-110"
          loading="lazy"
          decoding="async"
          draggable={false}
        />
      ) : (
        <div className="flex items-center justify-center w-14 h-14 rounded-full bg-gray-100 dark:bg-neutral-800">
          <span className="text-xs text-gray-400">N/A</span>
        </div>
      )}
      <h3 className="text-xs sm:text-sm md:text-base font-semibold text-center line-clamp-2 text-[#4A5565] dark:text-white">
        {title}
      </h3>
    </Link>
  );
};

export default memo(Category);
