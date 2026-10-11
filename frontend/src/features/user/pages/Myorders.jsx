import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { io } from "socket.io-client";
import { RefreshCw } from "lucide-react";
import Profile_left_part from "../components/Profile_left_part.jsx";
import OrderDealCard from "../components/OrderDealCard.jsx";
import BrandLoader from "../../../components/ui/BrandLoader.jsx";
import { fetchOrders } from "../api/ordersApi.js";
import { toast } from "../../../components/ui/toast.js";

const MODES = ["Buying", "Selling"];
const STATUS_CHIPS = ["All", "Active", "Completed", "Cancelled"];

const socketURL = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/api\/?$/, "") || undefined;

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

  const loadOrders = useCallback(
    async (silent = false) => {
      if (!silent) setOrdersLoading(true);
      setOrdersError("");
      try {
        const res = await fetchOrders({ role: modeRef.current === "Buying" ? "buying" : "selling", status: "all" });
        setOrders(res.orders || []);
        setCounts(res.counts || {});
      } catch (err) {
        if (!silent) {
          setOrdersError(err?.response?.data?.message || "Failed to load orders");
          toast.error("Failed to load orders");
        }
      } finally {
        setOrdersLoading(false);
      }
    },
    [],
  );

  useEffect(() => {
    setOrdersLoading(true);
    setStatusFilter("All");
    loadOrders();
  }, [mode, loadOrders]);

  // Live sync with chat: same socket events the chat emits.
  useEffect(() => {
    let socket;
    try {
      socket = io(socketURL, { withCredentials: true, transports: ["websocket", "polling"] });
    } catch {
      socket = null;
    }
    const refetch = () => loadOrders(true);
    socket?.on("deal:updated", refetch);
    socket?.on("conversation:updated", refetch);
    socket?.on("message:new", refetch);
    const t = setInterval(refetch, 10000);
    const onFocus = () => refetch();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(t);
      window.removeEventListener("focus", onFocus);
      try {
        socket?.disconnect();
      } catch {
        // ignore
      }
    };
  }, [mode, loadOrders]);

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
    <div className="w-full h-full overflow-hidden dark:bg-[#131313] bg-[#F7F9FD] font-figtree">
      <div className="flex h-[calc(100vh-70px)] ">
        <div className="hidden md:block md:w-auto md:shrink-0 bg-[#F7F8FA] dark:bg-[#131313] xl:pt-2 xl:pb-0">
          <Profile_left_part />
        </div>

        <div className="h-full md:flex-1 overflow-y-auto no-scrollbar bg-[#F7F9FD] dark:bg-[#131313] p-6 lg:p-8 xl:px-[5.7rem] xl:py-6">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center gap-2 text-[1.2rem] lg:text-xl xl:text-xl font-bold text-gray-900 dark:text-white mb-1">
              <h1>My Orders</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              {mode === "Buying"
                ? "Track every purchase: same stages as chat"
                : "Track every sale: same stages as chat"}
            </p>

            {/* Mode switch */}
            <div className="flex gap-2 mb-4">
              {MODES.map((m) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`flex-1 px-3 py-2 rounded-xl text-xs font-bold transition-all ${
                    mode === m
                      ? "bg-[#364EF2] text-white shadow"
                      : "bg-[#F7F8FA] dark:bg-[#1A1D20] text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700"
                  }`}
                >
                  {m}
                </button>
              ))}
            </div>

            <div className="mb-4 rounded-2xl border border-emerald-100 bg-emerald-50/60 px-4 py-3 text-[13px] font-medium leading-6 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-start gap-2">
              <RefreshCw size={15} className="shrink-0 mt-1" />
              <span>Synced with chat. Confirmations, pickup and payment update here instantly.</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-5">
              {STATUS_CHIPS.map((s) => {
                const count = s === "All" ? counts.All : counts[s];
                return (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-[12px] font-medium border transition-all ${
                      statusFilter === s
                        ? "bg-[#364EF2] border-[#364EF2] text-white"
                        : "bg-[#F7F8FA] dark:bg-[#1A1D20] border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
                    }`}
                  >
                    {s}
                    {(count || 0) > 0 && (
                      <span className="inline-flex min-w-[20px] h-[20px] px-1 items-center justify-center rounded-full text-[10px] font-bold leading-none bg-gray-100 dark:bg-gray-800 text-gray-500">
                        {count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            <div className="flex flex-col gap-6 pb-10">
              {ordersLoading ? (
                <div className="flex justify-center py-12">
                  <BrandLoader size="md" />
                </div>
              ) : ordersError ? (
                <div className="flex flex-col items-center gap-4 py-12 text-center bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl border border-gray-100 dark:border-gray-800">
                  <p className="text-sm font-medium text-red-500">{ordersError}</p>
                  <button
                    onClick={() => loadOrders()}
                    className="rounded-xl bg-[#3838EC] px-5 py-2.5 text-sm font-semibold text-white"
                  >
                    Retry
                  </button>
                </div>
              ) : visibleOrders.length === 0 ? (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400 bg-[#F7F8FA] dark:bg-[#1c1c1c] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  {orders.length === 0
                    ? mode === "Buying"
                      ? "No purchases yet. Chat with a seller to start an order."
                      : "No sales yet. Buyers who message you will appear here."
                    : `No orders under “${statusFilter}”`}
                </div>
              ) : (
                visibleOrders.map((o) => (
                  <OrderDealCard
                    key={o.conversationId}
                    order={o}
                    onChanged={() => loadOrders(true)}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Myorders;
