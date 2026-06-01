import { useState, useMemo } from "react";
import Profile_left_part from "../components/Profile_left_part.jsx";
import TabSwitcher from "../components/manageorderanime.jsx";
import { MdShoppingBag } from "react-icons/md";
import MyOrdersCard from "../components/MyOrdersCard.jsx";

function Myorders() {
  const [activeTab, setActiveTab] = useState("All");

  // Mock data matching the new design & your card props
  const [orders, setOrders] = useState([
    {
      id: "130525-01",
      placedOn: "13-05-2025",
      imageUrl:
        "https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb?w=150&q=80",
      name: "Sony WH-1000XM4 Headphones",
      color: "Black",
      attr: "Wireless",
      status: "In progress",
      price: "750",
    },
    {
      id: "ORD-23",
      placedOn: "10-03-2024",
      imageUrl:
        "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=150&q=80",
      name: "MacBook Pro M1",
      color: "Space Grey",
      attr: "256GB SSD",
      status: "Delivered",
      price: "72,000",
    },
    {
      id: "ORD-18",
      placedOn: "22-01-2024",
      imageUrl:
        "https://images.unsplash.com/photo-1544244015-0df4b3ffc6b0?w=150&q=80",
      name: "iPad Pro 11-inch",
      color: "Silver",
      attr: "Wi-Fi Only",
      status: "Unlisted",
      price: "28,000",
    },
  ]);

  // Compute counts for the tabs
  const tabCounts = useMemo(() => {
    return {
      All: orders.length,
      "In progress": orders.filter(
        (o) => o.status.toLowerCase() === "in progress",
      ).length,
      Delivered: orders.filter((o) => o.status.toLowerCase() === "delivered")
        .length,
      Unlisted: orders.filter((o) => o.status.toLowerCase() === "unlisted")
        .length,
    };
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const tab = (activeTab || "All").toLowerCase().trim();
    if (tab === "all") return orders;
    return orders.filter((o) => (o.status || "").toLowerCase().trim() === tab);
  }, [activeTab, orders]);

  // Mock Handlers (These will trigger when actions are clicked in your card)
  const handleProductDeleted = (orderId) => {
    setOrders((prev) => prev.filter((order) => order.id !== orderId));
  };

  const handleProductUnlisted = (orderId) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: "Unlisted" } : order,
      ),
    );
  };

  const handleProductRelisted = (orderId) => {
    setOrders((prev) =>
      prev.map((order) =>
        order.id === orderId ? { ...order, status: "In progress" } : order,
      ),
    );
  };

  return (
    <div className="w-full h-screen overflow-hidden dark:bg-[#131313] bg-[#F7F9FD] font-figtree">
      <div className="flex h-[calc(100vh-70px)] ">
        {/* LEFT PANEL */}
        <div className="hidden md:block md:w-[37%] lg:w-[28%] xl:w-[25%] 2xl:w-[25%] bg-[#FFFFFF] dark:bg-[#131313] xl:pt-5  xl:pb-0 rounded-2xl lg:my-5 lg:ml-7">
          <Profile_left_part />
        </div>

        {/* RIGHT PANEL */}
        <div className="h-full w-full md:w-[63%] lg:w-[72%] xl:w-[75%] overflow-y-auto no-scrollbar bg-[#F7F9FD] dark:bg-[#131313] p-6 lg:p-8 xl:px-[10vh] xl:py-6 2xl:px-0">
          <div className="max-w-4xl mx-auto">
            {/* Header Section */}
            <div className="flex items-center gap-2 text-[1.2rem] lg:text-2xl xl:text-xl font-bold text-gray-900 dark:text-white mb-1">
              <h1>My Orders</h1>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-8 ">
              Manage your listings and orders
            </p>

            {/* Tabs */}
            <div className="mb-8">
              <TabSwitcher
                activeTab={activeTab}
                setActiveTab={setActiveTab}
                counts={tabCounts}
              />
            </div>

            {/* Orders List */}
            <div className="flex flex-col gap-6 pb-10">
              {filteredOrders.length === 0 ? (
                <div className="py-12 text-center text-gray-500 dark:text-gray-400 bg-white dark:bg-[#1c1c1c] rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                  No orders found for "{activeTab}"
                </div>
              ) : (
                filteredOrders.map((o) => (
                  <MyOrdersCard
                    key={o.id}
                    orderId={o.id}
                    placedOn={o.placedOn}
                    imageUrl={o.imageUrl}
                    name={o.name}
                    color={o.color}
                    attr={o.attr}
                    status={o.status}
                    price={o.price}
                    onProductDeleted={handleProductDeleted}
                    onProductUnlisted={handleProductUnlisted}
                    onProductRelisted={handleProductRelisted}
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
