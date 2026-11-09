import OrderCard from "../../../features/user/components/OrderCard.jsx";
import { useState, useMemo, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  boostProduct,
  getBoostSummary,
  getUserProducts,
} from "../api/productApi.js";
import { toast } from "../../../components/ui/toast.js";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { Eye, FileClock, Package, Plus, Rocket } from "lucide-react";
import {
  AccountLayout,
  ErrorState,
  ListSkeleton,
  StatTile,
  TabBar,
  btnPrimary,
} from "../../user/components/account/AccountKit.jsx";
// Custom Tabs matching the new screenshot
const tabs = ["All", "Active", "Unlisted", "Sold"];

function ProductListed() {
  // ?tab=unlisted (e.g. after "Save as draft") opens that tab directly.
  const [searchParams, setSearchParams] = useSearchParams();
  const tabFromUrl = tabs.find((t) => t.toLowerCase() === (searchParams.get("tab") || "").toLowerCase());
  const [activeTab, setActiveTabState] = useState(tabFromUrl || "All");
  const setActiveTab = (tab) => {
    setActiveTabState(tab);
    const next = new URLSearchParams(searchParams);
    if (tab === "All") next.delete("tab");
    else next.set("tab", tab.toLowerCase());
    setSearchParams(next, { replace: true });
  };
  const [products, setProducts] = useState([]);
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [boostSummary, setBoostSummary] = useState(null);

  useEffect(() => {
    fetchUserProducts();
    fetchBoostSummary();
  }, []);

  const totalImpressions = useMemo(
    () => products.reduce((sum, p) => sum + Number(p.views_count || 0), 0),
    [products],
  );


  const fetchUserProducts = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await getUserProducts();
      if (res.data.success) {
        setProducts(res.data.data || []);
      }
    } catch (err) {
      setError(err?.response?.data?.message || "Failed to fetch products");
      toast.error("Failed to load your products");
    } finally {
      setLoading(false);
    }
  };

  const fetchBoostSummary = async () => {
    try {
      const res = await getBoostSummary();
      if (res.data?.success) {
        setBoostSummary(res.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch boost summary", err);
    }
  };

  const filteredProducts = useMemo(() => {
    const tab = (activeTab || "All").toLowerCase().trim();
    if (tab === "all") return products;

    return products.filter((p) => {
      const productStatus = (p.status || "").toLowerCase().trim();
      // Map "Sold" tab to "Delivered" status based on typical backend flows
      if (
        tab === "sold" &&
        (productStatus === "delivered" || productStatus === "sold")
      )
        return true;
      if (
        tab === "active" &&
        (productStatus === "listed" || productStatus === "active")
      )
        return true;
      // Drafts live with unlisted items: both are private to the seller.
      if (tab === "unlisted" && productStatus === "draft") return true;
      return productStatus === tab;
    });
  }, [activeTab, products]);

  // Badge counts per tab (from the list already in memory, no extra calls).
  const tabCounts = useMemo(() => {
    const c = { All: products.length, Active: 0, Unlisted: 0, Sold: 0 };
    for (const p of products) {
      const st = (p.status || "").toLowerCase();
      if (st === "listed" || st === "active") c.Active += 1;
      else if (st === "unlisted" || st === "draft") c.Unlisted += 1;
      else if (st === "sold" || st === "delivered") c.Sold += 1;
    }
    return c;
  }, [products]);

  const handleProductDeleted = (productId) => {
    setProducts((prev) => prev.filter((p) => p._id !== productId));
  };

  const handleProductUnlisted = (productId) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === productId ? { ...p, status: "UNLISTED" } : p)),
    );
  };

  const handleProductRelisted = (productId) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === productId ? { ...p, status: "LISTED" } : p)),
    );
  };

  const handleBoostProduct = async (productId) => {
    const res = await boostProduct(productId);
    const boostedProduct = res.data?.data?.product;

    if (res.data?.success && boostedProduct) {
      setProducts((prev) =>
        prev.map((p) =>
          p._id === productId ? { ...p, ...boostedProduct } : p,
        ),
      );

      if (res.data?.data?.usage) {
        setBoostSummary((prev) => ({
          ...prev,
          ...res.data.data.usage,
        }));
      }
    }

    return res;
  };

  // Merges a listing updated by a one-time paid boost purchase.
  const handleBoostApplied = (updatedProduct) => {
    if (!updatedProduct?._id) return;
    setProducts((prev) =>
      prev.map((p) =>
        p._id === updatedProduct._id ? { ...p, ...updatedProduct } : p,
      ),
    );
    fetchBoostSummary();
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

  return (
    <AccountLayout
      seoTitle="My listings | Unideals"
      title="My listings"
      description={`${tabCounts.Active} active · ${products.length} total`}
      actions={
        <button type="button" onClick={() => navigate("/upload")} className={btnPrimary}>
          <Plus className="h-4 w-4" aria-hidden="true" />
          List an item
        </button>
      }
    >
      {/* Stats: real numbers only */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile icon={Eye} label="Total views" value={totalImpressions.toLocaleString("en-IN")} />
        <StatTile icon={Package} label="Active" value={tabCounts.Active} tone="emerald" hint={`${tabCounts.Sold} sold`} />
        <StatTile icon={FileClock} label="Drafts & unlisted" value={tabCounts.Unlisted} tone="slate" />
        <StatTile
          icon={Rocket}
          label="Boosts left"
          value={boostSummary ? `${boostSummary.monthlyRemaining}/${boostSummary.monthlyLimit}` : "—"}
          tone="amber"
          hint={boostSummary ? `${boostSummary.activeBoosts}/${boostSummary.maxActiveBoosts} running` : undefined}
        />
      </div>

      <TabBar
        className="mb-4"
        ariaLabel="Filter listings"
        tabs={tabs.map((t) => ({ value: t, label: t, count: loading ? 0 : tabCounts[t] }))}
        value={activeTab}
        onChange={setActiveTab}
      />

      {loading ? (
        <ListSkeleton rows={3} />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchUserProducts} />
      ) : filteredProducts.length === 0 ? (
        <EmptyState
          variant="listings"
          title={
            activeTab === "All"
              ? "You haven't listed anything yet"
              : activeTab === "Active"
                ? "No live listings right now"
                : activeTab === "Unlisted"
                  ? "No unlisted items or drafts"
                  : "Nothing sold yet"
          }
          description={
            activeTab === "All" || activeTab === "Active"
              ? "Turn the stuff in your hostel room into cash. Listing takes about 2 minutes, and every student on your campus sees it."
              : activeTab === "Unlisted"
                ? "Drafts you save and listings you hide from buyers show up here. Pick up where you left off any time."
                : "Once you complete a deal with a buyer, the item moves here."
          }
          primaryAction={
            activeTab === "Unlisted" || activeTab === "Sold"
              ? { label: "View all listings", onClick: () => setActiveTab("All") }
              : { label: "List an item", to: "/upload", icon: Plus }
          }
        />
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          {filteredProducts.map((p) => (
            <OrderCard
              key={p._id}
              orderId={p._id}
              placedOn={fmtDate((p.status || "").toLowerCase() === "draft" ? p.updatedAt || p.createdAt : p.createdAt)}
              imageUrl={p.images?.[0]?.url || "/logo.svg"}
              name={p.title}
              status={p.status}
              price={p.selling_price}
              viewsCount={p.views_count || 0}
              onProductDeleted={handleProductDeleted}
              onProductUnlisted={handleProductUnlisted}
              onProductRelisted={handleProductRelisted}
              isBoosted={Boolean(p.is_boosted)}
              boostExpiresAt={p.boost_expires_at}
              boostTier={p.boost_tier}
              onBoostProduct={handleBoostProduct}
              onBoostApplied={handleBoostApplied}
            />
          ))}
        </div>
      )}
    </AccountLayout>
  );
}

export default ProductListed;
