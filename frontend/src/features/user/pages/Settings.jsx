/* eslint-disable react/prop-types */
import { useCallback, useEffect, useRef, useState } from "react";
import Select from "../../../components/ui/Select.jsx";
import { toast } from "../../../components/ui/toast.js";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  Camera,
  LogOut,
  Mail,
  MapPin,
  Phone,
  Plus,
  Shield,
  ShieldCheck,
  Trash2,
  User,
} from "lucide-react";
import { uploadImage } from "../../../utils/imageUpload.js";
import AvatarComponent from "../../../components/common/AvatarComponent.jsx";
import { useUser, clearAccountScopedStorage } from "../../../context/useUserContext.jsx";
import { useCampus } from "../../../context/CampusContext.jsx";
import { logoutUser, resendVerification } from "../../auth/api/authApi";
import { getUserProducts } from "../../product/api/productApi.js";
import PickupSpotModal from "../components/PickupSpotModal.jsx";
import AlertDialogDemo from "../components/Deletebutton.jsx";
import { AccountLayout, Panel, TabBar, btnDanger, btnPrimary, btnSecondary } from "../components/account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";
import SecuritySettings from "../components/SecuritySettings.jsx";
import ChatSettings from "../components/ChatSettings.jsx";
import {
  getUserProfile,
  createPickupSpot,
  deletePickupSpot,
  getUserPickupSpots,
  setPrimaryPickupSpot,
  updatePickupSpot,
  updateAvatar,
  updateProfile,
  removeAvatar,
  requestGenderChange,
  getGenderChangeStatus,
} from "../api/userApi";
import ButtonLoader from "../../../components/ui/ButtonLoader.jsx";

const tabs = ["Profile", "Security", "Pickup Spots", "Chat", "Verification"];

const formatMemberSince = (date) => {
  if (!date) return "Member since date unavailable";

  return `Member since ${new Date(date).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  })}`;
};

const formatPhone = (phone) => {
  if (!phone) return "Not added";
  return phone.startsWith("+") ? phone : `+91 ${phone}`;
};

