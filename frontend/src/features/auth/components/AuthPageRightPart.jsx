import { IoIosSunny, IoMdMoon } from "react-icons/io";
import { motion } from "framer-motion";
import { useTheme } from "../../../context/ThemeContext.jsx";
import AuthPanelShape from "/auth_page_left_side.webp";
import HomepagePreview from "/auth_left_card_image.webp";

function AuthPageRightPart() {
  const { darkMode, toggleDarkMode } = useTheme();

  return (
    <aside
      className="
        hidden md:flex
        h-full min-h-0 shrink-0 overflow-hidden
        bg-white dark:bg-[#131313]
        p-2 md:p-2 lg:p-4 xl:p-3 2xl:p-3
        md:w-[56%] lg:w-[59%] xl:w-[59%] 2xl:w-[59%]
      "
    >
      <div className="relative flex h-full w-full overflow-hidden rounded-2xl bg-[#3b3bf2] text-white">
        <img
          src={AuthPanelShape}
          alt=""
          aria-hidden="true"
          className="
            pointer-events-none absolute
            right-0 top-[9%] z-[1]
            w-[28%] min-w-[8.75rem] max-w-[20rem] 3xl:max-w-[28rem]
            object-contain opacity-90
            rotate-[-90deg]
            lg:w-[30%] xl:w-[32%] 2xl:w-[24%]
          "
        />
        <img
          src={AuthPanelShape}
          alt=""
          aria-hidden="true"
          className="
            pointer-events-none absolute
            bottom-0 left-[7%] z-[1]
            w-[28%] min-w-[8.75rem] max-w-[20rem] 3xl:max-w-[28rem]
            object-contain opacity-80
            lg:w-[30%] xl:w-[32%] 2xl:w-[24%]
          "
        />

        {/* ── Dark mode toggle ── */}
        <button
          onClick={toggleDarkMode}
          aria-label="Toggle dark mode"
          className="
            absolute right-4 top-4 z-20
            rounded-full bg-white/10 p-2
            text-white transition hover:bg-white/20
            md:right-5 md:top-5
          "
        >
          {darkMode ? (
            <IoIosSunny className="size-4 text-[#FFD119] xl:size-5" />
          ) : (
            <IoMdMoon className="size-4 text-white      xl:size-5" />
          )}
        </button>

        {/* ── Main content — centred vertically & horizontally ── */}
        <div
          className="
            relative z-10
            mx-auto flex h-full w-full
            items-center justify-center
            overflow-y-auto /* <-- ADDED: Allows vertical scrolling on very short screens */
            py-8 md:py-12   /* <-- ADDED: Prevents content from touching the edges when scrolling */
            px-6
            md:px-8
            lg:px-12
            xl:px-16
          "
        >
          {/* Shared wrapper to lock left-edges together */}
          <div
            className="
              flex w-full flex-col
              my-auto /* <-- ADDED: Keeps it centered if scrolling isn't needed */
              gap-[clamp(1.5rem,4vh,4rem)] /* <-- ADDED: Gap shrinks automatically on short screens! */
              max-w-[min(22rem,90%)]
              md:max-w-[min(24rem,88%)]
              lg:max-w-[min(26rem,82%)]
              xl:max-w-[min(26rem,78%)]
              2xl:max-w-[min(32rem,72%)]
              3xl:max-w-[min(40rem,55vw)]
            "
          >
            {/* ── Headline section ── */}
            <section className="w-full shrink-0 xl:mt-[2.4vh]">
              {" "}
              {/* Added shrink-0 to prevent text squishing */}
              <div
                className="relative mb-4 h-[0.2rem] w-16 overflow-hidden rounded-full bg-white md:w-20 xl:w-24 2xl:w-28"
                aria-hidden="true"
              >
                {/* The moving 'gap' bouncing back and forth */}
                <motion.div
                  className="absolute inset-y-0 w-2.5 bg-[#3b3bf2] md:w-3"
                  initial={{ left: "1%" }}
                  animate={{ left: "calc(100% - 0.75rem)" }}
                  transition={{
                    duration: 2,
                    ease: "easeInOut",
                    repeat: Infinity,
                    repeatType: "reverse",
                  }}
                />
              </div>
              <h2 className="font-figtree font-medium leading-tight text-white text-[1.1rem] md:text-[1.2rem] lg:text-[1.4rem] xl:text-[1.65rem] 2xl:text-[1.9rem] 3xl:text-[2.1rem]">
                From hostel needs to daily deals
              </h2>
              <p className="mt-2 font-figtree leading-snug text-zinc-200 text-[0.78rem] md:text-[0.82rem] lg:text-[0.9rem] xl:text-[1rem] 2xl:text-[1.1rem] 3xl:text-[1.2rem]">
                A faster, simpler way to exchange essentials within your campus.
              </p>
            </section>

            {/* ── Preview card ── */}
            <section
              className="
                w-full shrink-0 
                rounded-2xl bg-white
                p-[0.6rem]
                md:p-[0.75rem]
                shadow-[0_1.25rem_3.75rem_rgba(18,18,120,0.22)]
              "
            >
              {/* Screenshot */}
              <div className="overflow-hidden rounded-lg border border-zinc-200 shadow-[inset_0_-0.125rem_1rem_rgba(56,56,236,0.25)]">
                <div
                  className="relative w-full"
                  style={{ paddingBottom: "53.2%" }}
                >
                  <img
                    src={HomepagePreview}
                    alt="image"
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                </div>
              </div>

              {/* Card footer */}
              <div className="pt-2 pb-1 pl-1 font-figtree md:pt-3">
                <h3
                  className="
                    font-semibold leading-tight text-black
                    text-[0.9rem]
                    md:text-[1rem]
                    lg:text-[1.1rem]
                    xl:text-[1.2rem]
                    2xl:text-[1.3rem]
                    3xl:text-[1.45rem]
                  "
                >
                  CampusMart
                </h3>
                <p
                  className="
                    mt-0.5 leading-snug text-neutral-400
                    text-[0.72rem]
                    md:text-[0.78rem]
                    lg:text-[0.82rem]
                    xl:text-[0.88rem]
                    2xl:text-[0.95rem]
                    3xl:text-[1.05rem]
                  "
                >
                  Everything students need. Buy. Sell. Repeat.
                </p>
              </div>
            </section>
          </div>
        </div>
      </div>
    </aside>
  );
}

export default AuthPageRightPart;
