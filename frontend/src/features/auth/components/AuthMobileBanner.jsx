import { useEffect, useState } from "react";

const defaultTaglines = [
  "Buy and sell with total clarity",
  "Buy better. Sell smarter. Always.",
  "The smarter way to trade today",
];

function AuthMobileBanner({ taglines = defaultTaglines }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    let timeoutId;

    const interval = setInterval(() => {
      setFade(false);
      timeoutId = setTimeout(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % taglines.length);
        setFade(true);
      }, 300);
    }, 2500);

    return () => {
      clearInterval(interval);
      clearTimeout(timeoutId);
    };
  }, [taglines.length]);

  return (
    <div className="mt-[3vh] flex shrink-0 flex-col items-center gap-3 sm:mt-[4vh] md:hidden font-figtree">
      <p
        className={`text-center text-[0.8rem] font-medium transition-opacity duration-300 sm:text-[0.75rem] ${
          fade ? "opacity-90" : "opacity-0"
        }`}
      >
        {taglines[currentIndex]}
      </p>

      <div className="flex gap-2" aria-hidden="true">
        {taglines.map((tagline, index) => (
          <span
            key={tagline}
            className={`h-0.5 rounded-full transition-all duration-300 ${
              currentIndex === index ? "w-7 bg-white" : "w-3 bg-white/50"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default AuthMobileBanner;
