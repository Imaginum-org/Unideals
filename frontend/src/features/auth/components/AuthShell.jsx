import { Link } from "react-router-dom";
import ThemeToggle from "../../../components/ui/ThemeToggle.jsx";
import AuthBrandLogo from "./AuthBrandLogo.jsx";
import AuthMobileBanner from "./AuthMobileBanner.jsx";
import AuthShowcase from "./showcase/AuthShowcase.jsx";
import { CampusSkyline } from "./showcase/CampusNightScene.jsx";
import "../styles/auth.css";

/*
 * Shared frame for every auth screen (login, signup, forgot/reset password,
 * check/verify email). Pages render only their own content as children.
 *
 * - md and up: form column on the left, animated campus showcase on the
 *   right (the column scrolls on its own if a form is taller than the screen).
 * - Phones: gradient hero (logo, rotating tagline, campus skyline) with the
 *   form in a rounded sheet below; the whole page scrolls naturally, which
 *   behaves better with on-screen keyboards than an inner scroller.
 *
 * To bring back the previous right panel, render <AuthPageRightPart />
 * (./AuthPageRightPart.jsx, kept unchanged) instead of <AuthShowcase />.
 */
function AuthShell({ children }) {
  const year = new Date().getFullYear();

  return (
    <div className="auth-root flex min-h-[100dvh] w-full bg-[var(--auth-page)] font-figtree text-slate-900 dark:text-white md:h-[100dvh] md:overflow-hidden">
      {/* ── Form column ── */}
      <div className="relative flex min-h-[100dvh] w-full flex-col md:h-full md:min-h-0 md:w-[46%] md:shrink-0 lg:w-[43%] xl:w-[41%]">
        {/* Hero on phones, plain logo bar from md */}
        <header className="relative shrink-0 overflow-hidden text-white md:overflow-visible md:text-inherit">
          <div aria-hidden="true" className="as-panel absolute inset-0 md:hidden">
            <div className="as-dots absolute inset-0" />
            <div className="as-aurora -right-[20%] -top-[30%] h-[80%] w-[80%] bg-[#8E8CFF]/40" />
          </div>

          <div className="relative flex items-center justify-center px-6 pt-[max(1.5rem,env(safe-area-inset-top))] md:justify-start md:px-8 md:pt-7 lg:px-10">
            <AuthBrandLogo />
            <div className="absolute right-5 top-[max(1.25rem,env(safe-area-inset-top))] md:hidden">
              <ThemeToggle size="sm" variant="glass" />
            </div>
          </div>

          {/* pb-6 matches the sheet's -mt-6, so the sheet edge lands on the ground line */}
          <div className="relative pb-6 md:hidden">
            <AuthMobileBanner />
            <CampusSkyline className="mx-auto mt-3 block h-[clamp(96px,30vw,150px)] w-full max-w-[560px] px-3" />
          </div>
        </header>

        {/* Content */}
        <main className="no-scrollbar relative z-10 -mt-6 flex flex-1 flex-col rounded-t-[28px] bg-[var(--auth-page)] shadow-[0_-14px_40px_-12px_rgba(20,20,110,0.35)] md:mt-0 md:min-h-0 md:overflow-y-auto md:rounded-none md:shadow-none">
          <div className="auth-content mx-auto flex w-full max-w-[25rem] flex-1 flex-col justify-start px-6 pb-8 pt-8 sm:px-8 md:justify-center md:px-6 xl:max-w-[26rem]">
            {children}
          </div>

          <footer className="auth-footer flex shrink-0 flex-wrap items-center justify-center gap-x-4 gap-y-1 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] text-[12.5px] text-slate-400 dark:text-zinc-500 md:justify-between md:px-8 md:pb-6 lg:px-10">
            <span>© {year} Unideals</span>
            <nav aria-label="Legal and help" className="flex items-center gap-4">
              <Link to="/privacy-policy" className="transition hover:text-slate-700 dark:hover:text-zinc-200">
                Privacy
              </Link>
              <Link to="/termscondition" className="transition hover:text-slate-700 dark:hover:text-zinc-200">
                Terms
              </Link>
              <Link to="/faq" className="transition hover:text-slate-700 dark:hover:text-zinc-200">
                Help
              </Link>
            </nav>
          </footer>
        </main>
      </div>

      {/* ── Showcase ── */}
      <AuthShowcase />
    </div>
  );
}

export default AuthShell;
