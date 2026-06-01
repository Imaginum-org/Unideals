/* eslint-disable react/prop-types */
import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { toast } from "react-hot-toast";
import { Eye, Lock, Shield, X } from "lucide-react";

import { forgotPassword } from "../../../features/auth/api/authApi.js";

export default function SecuritySettings({ email }) {
  const [resetEmail, setResetEmail] = useState(email || "");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);

  const handleOpenChange = (open) => {
    setIsDialogOpen(open);
    if (open) setResetEmail(email || "");
  };

  const handleSendResetLink = async (event) => {
    event.preventDefault();

    if (!resetEmail) {
      toast.error("Please enter your email to reset password.");
      return;
    }

    try {
      setIsSendingReset(true);
      const response = await forgotPassword({ email: resetEmail });

      if (response.data.success) {
        toast.success("Password reset link sent successfully.");
        setIsDialogOpen(false);
      } else {
        toast.error(response.data.message || "Unable to send reset link.");
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to send reset link.");
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-6 shadow-sm dark:border-gray-800 dark:bg-[#1c1c1c]">
      <h2 className="mb-6 text-lg font-bold">Security Settings</h2>

      <div className="divide-y divide-[#EDF0F5]">
        <div className="flex min-h-[74px] items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F2F4F9] text-[#98A1B2]">
              <Lock size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold">Password</h3>
              <div className="mt-2 flex items-center gap-4 text-[#98A1B2]">
                <span className="text-base leading-none tracking-[5px]">
                  ............
                </span>
                <Eye size={16} />
              </div>
            </div>
          </div>

          <Dialog.Root open={isDialogOpen} onOpenChange={handleOpenChange}>
            <Dialog.Trigger asChild>
              <button className="text-sm font-semibold text-[#4F46FF]">
                Change
              </button>
            </Dialog.Trigger>

            <Dialog.Portal>
              <Dialog.Overlay className="fixed inset-0 z-[999] bg-black/60 backdrop-blur-[2px]" />
              <Dialog.Content className="fixed left-1/2 top-1/2 z-[1000] w-[90vw] max-w-[450px] -translate-x-1/2 -translate-y-1/2 rounded-[20px] bg-white p-6 shadow-2xl focus:outline-none dark:bg-[#1A1D20]">
                <div className="mb-6 flex items-center justify-between">
                  <Dialog.Title className="text-xl font-semibold text-[#111827] dark:text-white">
                    Reset Password
                  </Dialog.Title>
                  <Dialog.Close asChild>
                    <button className="text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                      <X size={24} />
                    </button>
                  </Dialog.Close>
                </div>

                <Dialog.Description className="mb-4 text-sm text-[#98A1B2]">
                  We will send a password reset link to your email address.
                </Dialog.Description>

                <form className="space-y-5" onSubmit={handleSendResetLink}>
                  <input
                    type="email"
                    placeholder="Your email address"
                    className="w-full rounded-xl border border-[#D8DDEA] bg-white p-3 text-sm outline-none focus:border-[#4F46FF] dark:bg-[#2D3339] dark:text-white"
                    value={resetEmail}
                    onChange={(event) => setResetEmail(event.target.value)}
                  />

                  <div className="flex gap-4 pt-2">
                    <Dialog.Close asChild>
                      <button
                        type="button"
                        className="flex-1 rounded-xl bg-gray-200 py-3 font-semibold text-gray-700 transition-colors hover:bg-gray-300 dark:bg-gray-700 dark:text-gray-200"
                      >
                        Cancel
                      </button>
                    </Dialog.Close>
                    <button
                      type="submit"
                      disabled={isSendingReset}
                      className="flex-1 rounded-xl bg-[#4F46FF] py-3 font-semibold text-white transition-colors hover:bg-[#3b34d7] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {isSendingReset ? "Sending..." : "Send Link"}
                    </button>
                  </div>
                </form>
              </Dialog.Content>
            </Dialog.Portal>
          </Dialog.Root>
        </div>

        <div className="flex min-h-[74px] items-center justify-between gap-4 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#DDFBE9] text-[#16A34A]">
              <Shield size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold">
                Two-Factor Authentication
              </h3>
              <p className="mt-1 text-sm font-medium text-[#98A1B2]">
                Extra layer of security
              </p>
            </div>
          </div>
          <span className="rounded-full bg-[#DDFBE9] px-3 py-1.5 text-xs font-bold text-[#16A34A]">
            Enabled
          </span>
        </div>
      </div>
    </section>
  );
}
