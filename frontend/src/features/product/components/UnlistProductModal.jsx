import * as React from "react";
import * as AlertDialog from "@radix-ui/react-alert-dialog";
import "../../../styles/deletestyle.css";

function UnlistProductModal({
  isOpen,
  onClose,
  onConfirm,
  productName,
  isLoading,
}) {
  const handleConfirm = async () => {
    if (isLoading) return;
    await onConfirm();
    onClose();
  };

  return (
    <AlertDialog.Root open={isOpen} onOpenChange={onClose}>
      <AlertDialog.Portal>
        <AlertDialog.Overlay className="AlertDialogOverlay fixed inset-0 z-[999] bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-overlayShow" />

        <AlertDialog.Content className="AlertDialogContent fixed left-[50%] top-[50%] z-[1000] w-[90vw] md:w-[450px] translate-x-[-50%] translate-y-[-50%] bg-[#F7F8FA] dark:bg-[#1A1D20] rounded-lg">
          <AlertDialog.Title className="AlertDialogTitle text-black dark:text-white">
            Unlist this product?
          </AlertDialog.Title>
          <AlertDialog.Description className="AlertDialogDescription text-gray-600 dark:text-gray-400">
            <span className="font-semibold text-black dark:text-white">
              {productName}
            </span>{" "}
            will be removed from listings. You can relist it later from your
            archive.
          </AlertDialog.Description>
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
                className="Button mauve dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
                disabled={isLoading}
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
                onClick={handleConfirm}
                disabled={isLoading}
                className="Button violet dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
              >
                {isLoading ? "Unlisting..." : "Yes, unlist product"}
              </button>
            </AlertDialog.Action>
          </div>
        </AlertDialog.Content>
      </AlertDialog.Portal>
    </AlertDialog.Root>
  );
}

export default UnlistProductModal;
