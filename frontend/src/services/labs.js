import { useEffect, useState } from "react";
import axios from "./axiosInstance.js";
import { cachedRequest } from "./requestCache.js";
import { useUser } from "../context/useUserContext.jsx";

/**
 * Unideals Labs (the "Early Feature Access" plan perk).
 * The server decides access (config/labs.js); this only mirrors it for UI.
 * Cached 5 min and dropped automatically on login/logout/plan change
 * (requestCache is cleared on identity changes).
 */
const LABS_TTL = 5 * 60 * 1000;

export const fetchLabs = () =>
  cachedRequest("/api/user/labs", LABS_TTL, () => axios.get("/api/user/labs")).then((res) => res.data?.data || []);

export const useLabs = () => {
  const { isLoggedIn, userDetails } = useUser();
  const [labs, setLabs] = useState([]);
  const [loading, setLoading] = useState(Boolean(isLoggedIn));
  const plan = userDetails?.subscription;

  useEffect(() => {
    let cancelled = false;
    if (!isLoggedIn) {
      setLabs([]);
      setLoading(false);
      return undefined;
    }
    setLoading(true);
    fetchLabs()
      .then((list) => !cancelled && setLabs(list))
      .catch(() => !cancelled && setLabs([]))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [isLoggedIn, plan]);

  const has = (key) => labs.some((f) => f.key === key && f.enabled);
  return { labs, loading, has };
};

export const getPriceInsights = (params) =>
  cachedRequest(
    `/api/product/price-insights?${new URLSearchParams(params).toString()}`,
    5 * 60 * 1000,
    () => axios.get("/api/product/price-insights", { params }),
  ).then((res) => res.data?.data);
