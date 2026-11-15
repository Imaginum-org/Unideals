import { useLayoutEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

/*
 * BrowserRouter keeps the old scroll position on navigation, so a link
 * clicked low on a page (footer → Privacy / Terms, account menu, buttons)
 * opened the next page half-way down. On every forward navigation to a new
 * path we jump to the top (or to #hash if present). Back/forward (POP)
 * keeps the browser's own scroll restoration. Query-only changes (tabs,
 * filters) don't scroll.
 */
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navType = useNavigationType();

  useLayoutEffect(() => {
    if (navType === "POP") return;
    if (hash) {
      const el = document.getElementById(decodeURIComponent(hash.slice(1)));
      if (el) {
        el.scrollIntoView({ block: "start" });
        return;
      }
    }
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