function Settings() {
  const navigate = useNavigate();
  const { userDetails: contextUserDetails, updateUserDetails, clearUserData } = useUser();
  const { campuses, campus: activeCampus } = useCampus();

  // ?tab=security etc. deep-links straight to a section.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabSlug = (t) => t.toLowerCase().split(" ").join("-");
  const activeTab = tabs.find((t) => tabSlug(t) === searchParams.get("tab")) || "Profile";
  const setActiveTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    if (tab === "Profile") next.delete("tab");
    else next.set("tab", tabSlug(tab));
    setSearchParams(next, { replace: true });
  };
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [campusSlug, setCampusSlug] = useState("");
  // Per-field editing: only one row (phone | campus | gender) is editable at
  // a time, with its own Save/Cancel right there. No global "Edit all".
  const [editingField, setEditingField] = useState(null);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [pickupSpots, setPickupSpots] = useState([]);
  const [pickupLoading, setPickupLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [pendingDeleteIndex, setPendingDeleteIndex] = useState(null);
  const [pendingPrimaryId, setPendingPrimaryId] = useState(null);
  const [showCampusConfirm, setShowCampusConfirm] = useState(false);
  const [listingsToMove, setListingsToMove] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [genderRequest, setGenderRequest] = useState(null);
  const [requestedGender, setRequestedGender] = useState("");
  const [requestSaving, setRequestSaving] = useState(false);

  const fileInputRef = useRef(null);

  useEffect(() => {
    if (contextUserDetails) {
      setUserDetails(contextUserDetails);
      setPhone(contextUserDetails?.mobile || "");
      setGender(contextUserDetails?.gender || "");
      const slug =
        typeof contextUserDetails?.campus_id === "object"
          ? contextUserDetails.campus_id?.slug
          : null;
      setCampusSlug(slug || "");
      setLoading(false);
    }
  }, [contextUserDetails]);

  useEffect(() => {
    if (contextUserDetails) return;

    const fetchUser = async () => {
      try {
        const res = await getUserProfile();

        if (res.data.success) {
          setUserDetails(res.data.user);
          setPhone(res.data.user?.mobile || "");
          setGender(res.data.user?.gender || "");
          const slug =
            typeof res.data.user?.campus_id === "object"
              ? res.data.user.campus_id?.slug
              : null;
          setCampusSlug(slug || "");
        }
      } catch (err) {
        // Only clear + redirect when the session is truly dead (401 after
        // the interceptor already tried a silent refresh). 403s here are
        // permission/verification issues, not logout signals — the auth
        // context owns session state and will react if needed.
        if (err.response?.status === 401) {
          localStorage.removeItem("isAuthenticated");
          localStorage.removeItem("cachedUserDetails");
          localStorage.removeItem("accessToken");
          navigate("/login");
        } else if (err.response?.status === 403) {
          toast.error(
            err.response?.data?.message || "You don't have access right now.",
          );
        } else {
          toast.error("Failed to load profile");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [contextUserDetails, navigate]);

  const fetchPickupSpots = useCallback(async () => {
    try {
      setPickupLoading(true);
      const res = await getUserPickupSpots();
      if (res.data.success) setPickupSpots(res.data.pickupSpots);
    } catch {
      toast.error("Failed to load pickup spots");
    } finally {
      setPickupLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPickupSpots();
  }, [fetchPickupSpots]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await getGenderChangeStatus();
        if (!cancelled && res.data?.success) setGenderRequest(res.data.genderChangeRequest || null);
      } catch {
        // best-effort only
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleGenderRequest = async () => {
    if (!requestedGender || requestSaving) return;
    setRequestSaving(true);
    try {
      const res = await requestGenderChange(requestedGender);
      if (res.data?.success) {
        setGenderRequest(res.data.genderChangeRequest || null);
        toast.success("Request sent for admin approval.");
        setRequestedGender("");
        // Close gender editing so phone/campus stay editable while pending.
        setEditingField(null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Could not send request.");
    } finally {
      setRequestSaving(false);
    }
  };

  // Reset all drafts from the saved profile (used when starting / cancelling).
  const resetDrafts = () => {
    setPhone(userDetails?.mobile || "");
    setGender(userDetails?.gender || "");
    const slug =
      typeof userDetails?.campus_id === "object"
        ? userDetails.campus_id?.slug
        : null;
    setCampusSlug(slug || "");
    setRequestedGender("");
  };

  const startEditing = (field) => {
    resetDrafts();
    setEditingField(field);
  };

  const cancelEditing = () => {
    resetDrafts();
    setEditingField(null);
  };

  const syncProfileState = (savedUser, moved = 0) => {
    setUserDetails(savedUser);
    updateUserDetails(savedUser);
    setPhone(savedUser?.mobile || "");
    setGender(savedUser?.gender || "");
    const slug =
      typeof savedUser?.campus_id === "object" ? savedUser.campus_id?.slug : null;
    setCampusSlug(slug || "");
    setEditingField(null);
    setShowCampusConfirm(false);
    toast.success(
      moved > 0
        ? `Campus updated · ${moved} listing${moved > 1 ? "s" : ""} moved`
        : "Profile updated successfully",
    );
  };

  // Per-field save — only the edited field is sent to the server.
  const handleSaveField = async (field, confirmed = false) => {
    if (field === "campus") {
      const currentSlug =
        typeof userDetails?.campus_id === "object"
          ? userDetails.campus_id?.slug
          : activeCampus?.slug;
      const changingCampus = Boolean(campusSlug) && campusSlug !== currentSlug;
      if (!changingCampus) {
        setEditingField(null);
        return true;
      }
      // Campus moves relocate live listings — confirm first (same theme modal).
      if (!confirmed) {
        try {
          const res = await getUserProducts();
          const items = res.data?.data || [];
          setListingsToMove(
            items.filter((p) =>
              ["listed", "active"].includes((p.status || "").toLowerCase()),
            ).length,
          );
        } catch {
          setListingsToMove(null);
        }
        setShowCampusConfirm(true);
        return false;
      }
      try {
        setIsSavingProfile(true);
        const res = await updateProfile({ campus_slug: campusSlug });
        if (res.data.success) {
          syncProfileState(res.data.user, res.data.movedListings || 0);
          return true;
        }
        return false;
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to update campus");
        return false;
      } finally {
        setIsSavingProfile(false);
      }
    }

    if (field === "phone") {
      const digits = String(phone).replace(/\D/g, "");
      if ((userDetails?.mobile || "") === digits) {
        setEditingField(null);
        return true;
      }
      // Validate 10-digit Indian mobile starting 6-9, don't silently truncate
      if (!/^[6-9]\d{9}$/.test(digits)) {
        toast.error("Enter a valid 10-digit mobile number starting with 6-9");
        return false;
      }
      try {
        setIsSavingProfile(true);
        const res = await updateProfile({ mobile: digits });
        if (res.data.success) {
          syncProfileState(res.data.user);
          return true;
        }
        return false;
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to update phone");
        return false;
      } finally {
        setIsSavingProfile(false);
      }
    }

    if (field === "gender") {
      // First-set fallback only (locked profiles use admin approval).
      if (!gender || userDetails?.gender) {
        setEditingField(null);
        return true;
      }
      try {
        setIsSavingProfile(true);
        const res = await updateProfile({ gender });
        if (res.data.success) {
          syncProfileState(res.data.user);
          return true;
        }
        return false;
      } catch (err) {
        toast.error(err?.response?.data?.message || "Failed to update gender");
        return false;
      } finally {
        setIsSavingProfile(false);
      }
    }

    return false;
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;
    setIsUploadingAvatar(true);

    try {
      // Validate file type - allowlist only (SVG excluded to prevent XSS)
      const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
      const allowedExts = ["png", "jpg", "jpeg", "webp"];
      const ext = String(file.name || "").split(".").pop()?.toLowerCase() || "";
      if (!allowedTypes.includes(file.type) || !allowedExts.includes(ext)) {
        toast.error("Please select a JPG, PNG or WEBP image.");
        return;
      }

      // Limit file size (5 MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Image size should be less than 5 MB.");
        return;
      }

      // Upload to ImageKit
      const uploadedImage = await uploadImage(file, "Avatars");

      // Save in database
      const res = await updateAvatar({
        avatar: {
          url: uploadedImage.url,
          fileId: uploadedImage.fileId,
        },
      });

      if (res.data.success) {
        setUserDetails(res.data.user);
        updateUserDetails(res.data.user);

        toast.success("Profile photo updated successfully");
      }
    } catch (err) {
      console.error(err?.response?.status, err?.response?.data?.message || err?.message);

      toast.error(
        err?.response?.data?.message || "Failed to update profile photo",
      );
    } finally {
      // Reset input so selecting the same image again still triggers onChange
      setIsUploadingAvatar(false);
      event.target.value = "";
    }
  };

  const handleRemoveAvatar = async () => {
    setIsRemovingAvatar(true);
    try {
      const res = await removeAvatar();

      if (res.data.success) {
        setUserDetails(res.data.user);
        updateUserDetails(res.data.user);

        toast.success("Profile photo removed successfully");
      }
    } catch (err) {
      console.error(err?.response?.status, err?.response?.data?.message || err?.message);

      toast.error(
        err?.response?.data?.message || "Failed to remove profile photo",
      );
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleAddPickupSpot = () => {
    setEditingIndex(null);
    setIsModalOpen(true);
  };

  const handleEditPickupSpot = (index) => {
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const handleSavePickupSpot = async (data) => {
    try {
      // Enforce the 3-spot cap on save too (create path).
      if (editingIndex === null && pickupSpots.length >= 3) {
        toast.error("Maximum 3 pickup spots allowed");
        return;
      }
      let res;
      if (editingIndex !== null) {
        res = await updatePickupSpot(pickupSpots[editingIndex]?._id, data);
      } else {
        res = await createPickupSpot(data);
      }

      if (res.data.success) {
        toast.success("Pickup spot saved");
        await fetchPickupSpots();
        setIsModalOpen(false);
        setEditingIndex(null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save pickup spot");
    }
  };

  const handleDeletePickupSpot = async (index) => {
    try {
      await deletePickupSpot(pickupSpots[index]?._id);
      toast.success("Pickup spot deleted");
      fetchPickupSpots();
    } catch {
      toast.error("Failed to delete pickup spot");
    } finally {
      setPendingDeleteIndex(null);
    }
  };

  const handleSetPrimaryPickupSpot = async (id) => {
    try {
      await setPrimaryPickupSpot(id);
      toast.success("Primary pickup spot updated");
      fetchPickupSpots();
    } catch {
      toast.error("Failed to set primary pickup spot");
    } finally {
      setPendingPrimaryId(null);
    }
  };

  const handleResendVerification = async () => {
    if (!userDetails?.email) {
      toast.error("No email on your account");
      return;
    }
    try {
      await resendVerification({ email: userDetails.email });
      toast.success("Verification email sent");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to resend email");
    }
  };

  const handleLogout = async () => {
    try {
      const res = await logoutUser();

      if (res.data.success) {
        toast.success("Logged out successfully");
        navigate("/login");
      } else {
        toast.error("Logout failed");
      }
    } catch {
      toast.error("Logout failed");
    } finally {
      // Always clear local session regardless of server result.
      try {
        clearUserData();
        clearAccountScopedStorage();
      } catch {
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("cachedUserDetails");
        localStorage.removeItem("accessToken");
      }
      navigate("/login");
    }
  };

  const header = {
    seoTitle: "Settings | Unideals",
    title: "Settings",
  };

  if (loading) {
    return (
      <AccountLayout {...header}>
        <div className="space-y-4" aria-hidden="true">
          <div className="browse-shimmer h-10 w-80 max-w-full rounded-lg bg-neutral-100 dark:bg-white/5" />
          <div className="browse-shimmer h-32 rounded-2xl bg-neutral-100 dark:bg-white/5" />
          <div className="browse-shimmer h-64 rounded-2xl bg-neutral-100 dark:bg-white/5" />
        </div>
      </AccountLayout>
    );
  }

  const profileRows = [
    { label: "Full name", value: userDetails?.name || "User", icon: User },
    { label: "Email", value: userDetails?.email || "-", icon: Mail },
    { label: "Phone", value: formatPhone(userDetails?.mobile), icon: Phone, editable: true, field: "phone" },
    {
      label: "Campus",
      value: campuses.find((c) => c.slug === (campusSlug || activeCampus?.slug))?.name || activeCampus?.name || "Not set",
      icon: MapPin,
      editable: true,
      field: "campus",
    },
  ];

  const currentCampusSlug =
    (typeof userDetails?.campus_id === "object" && userDetails.campus_id?.slug) || activeCampus?.slug || "";
  const campusChanged = Boolean(campusSlug) && campusSlug !== currentCampusSlug;
  const hasPhoto = Boolean(userDetails?.avatar?.url);
  const linkBtn = "text-[13px] font-semibold text-[var(--accent-text)] hover:underline disabled:cursor-not-allowed disabled:opacity-40 disabled:no-underline";
  const mutedBtn = "text-[13px] font-semibold text-slate-500 hover:text-slate-800 disabled:opacity-50 dark:text-zinc-400 dark:hover:text-white";

  return (
    <AccountLayout {...header}>
      <TabBar
        className="mb-5"
        ariaLabel="Settings sections"
        tabs={tabs.map((t) => ({ value: t, label: t }))}
        value={activeTab}
        onChange={setActiveTab}
      />

      {activeTab === "Profile" && (
        <div className="flex flex-col gap-4 sm:gap-5">
          <Panel title="Profile photo">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <AvatarComponent
                name={userDetails?.name}
                imageUrl={userDetails?.avatar?.url}
                plan={userDetails?.subscription}
                role={userDetails?.role}
                isOwn
                showBadge
                size="large"
                isLoading={loading}
                shape="square"
                className="rounded-xl object-cover"
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-[16px] font-semibold text-slate-900 dark:text-white">{userDetails?.name || "User"}</p>
                  {userDetails?.is_email_verified && <BadgeCheck className="h-4 w-4 text-emerald-500" aria-label="Verified" />}
                </div>
                <p className="text-[13px] text-slate-500 dark:text-zinc-400">
                  {activeCampus?.short_name || activeCampus?.name || "Campus not set"} · {formatMemberSince(userDetails?.createdAt)}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isUploadingAvatar || isRemovingAvatar}
                  className={btnSecondary}
                >
                  <Camera className="h-4 w-4" aria-hidden="true" />
                  <ButtonLoader loading={isUploadingAvatar} loadingText="Uploading…">
                    {hasPhoto ? "Change" : "Upload"}
                  </ButtonLoader>
                </button>
                {hasPhoto && (
                  <button type="button" onClick={handleRemoveAvatar} disabled={isUploadingAvatar || isRemovingAvatar} className={btnDanger}>
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                    <ButtonLoader loading={isRemovingAvatar} loadingText="Removing…">
                      Remove
                    </ButtonLoader>
                  </button>
                )}
              </div>
            </div>
          </Panel>

          <Panel title="Personal information" padded={false}>
            <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
              {profileRows.map((row) => {
                const Icon = row.icon;
                const editing = editingField === row.field;
                return (
                  <li key={row.label} className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
                    <div className="flex min-w-0 flex-1 items-start gap-3.5">
                      <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-[12.5px] font-medium text-slate-500 dark:text-zinc-400">{row.label}</p>
                        {editing && row.field === "phone" ? (
                          <input
                            value={phone}
                            onChange={(e) => setPhone(e.target.value)}
                            inputMode="tel"
                            autoComplete="tel-national"
                            placeholder="10 digit mobile number"
                            className="mt-1.5 h-10 w-full max-w-xs rounded-lg border border-neutral-200 bg-white px-3 text-[14px] text-slate-900 outline-none focus:border-[var(--accent)] focus:ring-4 focus:ring-[var(--accent-soft)] dark:border-neutral-700 dark:bg-[#131313] dark:text-white"
                          />
                        ) : editing && row.field === "campus" ? (
                          <>
                            <Select
                              className="mt-1.5 max-w-xs"
                              value={campusSlug}
                              onChange={setCampusSlug}
                              placeholder="Select campus"
                              ariaLabel="Campus"
                              options={campuses.map((c) => ({ value: c.slug, label: c.name }))}
                            />
                            {campusChanged && (
                              <p className="mt-1.5 text-[12.5px] font-medium text-amber-600 dark:text-amber-400">
                                Your live listings move to the new campus when you save.
                              </p>
                            )}
                          </>
                        ) : (
                          <p className="mt-0.5 break-words text-[14.5px] font-medium text-slate-900 dark:text-white">{row.value}</p>
                        )}
                      </div>
                    </div>
                    {row.editable &&
                      (editing ? (
                        <span className="flex shrink-0 items-center gap-3 pt-6">
                          <button type="button" onClick={cancelEditing} disabled={isSavingProfile} className={mutedBtn}>
                            Cancel
                          </button>
                          <button type="button" onClick={() => handleSaveField(row.field)} disabled={isSavingProfile} className={linkBtn}>
                            <ButtonLoader loading={isSavingProfile} loadingText="Saving…">
                              Save
                            </ButtonLoader>
                          </button>
                        </span>
                      ) : (
                        <button type="button" onClick={() => startEditing(row.field)} disabled={editingField !== null} className={cn(linkBtn, "shrink-0 pt-6")}>
                          Edit
                        </button>
                      ))}
                  </li>
                );
              })}

              {/* Gender: set once, then changes need admin approval */}
              <li className="flex items-start justify-between gap-4 px-4 py-4 sm:px-5">
                <div className="flex min-w-0 flex-1 items-start gap-3.5">
                  <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-neutral-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400">
                    <User className="h-4 w-4" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[12.5px] font-medium text-slate-500 dark:text-zinc-400">Gender</p>
                    {editingField === "gender" && !userDetails?.gender ? (
                      <Select
                        className="mt-1.5 max-w-xs"
                        value={gender}
                        onChange={setGender}
                        placeholder="Select gender"
                        ariaLabel="Gender"
                        options={[
                          { value: "male", label: "Male" },
                          { value: "female", label: "Female" },
                          { value: "other", label: "Other" },
                        ]}
                      />
                    ) : (
                      <p className="mt-0.5 text-[14.5px] font-medium capitalize text-slate-900 dark:text-white">{userDetails?.gender || "Not added"}</p>
                    )}
                    {userDetails?.gender && editingField === "gender" && (
                      <div className="mt-2.5 rounded-lg bg-neutral-50 px-3.5 py-3 text-[12.5px] text-slate-600 dark:bg-white/[0.03] dark:text-zinc-300">
                        Gender is locked after setup. To change it, request admin approval.
                        {genderRequest?.status === "pending" ? (
                          <span className="mt-1 block font-semibold text-amber-600 dark:text-amber-400">
                            Pending approval for “{genderRequest.requestedGender}”.
                          </span>
                        ) : (
                          <>
                            {genderRequest?.status === "rejected" && (
                              <span className="mt-1 block font-semibold text-red-600 dark:text-red-400">
                                Your last request wasn&apos;t approved. You can send a new one.
                              </span>
                            )}
                            <span className="mt-2.5 flex flex-wrap items-center gap-2">
                              <Select
                                className="w-48"
                                value={requestedGender}
                                onChange={setRequestedGender}
                                placeholder="Select new gender"
                                ariaLabel="Requested gender"
                                options={["male", "female", "other"]
                                  .filter((g) => g !== userDetails?.gender)
                                  .map((g) => ({ value: g, label: g.charAt(0).toUpperCase() + g.slice(1) }))}
                              />
                              <button type="button" onClick={handleGenderRequest} disabled={!requestedGender || requestSaving} className={btnPrimary}>
                                <ButtonLoader loading={requestSaving} loadingText="Sending…">
                                  Request approval
                                </ButtonLoader>
                              </button>
                            </span>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                {editingField === "gender" ? (
                  <span className="flex shrink-0 items-center gap-3 pt-6">
                    <button type="button" onClick={cancelEditing} disabled={isSavingProfile || requestSaving} className={mutedBtn}>
                      Cancel
                    </button>
                    {!userDetails?.gender && (
                      <button type="button" onClick={() => handleSaveField("gender")} disabled={isSavingProfile || !gender} className={linkBtn}>
                        <ButtonLoader loading={isSavingProfile} loadingText="Saving…">
                          Save
                        </ButtonLoader>
                      </button>
                    )}
                  </span>
                ) : (
                  <button type="button" onClick={() => startEditing("gender")} disabled={editingField !== null} className={cn(linkBtn, "shrink-0 pt-6")}>
                    {userDetails?.gender ? "Change" : "Add"}
                  </button>
                )}
              </li>
            </ul>
          </Panel>

          <AccountCard onLogout={handleLogout} />
        </div>
      )}

      {activeTab === "Security" && <SecuritySettings email={userDetails?.email} />}

      {activeTab === "Pickup Spots" && (
        <div className="flex flex-col gap-4">
          <Panel
            title="Pickup spots"
            description={`${pickupSpots.length}/3`}
            icon={MapPin}
            actions={
              <button type="button" onClick={handleAddPickupSpot} disabled={pickupSpots.length >= 3} className={btnPrimary}>
                <Plus className="h-4 w-4" aria-hidden="true" />
                Add
              </button>
            }
            padded={false}
          >
            {pickupLoading ? (
              <div className="space-y-3 p-4 sm:p-5" aria-hidden="true">
                {[0, 1].map((i) => (
                  <div key={i} className="browse-shimmer h-16 rounded-xl bg-neutral-100 dark:bg-white/5" />
                ))}
              </div>
            ) : pickupSpots.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-[14px] font-medium text-slate-700 dark:text-zinc-200">No pickup spots yet</p>
                <p className="mt-1 text-[13px] text-slate-500 dark:text-zinc-400">Add a familiar, public campus spot buyers can find easily.</p>
                <button type="button" onClick={handleAddPickupSpot} className={cn(btnPrimary, "mt-4")}>
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Add pickup spot
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-neutral-100 dark:divide-neutral-800">
                {pickupSpots.map((spot, index) => (
                  <li key={spot._id} className="flex items-center justify-between gap-3 px-4 py-3.5 sm:px-5">
                    <div className="flex min-w-0 items-center gap-3">
                      <span
                        className={cn(
                          "grid h-9 w-9 shrink-0 place-items-center rounded-lg",
                          spot.isPrimary ? "bg-[var(--accent)] text-white" : "bg-neutral-100 text-slate-500 dark:bg-white/5 dark:text-zinc-400",
                        )}
                      >
                        <MapPin className="h-4 w-4" aria-hidden="true" />
                      </span>
                      <div className="min-w-0">
                        <p className="flex items-center gap-2 text-[14px] font-semibold text-slate-900 dark:text-white">
                          <span className="truncate">{spot.name}</span>
                          {spot.isPrimary && (
                            <span className="shrink-0 rounded-md bg-[var(--accent-soft)] px-1.5 py-px text-[11px] font-semibold text-[var(--accent-text)]">Primary</span>
                          )}
                        </p>
                        <p className="truncate text-[12.5px] text-slate-500 dark:text-zinc-400">{spot.detail}</p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      {!spot.isPrimary && (
                        <button type="button" onClick={() => setPendingPrimaryId(spot._id)} className={cn(linkBtn, "max-sm:hidden")}>
                          Make primary
                        </button>
                      )}
                      <button type="button" onClick={() => handleEditPickupSpot(index)} className={mutedBtn}>
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteIndex(index)}
                        aria-label={`Delete ${spot.name}`}
                        className="grid h-8 w-8 place-items-center rounded-lg text-slate-400 transition hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <p className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-zinc-400" title="Never share your hostel room or home address">
            <ShieldCheck className="h-4 w-4 shrink-0 text-emerald-500" aria-hidden="true" />
            Public campus spots only
          </p>
        </div>
      )}

      {activeTab === "Chat" && (
        <ChatSettings
          user={userDetails}
          onSaved={(chat_settings) => {
            setUserDetails((prev) => (prev ? { ...prev, chat_settings } : prev));
            updateUserDetails({ chat_settings });
          }}
        />
      )}

      {activeTab === "Verification" && (
        <Panel title="Email verification">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3.5">
              <span
                className={cn(
                  "grid h-10 w-10 place-items-center rounded-xl",
                  userDetails?.is_email_verified
                    ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-300"
                    : "bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-300",
                )}
              >
                <Shield className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <p className="text-[15px] font-semibold text-slate-900 dark:text-white">
                  {userDetails?.is_email_verified ? "Your email is verified" : "Verification pending"}
                </p>
                <p className="text-[13px] text-slate-500 dark:text-zinc-400">{userDetails?.email || "No email on file"}</p>
              </div>
            </div>
            {!userDetails?.is_email_verified && (
              <button type="button" onClick={handleResendVerification} className={btnPrimary}>
                Resend verification email
              </button>
            )}
          </div>
        </Panel>
      )}

      <PickupSpotModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSavePickupSpot}
        initialData={editingIndex !== null ? pickupSpots[editingIndex] : { name: "", detail: "", isPrimary: false }}
        mode={editingIndex !== null ? "update" : "create"}
        pickupSpotId={editingIndex !== null ? pickupSpots[editingIndex]?._id : null}
      />

      <ConfirmDialog
        open={showCampusConfirm}
        title="Change campus?"
        message={`${
          listingsToMove !== null
            ? `Move ${listingsToMove} active listing${listingsToMove === 1 ? "" : "s"} to the new campus?`
            : "Move your live listings to the new campus?"
        } Buyers on your old campus will no longer see them.`}
        cancelLabel="Keep campus"
        confirmLabel="Move listings"
        loading={isSavingProfile}
        loadingLabel="Moving…"
        onCancel={() => setShowCampusConfirm(false)}
        onConfirm={() => handleSaveField("campus", true)}
      />
      <ConfirmDialog
        open={pendingDeleteIndex !== null}
        title="Delete pickup spot?"
        message={`“${pickupSpots[pendingDeleteIndex]?.name || ""}” will be removed. Listings using it keep their saved copy.`}
        confirmLabel="Delete"
        danger
        onCancel={() => setPendingDeleteIndex(null)}
        onConfirm={() => handleDeletePickupSpot(pendingDeleteIndex)}
      />
      <ConfirmDialog
        open={pendingPrimaryId !== null}
        title="Make this your primary spot?"
        message="New listings will use this spot by default."
        confirmLabel="Make primary"
        onCancel={() => setPendingPrimaryId(null)}
        onConfirm={() => handleSetPrimaryPickupSpot(pendingPrimaryId)}
      />

      <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={handleAvatarChange} />
    </AccountLayout>
  );
}

function ConfirmDialog({ open, title, message, confirmLabel, cancelLabel = "Cancel", danger, loading, loadingLabel, onCancel, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[999] flex items-end justify-center bg-black/50 backdrop-blur-sm sm:items-center sm:px-4" onClick={onCancel}>
      <div
        role="alertdialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-[420px] rounded-t-3xl border border-neutral-200 bg-white p-5 pb-[max(1.25rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-6 dark:border-neutral-800 dark:bg-[#1A1D20]"
      >
        <h2 className="text-[17px] font-semibold text-slate-900 dark:text-white">{title}</h2>
        <p className="mt-1.5 text-[13.5px] leading-relaxed text-slate-500 dark:text-zinc-400">{message}</p>
        <div className="mt-5 grid grid-cols-2 gap-2.5">
          <button type="button" onClick={onCancel} disabled={loading} className={cn(btnSecondary, "h-11")}>
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={cn(btnPrimary, "h-11", danger && "!bg-red-600 hover:!bg-red-700")}
          >
            <ButtonLoader loading={loading} loadingText={loadingLabel || "Working…"}>
              {confirmLabel}
            </ButtonLoader>
          </button>
        </div>
      </div>
    </div>
  );
}

function AccountCard({ onLogout }) {
  return (
    <Panel title="Account" padded={false}>
      <div className="flex items-center justify-between gap-4 px-4 py-4 sm:px-5">
        <div>
          <p className="text-[14.5px] font-medium text-slate-900 dark:text-white">Sign out</p>
          <p className="text-[12.5px] text-slate-500 dark:text-zinc-400">All devices</p>
        </div>
        <button type="button" onClick={onLogout} className={btnSecondary}>
          <LogOut className="h-4 w-4" aria-hidden="true" />
          Sign out
        </button>
      </div>
      <div className="flex items-center justify-between gap-4 border-t border-red-100 bg-red-50/40 px-4 py-4 sm:px-5 dark:border-red-900/30 dark:bg-red-950/10">
        <div>
          <p className="text-[14.5px] font-medium text-red-700 dark:text-red-400">Delete account</p>
          <p className="text-[12.5px] text-slate-500 dark:text-zinc-400">Permanent</p>
        </div>
        <AlertDialogDemo />
      </div>
    </Panel>
  );
}

export default Settings;
