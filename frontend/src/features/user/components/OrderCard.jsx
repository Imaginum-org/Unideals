import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Crown, Eye, EyeOff, Lock, Pencil, RefreshCw, Rocket, Trash2 } from "lucide-react";
import DeleteProductModal from "../../product/components/DeleteProductModal.jsx";
import UnlistProductModal from "../../product/components/UnlistProductModal.jsx";
import RelistProductModal from "../../product/components/RelistProductModal.jsx";
import { deleteProduct, unlistProduct, relistProduct, getProductById } from "../../product/api/productApi.js";
import { createPaymentOrder, verifyPayment } from "../../payment/api/paymentApi.js";
import { useRazorpayCheckout } from "../../payment/hooks/useRazorpayCheckout.js";
import LimitModal from "../../../components/ui/LimitModal.jsx";
import { toast } from "../../../components/ui/toast.js";
import { productPath } from "../../../utils/productPath.js";
import { CARD, FLUSH_ON_PHONE, btnPrimary } from "./account/AccountKit.jsx";
import { cn } from "../../../utils/cn.js";

/*
 * One of the seller's own listings (My listings). Active: boost, paid
 * boosts, edit, unlist, delete. Unlisted: relist. Draft: continue to
 * publish. Sold: read-only. Clicking the card opens the listing (drafts
 * open the editor, since they aren't public).
 */
const BOOST_ADDONS = [
  { id: "boost_3day", label: "3-day", price: 29 },
  { id: "boost_7day", label: "7-day", price: 49 },
];

