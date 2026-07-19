import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "../services/authInterceptor.js";
import "../styles/index.css";
import App from "./App.jsx";
import { ThemeProvider } from "../context/ThemeContext.jsx";
import { UserProvider } from "../context/useUserContext.jsx";
import { WishlistProvider } from "../context/WishlistContext.jsx";

createRoot(document.getElementById("root")).render(
  <BrowserRouter>
    <ThemeProvider>
      <UserProvider>
        <WishlistProvider>
          <App />
        </WishlistProvider>
      </UserProvider>
    </ThemeProvider>
  </BrowserRouter>,
);
