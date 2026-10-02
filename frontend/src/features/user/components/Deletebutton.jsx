import * as React from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import "../../../styles/deletestyle.css";
import { toast } from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import { Trash2 } from "lucide-react";

import { deleteAccount } from "../../../features/user/api/userApi.js";

function AlertDialogDemo() {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [password, setPassword] = React.useState("");

  const handleDeleteAccount = async () => {
    if (loading) return; // prevent double click
    if (!password) {
      toast.error("Please enter your password to confirm deletion.");
      return;
    }

    try {
      setLoading(true);

      const response = await deleteAccount({ password });

      if (response.data.success) {
        localStorage.removeItem("isAuthenticated");
        localStorage.removeItem("cachedUserDetails");
        localStorage.removeItem("accessToken");

        toast.success("Your account has been permanently deleted.");

        navigate("/signup");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <AlertDialog.Root>
        <AlertDialog.Trigger asChild>
          <button className="flex items-center gap-2 rounded-xl bg-[#FFE0E0] px-5 py-2.5 text-sm font-semibold text-[#EF4444] transition-all duration-300 hover:bg-[#f9c7c7]">
            <Trash2 size={17} />
            Delete
          </button>
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
          <AlertDialog.Overlay className="AlertDialogOverlay fixed inset-0 z-[999] bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-overlayShow" />

          <AlertDialog.Content className="AlertDialogContent fixed left-[50%] top-[50%] z-[1000] w-[90vw] md:w-[450px] translate-x-[-50%] translate-y-[-50%]">
            <AlertDialog.Title className="AlertDialogTitle">
              Are you absolutely sure?
            </AlertDialog.Title>
            <AlertDialog.Description
              style={{
                marginTop: 10,
              }}
              className="AlertDialogDescription"
            >
              This action cannot be undone. This will permanently delete your
              account and remove your data from our servers.
            </AlertDialog.Description>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-gray-700">
                Confirm with your password
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                autoComplete="current-password"
                className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm text-gray-900 outline-none focus:border-red-400 focus:ring-2 focus:ring-red-100"
              />
              <span className="mt-1.5 block text-xs text-gray-500">
                Signed up with Google? Set a password via Forgot Password
                first.
              </span>
            </label>
            <div
              style={{
                display: "flex",
                gap: 15,
                justifyContent: "flex-end",
                marginTop: 25,
              }}
            >
              <AlertDialog.Cancel asChild>
                <button
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                  className="Button mauve"
                >
                  Cancel
                </button>
              </AlertDialog.Cancel>
              <AlertDialog.Action asChild>
                <button
                  style={{
                    fontSize: 15,
                    fontWeight: 500,
                  }}
                  onClick={handleDeleteAccount}
                  disabled={loading}
                  className="Button red"
                >
                  {loading ? "Deleting..." : "Yes, delete account"}
                </button>
              </AlertDialog.Action>
            </div>
          </AlertDialog.Content>
        </AlertDialog.Portal>
      </AlertDialog.Root>
    </>
  );
}

export default AlertDialogDemo;
