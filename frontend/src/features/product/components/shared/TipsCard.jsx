import { MdStars } from "react-icons/md";
import { BsFillLightbulbFill } from "react-icons/bs";

const TIPS_DATA = {
  1: {
    icon: <BsFillLightbulbFill size={18} />,
    title: "PRO TIP",

    tips: [
      "Use a descriptive product title.",
      "Mention important product details.",
      "Add honest usage information.",
      "Clear descriptions increase trust.",
    ],
  },

  2: {
    icon: <BsFillLightbulbFill size={18} />,
    title: "PRO TIP",

    tips: [
      "Use natural lighting.",
      "Show all product angles.",
      "Keep background clean.",
      "Avoid blurry images.",
    ],
  },

  3: {
    icon: <BsFillLightbulbFill size={18} />,
    title: "PRO TIP",

    tips: [
      "Keep pricing realistic.",
      "Competitive prices sell faster.",
      "Mention negotiable pricing carefully.",
      "Clear meetup locations help buyers.",
    ],
  },

  4: {
    icon: <BsFillLightbulbFill size={18} />,
    title: "PRO TIP",

    tips: [
      "Review all details carefully.",
      "Ensure images are correct.",
      "Check payment information.",
      "Preview exactly as buyers will see it.",
    ],
  },
};

const TipsCard = ({ step }) => {
  const currentTip = TIPS_DATA[step];

  return (
    <div className="w-full rounded-xl border border-[#ECECEC] bg-[#F1F1FF] py-5 px-6 font-figtree dark:bg-[#1A1D20] dark:text-white dark:border-0">
      {/* Top */}
      <div className="flex items-center gap-2 text-[#3838EC]">
        {currentTip.icon}

        <h2 className="text-sm font-bold text-[#000000] uppercase tracking-wide dark:text-white">
          {currentTip.title}
        </h2>
      </div>

      <p className="text-xl font-semibold pr-14 lg:pr-9 mt-3">
        Products with clear, descriptive titles receive{" "}
        <span className="text-[#3838EC]">40% more interest</span> from potential
        buyers.
      </p>

      {/* Tips */}
      <div className="mt-4 flex flex-col justify-center gap-2">
        {currentTip.tips.map((tip, index) => (
          <div key={index} className="flex items-center gap-3 ">
            <MdStars className="text-[#3838EC]" />
            <p className="text-[15px] leading-7 text-[#111827] dark:text-white">
              {tip}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TipsCard;
