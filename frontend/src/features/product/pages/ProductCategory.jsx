import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import ReactSlider from "react-slider";
import {PRODUCT_CATEGORY_OPTIONS} from "../constants/productOptions.js"
import ProductCard from "../../../features/product/components/ProductCard.jsx";
import { getBoostedProducts, getProducts } from "../api/productApi";

import { FaFilter, FaTimes } from "react-icons/fa";

const CategoryPage = () => {
  const { categoryName } = useParams();
  const navigate = useNavigate();
  const isBoostedPage = categoryName === "boosted-products";

  const [open, setOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [priceRange, setPriceRange] = useState([200, 500]);
  const [selectedCondition, setSelectedCondition] = useState("Excellent");
  const [sortBy, setSortBy] = useState("Latest");

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }, []);

  // FETCH PRODUCTS
  useEffect(() => {
    const fetchCategoryProducts = async () => {
      try {
        setLoading(true);

        const res = isBoostedPage
          ? await getBoostedProducts()
          : await getProducts({
              category: categoryName,
            });

        setProducts(res.data?.data || []);
      } catch (err) {
        setError("Failed to load products");
        console.log(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCategoryProducts();
  }, [categoryName, isBoostedPage]);

  //HANDLER
  const handleClear = () => {
    setPriceRange([200, 500]);
    setSelectedCondition("Excellent");
    setSortBy("Latest");
    setOpen(false);
  };

  const handleCategoryChange = (e) => {
    const value = e.target.value;
    if (value) {
      const slug = value.toLowerCase().replace(/\s+/g, "-");
      navigate(`/category/${slug}`);
    }
  };

  const SidebarContent = () => (
    <div className="flex flex-col gap-5 font-robotoFlex">
      <div>
        <h4 className="font-bold mb-3 dark:text-white text-sm">Category</h4>
        <select
          value={categoryName}
          onChange={handleCategoryChange}
          className="w-full p-2 border rounded-lg bg-transparent dark:border-zinc-700 dark:text-zinc-300 outline-none appearance-none cursor-pointer"
        >
          {isBoostedPage && (
            <option value="boosted-products">Boosted Products</option>
          )}
          {PRODUCT_CATEGORY_OPTIONS.map((category) => (
            <option key={category.value} value={category.value}>
              {category.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <h4 className="font-bold mb-6 dark:text-white text-sm">Price Range</h4>
        <div className="px-2">
          <ReactSlider
            className="w-full h-1 bg-zinc-200 dark:bg-zinc-700 rounded-full flex items-center"
            thumbClassName="size-4 bg-[#394FF1] border-2 border-white rounded-full cursor-grab active:cursor-grabbing outline-none"
            trackClassName="h-1 rounded-full"
            min={0}
            max={1000}
            value={priceRange}
            onAfterChange={(value) => setPriceRange(value)}
            minDistance={50}
          />
        </div>
        <div className="flex justify-between mt-4 text-[10px] text-zinc-400 font-bold uppercase">
          <div className="flex flex-col">
            <span>Min</span>
            <span className="text-zinc-800 dark:text-zinc-200">₹0</span>
          </div>
          <div className="flex flex-col items-center">
            <span>₹{priceRange[0]}</span>
          </div>
          <div className="flex flex-col items-center">
            <span>₹{priceRange[1]}</span>
          </div>
          <div className="flex flex-col items-end">
            <span>Max</span>
            <span className="text-zinc-800 dark:text-zinc-200">₹1000+</span>
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-bold mb-3 dark:text-white text-sm">Condition</h4>
        <div className="flex gap-3">
          {["Excellent", "Good"].map((c) => (
            <button
              key={c}
              onClick={() => setSelectedCondition(c)}
              className={`px-5 py-2 border rounded-lg text-xs font-bold transition-all ${
                selectedCondition === c
                  ? "border-[#394FF1] text-[#394FF1] bg-blue-50 dark:bg-blue-900/10"
                  : "border-zinc-200 dark:border-zinc-800 text-zinc-500"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-bold mb-3 dark:text-white text-sm">Sort By</h4>
        <div className="flex flex-col gap-3">
          {["Latest", "Price: Low to High", "Price: High to Low"].map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-3 p-3 border rounded-xl cursor-pointer dark:border-zinc-800"
            >
              <input
                type="radio"
                name="sort"
                checked={sortBy === opt}
                onChange={() => setSortBy(opt)}
                className="size-4 accent-[#394FF1]"
              />
              <span
                className={`text-xs ${
                  sortBy === opt ? "font-bold dark:text-white" : "text-zinc-500"
                }`}
              >
                {opt}
              </span>
            </label>
          ))}
        </div>
      </div>

      <button
        onClick={handleClear}
        className="mt-4 text-[#61758A] font-bold text-sm hover:underline"
      >
        Clear Filters
      </button>
    </div>
  );

  return (
    <div className="h-screen flex flex-col bg-[#F8F9FA] dark:bg-[#121212] overflow-hidden">
      <div className="flex flex-1 overflow-hidden px-4 lg:px-11">
        <aside className="hidden lg:block w-[340px] flex-shrink-0 my-6 rounded-3xl bg-white dark:bg-[#131313] px-8 py-9 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-zinc-100 dark:border-zinc-800/50 h-[calc(100vh-140px)] sticky top-6 self-start overflow-y-auto no-scrollbar">
          <h2 className="text-2xl font-bold mb-8 dark:text-white font-robotoFlex">
            Filters
          </h2>
          <SidebarContent />
        </aside>

        <main className="flex-1 overflow-y-auto no-scrollbar bg-transparent p-4 md:p-8 lg:pl-12">
          <div className="max-w-[1100px] mx-auto">
            <div className="mb-6">
              <h1 className="text-lg lg:text-xl xl:text-3xl font-bold capitalize text-[#121417] dark:text-white font-manrope">
                {isBoostedPage
                  ? "Boosted Products"
                  : categoryName.replace("_", " ")}
              </h1>

              {loading && <p>Loading...</p>}
              {error && <p className="text-red-500">{error}</p>}

              <p className="text-xs xl:text-base font-manrope text-zinc-400 mt-1">
                Showing {products.length} products in{" "}
                <span className="text-[#394FF1] font-semibold capitalize">
                  {isBoostedPage
                    ? "boosted products"
                    : categoryName.replace("_", " ")}
                </span>
              </p>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 lg:gap-6 pb-20">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </div>
        </main>
      </div>

      <button
        onClick={() => setOpen(true)}
        className="lg:hidden fixed bottom-6 right-6 z-40 bg-[#394FF1] text-white p-4 rounded-full shadow-2xl scale-110 active:scale-95 transition-transform"
      >
        <FaFilter />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setOpen(false)}
          ></div>
          <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#131313] rounded-t-[32px] p-8 max-h-[90vh] overflow-y-auto no-scrollbar shadow-2xl">
            <div className="flex justify-between items-center mb-8">
              <h2 className="text-2xl font-bold dark:text-white">Filters</h2>
              <button
                onClick={() => setOpen(false)}
                className="p-2 bg-zinc-100 dark:bg-zinc-800 rounded-full"
              >
                <FaTimes className="text-zinc-500" />
              </button>
            </div>
            <SidebarContent />
            <button
              onClick={() => setOpen(false)}
              className="w-full bg-[#394FF1] text-white py-4 rounded-2xl font-bold mt-8 shadow-lg shadow-blue-500/30"
            >
              Apply Filters
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CategoryPage;
