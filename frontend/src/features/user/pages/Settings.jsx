/* eslint-disable react/prop-types */
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import {
  BadgeCheck,
  Camera,
  Home,
  LogOut,
  Mail,
  MapPin,
  Pencil,
  Phone,
  Plus,
  Shield,
  Trash2,
  User,
  Loader2,
  Zap,
} from "lucide-react";
import { uploadImage } from "../../../Utils/imageUpload.js";
import AvatarComponent from "../../../Components/common/AvatarComponent.jsx";
import Loader from "../../../Components/ui/Loader.jsx";
import { useUser } from "../../../context/useUserContext.jsx";
import { logoutUser } from "../../auth/api/authApi";
import AddressModal from "../components/AddressModal.jsx";
import AlertDialogDemo from "../components/Deletebutton.jsx";
import Profile_left_part from "../components/Profile_left_part.jsx";
import SecuritySettings from "../components/SecuritySettings.jsx";
import {
  createAddress,
  deleteAddress,
  getUserAddresses,
  getUserProfile,
  setDefaultAddress,
  updateAddress,
  updateAvatar,
  updateProfile,
  removeAvatar,
} from "../api/userApi";

const tabs = [
  "Profile",
  "Security",
  "Addresses",
  "Pickup Spots",
  "Verification",
];

