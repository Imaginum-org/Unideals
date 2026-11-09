import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import OrderDealCard from "../components/OrderDealCard.jsx";
import { AccountLayout, ErrorState, ListSkeleton, TabBar } from "../components/account/AccountKit.jsx";
import { fetchOrders } from "../api/ordersApi.js";
import { toast } from "../../../components/ui/toast.js";
import { acquireSocket, releaseSocket } from "../../../services/realtime.js";
import EmptyState from "../../../components/ui/EmptyState.jsx";
import { Compass, Plus } from "lucide-react";

const MODES = ["Buying", "Selling"];
const STATUS_CHIPS = ["All", "Active", "Completed", "Cancelled"];


function Myorders() {
  const [mode, setMode] = useState("Selling");

  // ---- Deals (synced with chat: same Deal source) ----
  const [orders, setOrders] = useState([]);
  const [counts, setCounts] = useState({});
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [ordersError, setOrdersError] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");

  const modeRef = useRef(mode);
  modeRef.current = mode;
  // Monotonic request id: a slow "Buying" response arriving after the user
  // switched to "Selling" must not overwrite the newer list.
  const requestSeqRef = useRef(0);

  const loadOrders = useCallback(
    async (silent = false) => {
      const seq = ++requestSeqRef.current;
      if (!silent) setOrdersLoading(true);
      setOrdersError("");
      try {
        const res = await fetchOrders({ role: modeRef.current === "Buying" ? "buying" : "selling", status: "all" });
        if (seq !== requestSeqRef.current) return;
        setOrders(res.orders || []);
        setCounts(res.counts || {});
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        if (!silent) {
          setOrdersError(err?.response?.data?.message || "Failed to load orders");
          toast.error("Failed to load orders");
        }
      } finally {
        if (seq === requestSeqRef.current) setOrdersLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setOrdersLoading(true);
    setStatusFilter("All");
    loadOrders();
  }, [mode, loadOrders]);

  // Live sync with chat over the shared tab socket. Bursts of events are
  // coalesced, and the safety-net poll only runs while the tab is visible
  // (was: a fresh connection per mode switch + a 10s poll even in
  // background tabs).
  useEffect(() => {
    let socket = null;
    try {
      socket = acquireSocket();
    } catch {
      socket = null;
    }
    let debounce = null;
    const refetch = () => {
      if (document.hidden) return;
      clearTimeout(debounce);
      debounce = setTimeout(() => loadOrders(true), 400);
    };
    socket?.on("deal:updated", refetch);
    socket?.on("conversation:updated", refetch);
    const t = setInterval(refetch, 30000);
    const onVisible = () => {
      if (!document.hidden) refetch();
    };
    window.addEventListener("focus", refetch);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(t);
      clearTimeout(debounce);
      window.removeEventListener("focus", refetch);
      document.removeEventListener("visibilitychange", onVisible);
      socket?.off("deal:updated", refetch);
      socket?.off("conversation:updated", refetch);
      releaseSocket(socket);
    };
  }, [loadOrders]);

  const visibleOrders = useMemo(() => {
    const f = (statusFilter || "All").toLowerCase();
    if (f === "all") return orders;
    if (f === "active") {
      return orders.filter((o) =>
        ["negotiating", "offer_accepted", "deal_confirmed", "pickup_scheduled", "payment_confirmed"].includes(o.dealStatus),
      );
    }
    return orders.filter((o) => (o.dealStatus || "") === f);
  }, [orders, statusFilter]);

  return (
    <AccountLayout
      seoTitle="Orders | Unideals"
      title="Orders"

      actions={
        <TabBar
          ariaLabel="Buying or selling"
          stretch
          tabs={MODES.map((m) => ({ value: m, label: m }))}
          value={mode}
          onChange={setMode}
        />
      }
    >
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <TabBar
          ariaLabel="Order status"
          tabs={STATUS_CHIPS.map((s) => ({ value: s, label: s, count: s === "All" ? counts.All : counts[s] }))}
          value={statusFilter}
          onChange={setStatusFilter}
        />
        <span
          className="inline-flex items-center gap-1.5 self-start rounded-full bg-emerald-50 px-2 py-0.5 text-[11.5px] font-semibold text-emerald-700 sm:self-auto dark:bg-emerald-950/40 dark:text-emerald-300"
          title="Updates instantly when anything changes in chat"
        >
          <span className="relative flex h-1.5 w-1.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-emerald-500" />
          </span>
          Live
        </span>
      </div>

      {ordersLoading ? (
        <ListSkeleton rows={3} />
      ) : ordersError ? (
        <ErrorState message={ordersError} onRetry={() => loadOrders()} />
      ) : visibleOrders.length === 0 ? (
        orders.length === 0 ? (
          mode === "Buying" ? (
            <EmptyState
              variant="orders"
              title="No purchases yet"
              description="Found something you like? Message the seller. Once you agree on a deal, track pickup and payment right here."
              primaryAction={{ label: "Find something", to: "/explore", icon: Compass }}
            />
          ) : (
            <EmptyState
              variant="orders"
              title="No sales yet"
              description="When a buyer messages you about a listing, the deal shows up here so you can run it end to end."
              primaryAction={{ label: "List an item", to: "/upload", icon: Plus }}
              secondaryAction={{ label: "My listings", to: "/productlisted" }}
            />
          )
        ) : (
          <EmptyState
            variant="orders"
            title={`No ${statusFilter.toLowerCase()} orders`}
            description="Nothing in this status right now. Switch filters to see your other deals."
            primaryAction={{ label: "Show all orders", onClick: () => setStatusFilter("All") }}
          />
        )
      ) : (
        <div className="flex flex-col gap-3 sm:gap-4">
          {visibleOrders.map((o) => (
            <OrderDealCard key={o.conversationId} order={o} onChanged={() => loadOrders(true)} />
          ))}
        </div>
      )}
    </AccountLayout>
  );
}

export default Myorders;
