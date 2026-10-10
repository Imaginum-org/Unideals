import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { toast } from "../components/ui/toast.js";
import { useUser } from "./useUserContext.jsx";
import { getCampuses, setMyCampus } from "../features/campus/api/campusApi.js";

const GUEST_CAMPUS_KEY = "unideals_guest_campus_slug";
// Flagship campus guests browse before picking (mirrors backend
// DEFAULT_CAMPUS_SLUG fallback — kept in sync, never unscoped).
const DEFAULT_CAMPUS_SLUG = "vit-vellore";

const CampusContext = createContext(null);

const readGuestSlug = () => {
  try {
    return localStorage.getItem(GUEST_CAMPUS_KEY);
  } catch {
    return null;
  }
};

/**
 * CampusProvider — single source of truth for "which campus marketplace?".
 *
 * - Logged-in users: campus comes from the profile (`userDetails.campus_id`,
 *   populated by the backend). Null => onboarding gate blocks the app.
 * - Guests: stored pick, else the flagship default (VIT Vellore). Guests
 *   never hit the gate — they browse immediately.
 * Backend remains authoritative: logged-in requests are scoped by
 * `req.user.campus_id`, the slug param below is only used for guests.
 */
export const CampusProvider = ({ children }) => {
  const { userDetails, isLoggedIn, loading: userLoading, updateUserDetails } =
    useUser();
  const [campuses, setCampuses] = useState([]);
  const [directoryLoading, setDirectoryLoading] = useState(true);
  const [guestSlug, setGuestSlug] = useState(readGuestSlug);
  const [saving, setSaving] = useState(false);
  const switchAnnouncedRef = useRef(false);

  const fetchCampuses = useCallback(async () => {
    try {
      setDirectoryLoading(true);
      const res = await getCampuses();
      setCampuses(res.data?.data || []);
    } catch {
      setCampuses([]);
    } finally {
      setDirectoryLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCampuses();
  }, [fetchCampuses]);

  const profileCampusId = userDetails?.campus_id;

  const profileCampus = useMemo(() => {
    if (!profileCampusId) return null;
    // Populated object from backend — ideal path.
    if (typeof profileCampusId === "object") return profileCampusId;
    // Legacy/string id: treat as has-campus (never gate), resolve display
    // name from the directory when available.
    if (typeof profileCampusId === "string") {
      const match = campuses.find(
        (c) => c.slug === profileCampusId || c._id === profileCampusId,
      );
      if (match) return match;
      return { _id: profileCampusId, slug: profileCampusId, name: "Your campus" };
    }
    return null;
  }, [profileCampusId, campuses]);

  // One-time notice when login switches the marketplace away from what the
  // guest was browsing (stored pick or implicit flagship default).
  useEffect(() => {
    if (!isLoggedIn || userLoading || !profileCampus) return;
    if (switchAnnouncedRef.current) return;
    switchAnnouncedRef.current = true;
    const browsedSlug = readGuestSlug() || DEFAULT_CAMPUS_SLUG;
    if (browsedSlug !== profileCampus.slug) {
      toast.success(
        `Showing ${profileCampus.short_name || profileCampus.name} marketplace`,
        { id: "campus-switch-notice" },
      );
    }
  }, [isLoggedIn, userLoading, profileCampus]);

  const guestCampus = useMemo(() => {
    const slug = guestSlug || DEFAULT_CAMPUS_SLUG;
    if (campuses.length === 0) return null;
    return campuses.find((c) => c.slug === slug) || null;
  }, [guestSlug, campuses]);

  // Guest pick points at a deleted/unknown slug: fall back to the flagship
  // default, clear the stale pick, and toast once per session.
  const guestFallbackAnnouncedRef = useRef(false);
  useEffect(() => {
    if (isLoggedIn || directoryLoading || campuses.length === 0) return;
    if (!guestSlug) return;
    const exists = campuses.some((c) => c.slug === guestSlug);
    if (!exists) {
      try {
        localStorage.removeItem(GUEST_CAMPUS_KEY);
      } catch {
        // ignore
      }
      setGuestSlug(null);
      if (!guestFallbackAnnouncedRef.current) {
        guestFallbackAnnouncedRef.current = true;
        toast("Campus no longer available — showing VIT Vellore.", {
          id: "campus-deleted-fallback",
        });
      }
    }
  }, [isLoggedIn, directoryLoading, campuses, guestSlug]);

  // Logged-in users always win over any stale guest pick.
  const campus = isLoggedIn ? profileCampus : guestCampus;

  // Gate is logged-in-only: guests browse the default campus freely.
  const needsGate = !userLoading && isLoggedIn && !profileCampus;

  const campusSlug = campus?.slug || null;

  // True when a guest is on the implicit flagship (never picked).
  const isDefaultCampus = !isLoggedIn && !guestSlug;

  const selectCampus = useCallback(
    async (slug) => {
      if (isLoggedIn) {
        setSaving(true);
        try {
          const res = await setMyCampus(slug);
          if (res.data?.user) {
            updateUserDetails(res.data.user);
          }
          return { ok: true, movedListings: res.data?.movedListings || 0 };
        } catch (error) {
          return {
            ok: false,
            message:
              error.response?.data?.message || "Could not set campus. Try again.",
          };
        } finally {
          setSaving(false);
        }
      }
      try {
        localStorage.setItem(GUEST_CAMPUS_KEY, slug);
      } catch {
        // private mode — gate reappears next visit, acceptable
      }
      setGuestSlug(slug);
      return { ok: true, movedListings: 0 };
    },
    [isLoggedIn, updateUserDetails],
  );

  const value = useMemo(
    () => ({
      campus,
      campusSlug,
      campuses,
      directoryLoading,
      needsGate,
      saving,
      isDefaultCampus,
      selectCampus,
      refreshDirectory: fetchCampuses,
    }),
    [
      campus,
      campusSlug,
      campuses,
      directoryLoading,
      needsGate,
      saving,
      isDefaultCampus,
      selectCampus,
      fetchCampuses,
    ],
  );

  return (
    <CampusContext.Provider value={value}>{children}</CampusContext.Provider>
  );
};

export const useCampus = () => {
  const context = useContext(CampusContext);
  if (!context) {
    throw new Error("useCampus must be used within CampusProvider");
  }
  return context;
};
