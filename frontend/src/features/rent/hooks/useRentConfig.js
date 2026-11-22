import { useEffect, useState } from "react";
import { useUser } from "../../../context/useUserContext.jsx";
import { useCampus } from "../../../context/CampusContext.jsx";
import { invalidateRequests } from "../../../services/requestCache.js";
import { fetchRentConfig } from "../api/rentApi.js";

/**
 * Is Rent & Borrow on for this viewer's campus? Plus the block list and the
 * viewer's rent profile. One shared copy for the whole app (tab bar, header,
 * home banner and the rent pages all read the same state).
 *
 * The server decides (RENT_ENABLED + per-campus switch); when it says no,
 * every entry point hides and /rent renders Not Found.
 */
let state = { key: null, config: null };
let inflight = null;
const listeners = new Set();

const publish = (next) => {
  state = next;
  listeners.forEach((fn) => fn(state));
};

const load = (key, params, { force = false } = {}) => {
  if (!force && state.key === key && state.config) return Promise.resolve(state.config);
  if (!force && inflight?.key === key) return inflight.promise;
  if (force) invalidateRequests("/api/rent/config");
  const promise = fetchRentConfig(params).then((config) => {
    if (inflight?.promise === promise) inflight = null;
    publish({ key, config });
    return config;
  });
  inflight = { key, promise };
  return promise;
};

export const useRentConfig = () => {
  const { isLoggedIn, userDetails } = useUser();
  const { campusSlug } = useCampus();
  const userCampus = userDetails?.campus_id?._id || userDetails?.campus_id || "";
  const key = isLoggedIn ? `user:${userDetails?._id || ""}:${userCampus}` : `guest:${campusSlug || ""}`;
  const params = isLoggedIn || !campusSlug ? {} : { campus_slug: campusSlug };
  const [snapshot, setSnapshot] = useState(state);

  useEffect(() => {
    listeners.add(setSnapshot);
    return () => listeners.delete(setSnapshot);
  }, []);

  useEffect(() => {
    load(key, params);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const config = snapshot.key === key ? snapshot.config : null;
  return {
    loading: !config,
    enabled: Boolean(config?.enabled),
    config,
    blocks: config?.blocks || [],
    profile: config?.profile || null,
    refresh: () => load(key, params, { force: true }),
  };
};