const pickupSpots = [
  {
    id: "main-canteen",
    name: "Main Canteen",
    detail: "Ground floor, near entrance",
    isPrimary: true,
  },
  {
    id: "central-library",
    name: "Central Library",
    detail: "Lobby area, open till 9 PM",
  },
  {
    id: "main-gate",
    name: "Main Gate",
    detail: "Security cabin side",
  },
];

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
  const { userDetails: contextUserDetails, updateUserDetails } = useUser();

  const [activeTab, setActiveTab] = useState("Profile");
  const [userDetails, setUserDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [phone, setPhone] = useState("");
  const [gender, setGender] = useState("");
  const [isProfileEditing, setIsProfileEditing] = useState(false);
  const [profileChanged, setProfileChanged] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);

  const fileInputRef = useRef(null);

  const defaultAddress = useMemo(
    () => addresses.find((address) => address.isDefault),
    [addresses],
  );

  useEffect(() => {
    if (contextUserDetails) {
      setUserDetails(contextUserDetails);
      setPhone(contextUserDetails?.mobile || "");
      setGender(contextUserDetails?.gender || "");
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
        }
      } catch (err) {
        if (err.response?.status === 401) {
          localStorage.removeItem("isAuthenticated");
          localStorage.removeItem("cachedUserDetails");
          navigate("/login");
        } else {
          toast.error("Failed to load profile");
        }
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
  }, [contextUserDetails, navigate]);

  const fetchAddresses = async () => {
    try {
      const res = await getUserAddresses();
      if (res.data.success) setAddresses(res.data.addresses);
    } catch {
      toast.error("Failed to load addresses");
    }
  };

  useEffect(() => {
    fetchAddresses();
  }, []);

  const handleSaveProfile = async () => {
    if (!profileChanged) {
      setIsProfileEditing(false);
      return true;
    }

    try {
      setIsSavingProfile(true);
      const updateData = {};

      if (phone) updateData.mobile = phone.replace(/\D/g, "").slice(-10);
      if (gender) updateData.gender = gender;

      const res = await updateProfile(updateData);

      if (res.data.success) {
        toast.success("Profile updated successfully");
        setUserDetails(res.data.user);
        updateUserDetails(res.data.user);
        setPhone(res.data.user?.mobile || "");
        setGender(res.data.user?.gender || "");
        setProfileChanged(false);
        setIsProfileEditing(false);
        return true;
      }
      return false;
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to update profile");
      return false;
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAvatarChange = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;
    setIsUploadingAvatar(true);

    try {
      // Validate file type
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image.");
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
      console.error(err);

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
      console.error(err);

      toast.error(
        err?.response?.data?.message || "Failed to remove profile photo",
      );
    } finally {
      setIsRemovingAvatar(false);
    }
  };

  const handleAddAddress = () => {
    setEditingIndex(null);
    setIsModalOpen(true);
  };

  const handleEditAddress = (index) => {
    setEditingIndex(index);
    setIsModalOpen(true);
  };

  const handleSaveAddress = async (data) => {
    try {
      let res;
      if (editingIndex !== null) {
        res = await updateAddress(addresses[editingIndex]?._id, data);
      } else {
        res = await createAddress(data);
      }

      if (res.data.success) {
        toast.success("Address saved");
        await fetchAddresses();
        setIsModalOpen(false);
        setEditingIndex(null);
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || "Failed to save address");
    }
  };

  const handleDeleteAddress = async (index) => {
    try {
      await deleteAddress(addresses[index]?._id);
      toast.success("Address deleted");
      fetchAddresses();
    } catch {
      toast.error("Failed to delete address");
    }
  };

  const handleSetDefaultAddress = async (id) => {
    try {
      await setDefaultAddress(id);
      toast.success("Default address updated");
      fetchAddresses();
    } catch {
      toast.error("Failed to set default address");
    }
  };

  const handleLogout = async () => {
    try {
      const res = await logoutUser();

      if (res.data.success) {
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("cachedUserDetails");
        toast.success("Logged out successfully");
        navigate("/login");
      }
    } catch {
      toast.error("Logout failed");
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[#F5F6FA] dark:bg-[#131313]">
        <Loader />
      </div>
    );
  }

  const profileRows = [
    {
      label: "Full Name",
      value: userDetails?.name || "User",
      icon: User,
    },
    {
      label: "Email Address",
      value: userDetails?.email || "-",
      icon: Mail,
    },
    {
      label: "Phone",
      value: formatPhone(userDetails?.mobile),
      icon: Phone,
      editable: true,
      field: "phone",
    },
    {
      label: "Campus",
      value: defaultAddress?.line2 || defaultAddress?.city || "VIT Vellore",
      icon: MapPin,
    },
  ];

  return (
    <div className="h-screen w-full overflow-hidden bg-[#F7F9FD] font-figtree text-[#111827] dark:bg-[#131313] dark:text-white">
      <div className="flex h-[calc(100vh-70px)]">
        <aside className="hidden bg-white dark:bg-[#131313] md:block md:w-[22.5%] lg:w-[21%] xl:w-[20.5%] 2xl:w-[20.5%] xl:pt-2 xl:pb-0">
          <Profile_left_part />
        </aside>

        <main className="h-full w-full overflow-y-auto bg-[#F5F6FA] px-4 py-6 dark:bg-[#131313] sm:px-6 md:w-[77.5%] lg:w-[79%] lg:p-8 xl:w-[79.5%] xl:px-[5.7rem] xl:py-6 2xl:w-[79.5%]">
          <div className="mx-auto w-full max-w-5xl pb-8">
            <header className="mb-5">
              <h1 className="text-[1.4rem] font-bold leading-tight text-gray-900 dark:text-white lg:text-2xl xl:text-xl">
                Settings
              </h1>
              <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                Manage your account preferences
              </p>
            </header>

            <nav className="mb-6 flex max-w-fit gap-2 overflow-x-auto rounded-xl border border-[#E4E7EF] bg-[#F1F3F8] p-1">
              {tabs.map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`min-w-max rounded-lg px-3.5 py-2 text-sm font-medium transition ${
                    activeTab === tab
                      ? "bg-white text-[#111827] shadow-sm ring-1 ring-black/5"
                      : "text-[#98A1B2] hover:text-[#4B5563]"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>

            {activeTab === "Profile" && (
              <section className="space-y-6">
                <div className="rounded-2xl border border-gray-100 bg-white px-5 py-5 shadow-sm dark:border-gray-800 dark:bg-[#1c1c1c]">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-5">
                      <div className="relative">
                        <div className=" rounded-xl">
                          <AvatarComponent
                            name={userDetails?.name}
                            imageUrl={userDetails?.avatar.url}
                            plan={userDetails?.subscription}
                            size="large"
                            isLoading={loading}
                            className="rounded-xl object-cover"
                            shape="square"
                          />
                        </div>
                        <button
                          type="button"
                          disabled={isUploadingAvatar || isRemovingAvatar}
                          onClick={() => {
                            if (userDetails?.avatar?.url) {
                              handleRemoveAvatar();
                            } else {
                              fileInputRef.current?.click();
                            }
                          }}
                          className={`
  absolute
  -bottom-1.5
  -right-1.5
  z-40
  flex
  h-8
  w-8
  items-center
  justify-center
  rounded-full
  border-[3px]
  border-white
  text-white
  shadow-lg
  transition-all
  duration-200
  hover:scale-105
  active:scale-95
  disabled:cursor-not-allowed
  disabled:opacity-60
  ${
    userDetails?.avatar?.fileId
      ? "bg-red-500 hover:bg-red-600 shadow-red-500/25"
      : "bg-[#4F46FF] hover:bg-[#4338CA] shadow-[#4F46FF]/25"
  }
`}
                        >
                          {isUploadingAvatar || isRemovingAvatar ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : userDetails?.avatar?.fileId ? (
                            <Trash2 className="h-4 w-4" />
                          ) : (
                            <Camera className="h-4 w-4" />
                          )}
                        </button>
                      </div>

                      <div>
                        <div className="flex items-center gap-3">
                          <h2 className="text-lg font-bold">
                            {userDetails?.name || "User"}
                          </h2>
                          {userDetails?.is_email_verified && (
                            <BadgeCheck className="text-[#4F46FF]" size={18} />
                          )}
                        </div>
                        <p className=" text-[0.8rem]  font-medium text-gray-400">
                          VIT Vellore ·{" "}
                          {formatMemberSince(userDetails?.createdAt)}
                        </p>
                      </div>
                    </div>

                    {/* <button
                      type="button"
                      disabled={isUploadingAvatar || isRemovingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                      className="w-fit rounded-lg bg-[#EEF0FF] px-3.5 py-2 text-xs font-semibold text-[#4F46FF]"
                    >
                      {isUploadingAvatar ? "Uploading..." : "Change Photo"}
                    </button> */}
                    {/* 
                    <button
                      type="button"
                      onClick={handleRemoveAvatar}
                      disabled={isUploadingAvatar || isRemovingAvatar}
                      className="rounded-lg border border-red-500 px-3 py-2 text-xs font-medium text-red-500 hover:bg-red-50"
                    >
                      {isRemovingAvatar ? "Removing..." : "Remove Photo"}
                    </button> */}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1c1c1c]">
                  <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-base font-bold">
                      Personal Information
                    </h2>
                    <button
                      type="button"
                      onClick={() =>
                        isProfileEditing
                          ? handleSaveProfile()
                          : setIsProfileEditing(true)
                      }
                      disabled={isSavingProfile}
                      className="flex items-center gap-2 text-sm font-semibold text-[#4F46FF] disabled:opacity-60"
                    >
                      <Pencil size={17} />
                      {isProfileEditing
                        ? isSavingProfile
                          ? "Saving..."
                          : "Save"
                        : "Edit all"}
                    </button>
                  </div>

                  <div className="divide-y divide-[#EDF0F5]">
                    {profileRows.map((row) => {
                      const Icon = row.icon;

                      return (
                        <div
                          key={row.label}
                          className="flex min-h-[74px] items-center justify-between gap-4 py-4"
                        >
                          <div className="flex min-w-0 items-center gap-4">
                            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F2F4F9] text-[#98A1B2]">
                              <Icon size={15} />
                            </div>
                            <div className="min-w-0">
                              <div className="text-[0.68rem] font-medium uppercase tracking-normal text-[#98A1B2]">
                                {row.label}
                              </div>
                              {isProfileEditing && row.field === "phone" ? (
                                <input
                                  value={phone}
                                  onChange={(event) => {
                                    setPhone(event.target.value);
                                    setProfileChanged(true);
                                  }}
                                  placeholder="10 digit mobile number"
                                  className="mt-1.5 w-full rounded-xl border border-[#D8DDEA] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#4F46FF] dark:bg-[#252525] dark:text-white"
                                />
                              ) : (
                                <div className="mt-1 break-words text-[0.9rem] font-medium">
                                  {row.value}
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              if (row.editable) setIsProfileEditing(true);
                            }}
                            className={`text-sm font-semibold ${
                              row.editable
                                ? "text-[#4F46FF]"
                                : "cursor-not-allowed text-[#CBD1DD]"
                            }`}
                          >
                            Edit
                          </button>
                        </div>
                      );
                    })}

                    <div className="flex min-h-[74px] items-center justify-between gap-4 py-4">
                      <div className="flex min-w-0 items-center gap-4">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#F2F4F9] text-[#98A1B2]">
                          <User size={15} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-[0.68rem] font-medium uppercase tracking-normal text-[#98A1B2]">
                            Gender
                          </div>
                          {isProfileEditing ? (
                            <select
                              value={gender}
                              onChange={(event) => {
                                setGender(event.target.value);
                                setProfileChanged(true);
                              }}
                              className="mt-1.5 rounded-xl border border-[#D8DDEA] bg-white px-3 py-2 text-sm text-[#111827] outline-none focus:border-[#4F46FF] dark:bg-[#252525] dark:text-white"
                            >
                              <option value="">Select gender</option>
                              <option value="male">Male</option>
                              <option value="female">Female</option>
                              <option value="other">Other</option>
                            </select>
                          ) : (
                            <div className="mt-1 break-words text-[0.9rem] capitalize">
                              {userDetails?.gender || "Not added"}
                            </div>
                          )}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsProfileEditing(true)}
                        className="text-sm font-semibold text-[#4F46FF]"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>

                <AccountCard onLogout={handleLogout} />
              </section>
            )}

            {activeTab === "Security" && (
              <SecuritySettings email={userDetails?.email} />
            )}

            {activeTab === "Addresses" && (
              <section>
                <div className="grid gap-5 lg:grid-cols-2">
                  {addresses.map((address, index) => (
                    <AddressCard
                      key={address._id}
                      address={address}
                      index={index}
                      onEdit={() => handleEditAddress(index)}
                      onDelete={() => handleDeleteAddress(index)}
                      onSetDefault={() => handleSetDefaultAddress(address._id)}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={handleAddAddress}
                  disabled={addresses.length >= 3}
                  className="mt-5 flex h-10 w-full items-center justify-center rounded-xl bg-[#EEF0FF] text-sm font-semibold text-[#4F46FF] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Plus size={16} className="mr-1.5" />
                  Add new address
                </button>
              </section>
            )}

            {activeTab === "Pickup Spots" && (
              <section className="max-w-[770px]">
                <div className="mb-5 flex gap-4 rounded-2xl border border-[#CDD2FF] bg-[#F0F1FF] p-3 text-sm leading-7 text-[#526071]">
                  <MapPin className="mt-1 shrink-0 text-[#4F46FF]" size={15} />
                  <p>
                    Pickup spots are shared with buyers when they message you.
                    Set familiar campus locations so meetups are easy and safe.
                  </p>
                </div>

                <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1c1c1c]">
                  <h2 className="mb-5 text-base font-bold">
                    Your pickup spots
                  </h2>
                  <div className="space-y-4">
                    {pickupSpots.map((spot) => (
                      <div
                        key={spot.id}
                        className={`flex items-center justify-between rounded-2xl border p-4 ${
                          spot.isPrimary
                            ? "border-[#B8B6FF] bg-[#FAFAFF]"
                            : "border-[#E4E7EF] bg-[#FAFBFE]"
                        }`}
                      >
                        <div className="flex items-center gap-4">
                          <div
                            className={`flex h-8 w-8 items-center justify-center rounded-xl ${
                              spot.isPrimary
                                ? "bg-[#554BFF] text-white"
                                : "bg-[#E9ECF3] text-[#98A1B2]"
                            }`}
                          >
                            <MapPin size={16} />
                          </div>
                          <div>
                            <div className="flex flex-wrap items-center gap-3">
                              <h3 className="text-sm font-bold">{spot.name}</h3>
                              {spot.isPrimary && (
                                <span className="rounded-lg bg-[#5B4DFF] px-2 py-1 text-[0.65rem] font-medium text-white">
                                  Primary
                                </span>
                              )}
                            </div>
                            <p className="mt-1 text-xs font-medium text-[#98A1B2]">
                              {spot.detail}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-5">
                          {!spot.isPrimary && (
                            <button className="text-xs font-semibold text-[#4F46FF]">
                              Set primary
                            </button>
                          )}
                          <button className="text-[#98A1B2]">
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="mt-5 flex h-10 w-full items-center justify-center rounded-xl bg-[#EEF0FF] text-sm font-semibold text-[#4F46FF]"
                >
                  <Plus size={16} className="mr-1.5" />
                  Add pickup spot
                </button>
                <p className="mt-5 flex gap-2 text-sm font-medium text-[#98A1B2]">
                  <Zap className="shrink-0 text-[#FF7A30]" size={16} />
                  Pro tip: Always meet in well-lit public campus areas. Never
                  share your hostel room or home address.
                </p>
              </section>
            )}

            {activeTab === "Verification" && (
              <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1c1c1c]">
                <div className="flex items-center gap-4">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#DCFCE7] text-[#16A34A]">
                    <Shield size={18} />
                  </div>
                  <div>
                    <h2 className="text-base font-bold">
                      {userDetails?.is_email_verified
                        ? "Email verified"
                        : "Verification pending"}
                    </h2>
                    <p className=" text-xs text-[#98A1B2]">
                      Student verification workflow is not available here yet.
                    </p>
                  </div>
                </div>
              </section>
            )}

            <AddressModal
              isOpen={isModalOpen}
              onClose={() => setIsModalOpen(false)}
              onSave={handleSaveAddress}
              initialData={
                editingIndex !== null
                  ? addresses[editingIndex]
                  : { line1: "", line2: "", state: "", city: "", pincode: "" }
              }
              mode={editingIndex !== null ? "update" : "create"}
              addressId={
                editingIndex !== null ? addresses[editingIndex]?._id : null
              }
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/jpg"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </main>
      </div>
    </div>
  );
}

function AccountCard({ onLogout }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1c1c1c]">
      <h2 className="mb-5 text-base font-bold">Account</h2>

      <div className="flex items-center justify-between border-b border-[#E1E5EE] pb-5">
        <div>
          <h3 className="text-base font-medium">Sign out</h3>
          <p className="mt-1 text-xs font-medium text-[#98A1B2]">
            Sign out from all devices
          </p>
        </div>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-xl border border-[#E2E6EF] px-5 py-2.5 text-sm font-semibold text-[#4B5563]"
        >
          <LogOut size={17} />
          Sign out
        </button>
      </div>

      <div className="flex items-center justify-between pt-5">
        <div>
          <h3 className="text-base font-medium text-[#EF4444]">
            Delete account
          </h3>
          <p className="mt-1 text-xs font-medium text-[#98A1B2]">
            Permanent and irreversible
          </p>
        </div>
        <AlertDialogDemo />
      </div>
    </div>
  );
}

function AddressCard({ address, index, onEdit, onDelete, onSetDefault }) {
  const isCampus = index === 0 || address.isDefault;
  const title = isCampus ? "Campus" : "Home";
  const Icon = isCampus ? MapPin : Home;

  return (
    <article
      className={`rounded-2xl border bg-white px-5 py-4 shadow-sm dark:bg-[#1c1c1c] ${
        address.isDefault
          ? "border-[#514BFF] ring-2 ring-[#514BFF]"
          : "border-[#E2E6EF]"
      }`}
    >
      <div className="mb-1 flex items-start justify-between gap-4">
        <div className="flex items-center gap-2">
          <Icon
            size={15}
            className={address.isDefault ? "text-[#4F46FF]" : "text-[#98A1B2]"}
          />
          <h3 className="text-[0.95rem] font-semibold tracking-wide ">
            {title}
          </h3>
        </div>
        {address.isDefault ? (
          <span className="rounded-lg bg-[#DDFBE9] px-2.5 py-0.5 text-xs font-semibold text-[#16A34A]">
            Primary
          </span>
        ) : (
          <button
            type="button"
            onClick={onSetDefault}
            className="text-xs font-semibold text-[#4F46FF]"
          >
            Set primary
          </button>
        )}
      </div>

      <div className="min-h-[70px] text-[0.85rem] leading-6 text-[#334155] dark:text-[#D7D7D7]">
        <p>{address.line1}</p>
        {address.line2 && <p>{address.line2}</p>}
        <p>
          {address.city}, {address.state} {address.pincode}
        </p>
      </div>
      <div className="flex justify-between mt-4">
        <button
          type="button"
          onClick={onEdit}
          className="flex items-center gap-2 text-xs font-semibold text-[#4B5563] dark:text-[#D7D7D7]"
        >
          <Pencil size={14} />
          Edit
        </button>
        <button
          type="button"
          onClick={onDelete}
          className="flex items-center gap-2 text-xs font-semibold text-[#EF4444]"
        >
          <Trash2 size={14} />
          Delete
        </button>
      </div>
    </article>
  );
}

export default Settings;
