import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "../services/authInterceptor.js";
import "../styles/index.css";
import App from "./App.jsx";
import { ThemeProvider } from "../context/ThemeContext.jsx";
import { GirlsModeProvider } from "../context/GirlsModeContext.jsx";
import { UserProvider } from "../context/useUserContext.jsx";
import { CampusProvider } from "../context/CampusContext.jsx";
import { WishlistProvider } from "../context/WishlistContext.jsx";

// The API lives on its own origin: open the connection (DNS + TCP + TLS)
// while React boots, so the first /api call (session, feed) skips ~100–300ms.
try {
  const api = import.meta.env.VITE_API_BASE_URL;
  if (api && /^https?:/i.test(api)) {
    const origin = new URL(api).origin;
    if (origin !== window.location.origin) {
      const link = document.createElement("link");
      link.rel = "preconnect";
      link.href = origin;
      link.crossOrigin = "use-credentials";
      document.head.appendChild(link);
    }
  }
} catch {
  // never block boot over a hint
}

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <GirlsModeProvider>
        <UserProvider>
          <CampusProvider>
            <WishlistProvider>
              <App />
            </WishlistProvider>
          </CampusProvider>
        </UserProvider>
      </GirlsModeProvider>
    </ThemeProvider>
  </BrowserRouter>,
);