const OrderCard = ({
  orderId,
  placedOn,
  imageUrl,
  name,
  status,
  price,
  viewsCount = 0,
  onProductDeleted,
  onProductUnlisted,
  onProductRelisted,
  onBoostProduct,
  onBoostApplied,
  isBoosted = false,
  boostExpiresAt,
  boostTier,
}) => {
  const navigate = useNavigate();
  // Drafts are private and not on the public page yet: open the editor,
  // which restores the exact saved state (photos included) on Review.
  const handleCardClick = () => {
    const st = (status || "").toLowerCase().trim();
    navigate(st === "draft" ? `/upload/${orderId}` : productPath(orderId));
  };
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [unlistModalOpen, setUnlistModalOpen] = useState(false);
  const [relistModalOpen, setRelistModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUnlisting, setIsUnlisting] = useState(false);
  const [isRelisting, setIsRelisting] = useState(false);
  const [isBoosting, setIsBoosting] = useState(false);
  const [buyingAddon, setBuyingAddon] = useState(null);
  const [limitInfo, setLimitInfo] = useState(null);
  // Local paint guarantee: set on purchase success so the boosted visuals
  // appear instantly even if the parent list merge is delayed or skipped.
  // Cleared automatically once parent props reflect the boost.
  const [localBoost, setLocalBoost] = useState(null);
  const { openCheckout } = useRazorpayCheckout();

  // Parent caught up (or boost lapsed): drop the local override.
  useEffect(() => {
    if (!localBoost) return;
    const parentBoosted =
      isBoosted && new Date(boostExpiresAt || 0) > new Date();
    const lapsed = new Date(localBoost.expires_at || 0) <= new Date();
    if (parentBoosted || lapsed) setLocalBoost(null);
  }, [localBoost, isBoosted, boostExpiresAt]);

  const normalized = (status || "").toLowerCase().trim();
  const isActive =
    normalized === "listed" ||
    normalized === "active" ||
    normalized === "in progress";
  const isUnlisted = normalized === "unlisted";
  const isDraft = normalized === "draft";
  const isDelivered = normalized === "delivered" || normalized === "sold";
  // Parent props are the source of truth; localBoost (set at purchase)
  // paints instantly and yields once props catch up or the boost lapses.
  const effBoosted = isBoosted || Boolean(localBoost);
  const effExpiresAt = localBoost?.expires_at || boostExpiresAt;
  const effTier = localBoost?.tier || boostTier;
  const boostActive =
    effBoosted && new Date(effExpiresAt || 0) > new Date();
  const boostEndText = boostActive
    ? new Date(effExpiresAt).toLocaleString("en-IN", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  const normalizedBoostTier = (effTier || "").toLowerCase();
  const isProPlusBoost = normalizedBoostTier === "pro_plus";
  const isProBoost = normalizedBoostTier === "pro";
  const handleDeleteProduct = async () => {
    try {
      setIsDeleting(true);
      const res = await deleteProduct(orderId);
      if (res.data.success) {
        toast.success("Product deleted successfully");
        if (onProductDeleted) onProductDeleted(orderId);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to delete product");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleUnlistProduct = async () => {
    try {
      setIsUnlisting(true);
      const res = await unlistProduct(orderId);
      if (res.data.success) {
        toast.success("Product unlisted successfully");
        if (onProductUnlisted) onProductUnlisted(orderId);
      }
    } catch (error) {
      toast.error(error?.response?.data?.message || "Failed to unlist product");
    } finally {
      setIsUnlisting(false);
    }
  };

  const handleRelistProduct = async () => {
    try {
      setIsRelisting(true);
      const res = await relistProduct(orderId);
      if (res.data.success) {
        toast.success("Product relisted successfully");
        if (onProductRelisted) onProductRelisted(orderId);
      }
    } catch (error) {
      const code = error?.response?.data?.code;
      const message =
        error?.response?.data?.message || "Failed to relist product";
      // Relisting reactivates against the plan cap: show upgrade modal.
      if (code === "LISTING_LIMIT" || /listing limit/i.test(message)) {
        setLimitInfo({ message });
      } else {
        toast.error(message);
      }
    } finally {
      setIsRelisting(false);
    }
  };

  const handleBoostProduct = async (e) => {
    e.stopPropagation();

    if (isBoosting || boostActive) return;

    try {
      setIsBoosting(true);
      const res = await onBoostProduct?.(orderId);

      if (res?.data?.success) {
        toast.success(res.data.message || "Product boosted successfully");
      }
    } catch (error) {
      const status = error?.response?.status;
      const msg = error?.response?.data?.message || "Failed to boost product";
      // Quota exhausted (403): paid options are visible below + upgrade link.
      if (status === 403 || /limit reached/i.test(msg)) {
        toast.error("Boost quota exhausted. Buy an extra boost or upgrade below");
      } else {
        toast.error(msg);
      }
    } finally {
      setIsBoosting(false);
    }
  };

  // One-time paid boost (₹29/₹49): server order -> Checkout -> verify.
  // buyingAddon guards double orders from double clicks.
  const handleBuyAddon = async (e, addon) => {
    e.stopPropagation();

    if (buyingAddon || boostActive) return;
    setBuyingAddon(addon.id);
    try {
      const orderRes = await createPaymentOrder({
        plan: addon.id,
        productId: orderId,
      });
      const { orderId: rzpOrderId, amount, currency, keyId } = orderRes.data?.data || {};
      if (!rzpOrderId) throw new Error("Unable to initiate payment");

      const paymentRes = await openCheckout({
        orderId: rzpOrderId,
        amount,
        currency,
        planName: `${addon.label} Boost`,
        description: `${addon.label} Listing Boost`,
        keyId,
      });

      const verifyRes = await verifyPayment({
        razorpay_order_id: paymentRes.razorpay_order_id,
        razorpay_payment_id: paymentRes.razorpay_payment_id,
        razorpay_signature: paymentRes.razorpay_signature,
      });

      if (verifyRes.data?.success) {
        toast.success("Boost purchased! Your listing is now boosted.");
        // Prefer the product in the verify response; fall back to a fresh
        // fetch so the boosted border paints immediately even if the
        // response shape ever drifts.
        let updated = verifyRes.data?.data?.product;
        if (!updated?._id) {
          try {
            const fresh = await getProductById(orderId, {}, { fresh: true });
            updated = fresh.data?.data || fresh.data?.product;
          } catch {
            updated = null;
          }
        }
        if (updated?.boost_expires_at) {
          setLocalBoost({
            expires_at: updated.boost_expires_at,
            tier: updated.boost_tier,
          });
        }
        if (updated && onBoostApplied) onBoostApplied(updated);
      }
    } catch (error) {
      if (error?.message !== "Payment cancelled") {
        toast.error(
          error?.response?.data?.message ||
            error?.message ||
            "Boost purchase failed. Please try again.",
        );
      }
    } finally {
      setBuyingAddon(null);
    }
  };

  const statusPill = isDelivered
    ? { label: "Sold", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" }
    : isDraft
      ? { label: "Draft", cls: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300" }
      : isUnlisted
        ? { label: "Unlisted", cls: "bg-neutral-100 text-slate-600 dark:bg-white/5 dark:text-zinc-300" }
        : { label: "Active", cls: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" };
  const boostRing = isProPlusBoost
    ? "ring-2 ring-amber-400/50 border-amber-300 dark:border-amber-500/60"
    : "ring-2 ring-[var(--accent-ring)] border-[var(--accent-soft-strong)]";
  const stop = (fn) => (e) => {
    e.stopPropagation();
    fn(e);
  };

  return (
    <article
      onClick={handleCardClick}
      className={cn(CARD, FLUSH_ON_PHONE, "group cursor-pointer overflow-hidden transition-shadow hover:shadow-md", boostActive && boostRing)}
    >
      {boostActive && (
        <div
          className={cn(
            "flex items-center justify-between gap-2 px-4 py-1.5 text-[12px] font-semibold sm:px-5",
            isProPlusBoost
              ? "bg-gradient-to-r from-amber-100 to-yellow-50 text-amber-800 dark:from-amber-950/40 dark:to-transparent dark:text-amber-200"
              : "bg-[var(--accent-soft)] text-[var(--accent-text)]",
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <Rocket className="h-3.5 w-3.5" aria-hidden="true" />
            {isProPlusBoost ? "Pro+ boost" : isProBoost ? "Pro boost" : "Boosted"}
          </span>
          <span className="font-medium opacity-80">Ends {boostEndText}</span>
        </div>
      )}

      <div className="flex items-start gap-3.5 px-4 py-4 sm:px-5">
        <img
          src={imageUrl}
          alt={name || "Listing"}
          loading="lazy"
          className="h-16 w-16 shrink-0 rounded-xl border border-neutral-100 bg-neutral-100 object-cover sm:h-[72px] sm:w-[72px] dark:border-neutral-800 dark:bg-white/5"
        />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-900 group-hover:text-[var(--accent-text)] dark:text-white">
              {name}
            </h3>
            <p className="shrink-0 text-[16px] font-bold tabular-nums text-slate-900 dark:text-white">
              ₹{Number(price || 0).toLocaleString("en-IN")}
            </p>
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-slate-500 dark:text-zinc-400">
            <span className={cn("rounded-md px-1.5 py-0.5 text-[11px] font-semibold", statusPill.cls)}>{statusPill.label}</span>
            <span>
              {isDraft ? "Saved" : "Listed"} {placedOn}
            </span>
            {(isActive || isUnlisted || isDelivered) && (
              <span className="inline-flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                {Number(viewsCount || 0).toLocaleString("en-IN")} views
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="flex flex-wrap items-center gap-2 border-t border-neutral-100 bg-neutral-50/60 px-4 py-3 sm:px-5 dark:border-neutral-800 dark:bg-white/[0.02]"
        onClick={(e) => e.stopPropagation()}
      >
        {isActive && (
          <>
            <button
              type="button"
              onClick={handleBoostProduct}
              disabled={isBoosting || boostActive}
              className={cn(btnPrimary, boostActive && "!bg-emerald-600 !opacity-100")}
            >
              <Rocket className="h-4 w-4" aria-hidden="true" />
              {isBoosting ? "Boosting…" : boostActive ? "Boost active" : "Boost"}
            </button>
            {!boostActive && (
              <>
                {BOOST_ADDONS.map((addon) => (
                  <button
                    key={addon.id}
                    type="button"
                    onClick={(e) => handleBuyAddon(e, addon)}
                    disabled={buyingAddon !== null}
                    className="inline-flex h-9 items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 text-[12.5px] font-semibold text-amber-800 transition-colors hover:bg-amber-100 disabled:opacity-50 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
                    title={`One-time ${addon.label} boost`}
                  >
                    {buyingAddon === addon.id ? "…" : `${addon.label} · ₹${addon.price}`}
                  </button>
                ))}
              </>
            )}
            <div className="ml-auto flex items-center gap-1.5">
              <IconAction icon={Pencil} label="Edit" onClick={stop(() => navigate(`/upload/${orderId}`))} />
              <IconAction icon={EyeOff} label={isUnlisting ? "…" : "Unlist"} onClick={stop(() => setUnlistModalOpen(true))} disabled={isUnlisting} />
              <IconAction icon={Trash2} label="Delete" danger onClick={stop(() => setDeleteModalOpen(true))} disabled={isDeleting} />
            </div>
          </>
        )}

        {isUnlisted && (
          <>
            <button type="button" onClick={stop(() => setRelistModalOpen(true))} disabled={isRelisting} className={btnPrimary}>
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
              {isRelisting ? "Relisting…" : "Relist"}
            </button>
            <div className="ml-auto flex items-center gap-1.5">
              <IconAction icon={Pencil} label="Edit" onClick={stop(() => navigate(`/upload/${orderId}`))} />
              <IconAction icon={Trash2} label="Delete" danger onClick={stop(() => setDeleteModalOpen(true))} disabled={isDeleting} />
            </div>
          </>
        )}

        {isDraft && (
          <>
            <button type="button" onClick={stop(() => navigate(`/upload/${orderId}`))} className={btnPrimary}>
              <Pencil className="h-4 w-4" aria-hidden="true" />
              Continue &amp; publish
            </button>
            <span className="inline-flex items-center gap-1 text-[12px] text-slate-400 dark:text-zinc-500" title="Drafts are private until you publish">
              <Lock className="h-3.5 w-3.5" aria-hidden="true" />
              Private
            </span>
            <div className="ml-auto">
              <IconAction icon={Trash2} label="Delete" danger onClick={stop(() => setDeleteModalOpen(true))} disabled={isDeleting} />
            </div>
          </>
        )}

        {isDelivered && (
          <p className="inline-flex items-center gap-1.5 text-[12.5px] font-medium text-emerald-700 dark:text-emerald-300">
            <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
            Sold
          </p>
        )}

        {isActive && !boostActive && (
          <button
            type="button"
            onClick={stop(() => navigate("/price"))}
            title="Monthly boosts come with Pro"
            className="inline-flex h-9 items-center gap-1 rounded-lg px-2 text-[12px] font-semibold text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30"
          >
            <Crown className="h-3.5 w-3.5" aria-hidden="true" />
            Pro
          </button>
        )}
      </div>

      <DeleteProductModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteProduct}
        productName={name}
        isLoading={isDeleting}
      />
      <UnlistProductModal
        isOpen={unlistModalOpen}
        onClose={() => setUnlistModalOpen(false)}
        onConfirm={handleUnlistProduct}
        productName={name}
        isLoading={isUnlisting}
      />
      <RelistProductModal
        isOpen={relistModalOpen}
        onClose={() => setRelistModalOpen(false)}
        onConfirm={handleRelistProduct}
        productName={name}
        isLoading={isRelisting}
      />
      {limitInfo && <LimitModal title="You're out of listings" message={limitInfo.message} onClose={() => setLimitInfo(null)} />}
    </article>
  );
};

function IconAction({ icon: Icon, label, onClick, danger, disabled }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex h-9 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2.5 text-[13px] font-medium transition-colors disabled:opacity-50 dark:border-neutral-700 dark:bg-[#1A1D20]",
        danger
          ? "text-red-600 hover:border-red-200 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/20"
          : "text-slate-600 hover:bg-neutral-50 hover:text-slate-900 dark:text-zinc-300 dark:hover:bg-white/5",
      )}
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      <span className="max-sm:hidden">{label}</span>
    </button>
  );
}

export default OrderCard;
