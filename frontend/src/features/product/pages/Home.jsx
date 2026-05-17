import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";

import Category from "../../../features/product/components/Category.jsx";
import ProductCard from "../../../features/product/components/ProductCard.jsx";
import Footer from "../../../Components/layout/Footer.jsx";

import { getProducts } from "../api/productApi";

import { IoIosArrowForward } from "react-icons/io";
import { Swiper, SwiperSlide } from "swiper/react";
import { Pagination, A11y, Autoplay } from "swiper/modules";

import { motion } from "framer-motion";

import "swiper/css";
import "swiper/css/pagination";

import bannerRight from "/bannerRight.png";

const Home = () => {
  const sliderRef = useRef(null);

  //drag state using refs (no re-render bugs)
  const isDownRef = useRef(false);
  const startXRef = useRef(0);
  const scrollLeftRef = useRef(0);
  const isDraggingRef = useRef(false);

  const onMouseDown = (e) => {
    if (!sliderRef.current) return;
    isDownRef.current = true;
    isDraggingRef.current = false;
    startXRef.current = e.pageX - sliderRef.current.offsetLeft;
    scrollLeftRef.current = sliderRef.current.scrollLeft;
  };

  const onMouseUp = () => {
    isDownRef.current = false;
  };

  const onMouseLeave = () => {
    isDownRef.current = false;
  };

  const onMouseMove = (e) => {
    if (!isDownRef.current || !sliderRef.current) return;

    const x = e.pageX - sliderRef.current.offsetLeft;
    const walk = (x - startXRef.current) * 2;

    if (Math.abs(walk) > 5) isDraggingRef.current = true;

    sliderRef.current.scrollLeft = scrollLeftRef.current - walk;
  };

  //STATE
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState([]);
  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);

  const [error, setError] = useState(null);

  //FETCH
  const fetchProducts = useCallback(
    async (pageNumber = 1) => {
      if (loading || !hasMore) return;

      try {
        setLoading(true);
        if (pageNumber === 1) setInitialLoading(true);

        const res = await getProducts({
          page: pageNumber,
          limit: 10,
        });

        const newProducts = res.data?.data || [];
        const pagination = res.data?.pagination || {};

        setProducts((prev) => {
          const existing = new Set(prev.map((p) => p._id));
          const filtered = newProducts.filter((p) => !existing.has(p._id));
          return [...prev, ...filtered];
        });

        if (!pagination.totalPages || pageNumber >= pagination.totalPages) {
          setHasMore(false);
        }

        setPage(pageNumber);
      } catch (err) {
        setError("Failed to load products");
      } finally {
        setLoading(false);
        setInitialLoading(false);
      }
    },
    [loading, hasMore],
  );

  useEffect(() => {
    fetchProducts(1);
  }, [fetchProducts]);

  // INFINITE SCROLL
  const observerRef = useRef();

  const lastProductRef = useCallback(
    (node) => {
      if (loading || !hasMore) return;

      if (observerRef.current) observerRef.current.disconnect();

      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting) {
          fetchProducts(page + 1);
        }
      });

      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, page, fetchProducts],
  );

  return (
    <motion.div className="w-full bg-white dark:bg-[#131313] relative">
      <div className="flex flex-col">
        {/* Blue banner code */}
        <motion.div
          className="relative w-[91vw] mx-auto mt-4 mb-3
    flex
    rounded-lg md:rounded-xl
    bg-gradient-to-l from-blue-600 to-indigo-600
    min-h-[22vh]
    sm:min-h-[35vh]
    md:min-h-[25vh]
    lg:min-h-[22vh]
    xl:h-[44vh]
    2xl:min-h-[40vh]
    shadow-[0_8px_20px_rgba(0,0,0,0.15)]
  "
        >
          <Swiper
            modules={[Pagination, A11y, Autoplay]}
            spaceBetween={30}
            slidesPerView={1}
            pagination={{ clickable: true }}
            autoplay={{
              delay: 4000,
              disableOnInteraction: false,
            }}
            loop={true}
            speed={900}
            className="dark:bg-zinc-900 rounded-md md:rounded-xl"
          >
            {/* Slide 1 */}
            <SwiperSlide>
              <img
                width={170}
                src="\assets\circle.png"
                alt="image"
                className="absolute bottom-0 xl:left-72 lg:left-48 md:left-40 md:bottom-[-1.3vh] lg:bottom-0 hidden md:block "
              />
              <div className="flex h-full w-full items-center justify-between xl:px-20 lg:px-14 md:px-10 px-5 relative">
                {/* Left Content */}
                <motion.div className="text-white w-[70%]">
                  <h1 className="hidden md:block lg:text-[2.5vw] xl:text-[2.2vw] md:text-[2.7vw] text-[0.85rem] font-extrabold leading-tight font-figtree">
                    Unlock Deals, Share Essentials,{" "}
                    <br className="hidden md:block" />
                    Simplify Campus Living!
                  </h1>
                  <h1 className="md:hidden lg:text-[2.5vw] xl:text-[2.2vw] md:text-[2.7vw] text-[0.85rem] font-extrabold leading-tight font-figtree">
                    Unlock Deals, Essentials, <br className="hidden md:block" />
                    Simplify Campus Living!
                  </h1>

                  <p className="hidden md:block lg:text-[1.7vw] xl:text-[1.4vw] md:text-[2vw] text-[0.7rem] lg:leading-7 md:leading-5  text-gray-200 font-medium mt-2 font-figtree">
                    Your trusted platform to simplify student life
                    <br className="hidden sm:block" /> Buy, sell & connect
                    easily.
                  </p>
                  <p className="md:hidden text-[clamp(0.7rem,1.5vw,1.2rem)] lg:leading-7 md:leading-5  text-gray-200 font-medium mt-2 font-figtree">
                    Your trusted platform to simplify
                    <br className="hidden sm:block" /> Buying, selling & connect
                    easily.
                  </p>
                  <Link
                    to="/upload"
                    className="bg-white text-[#364EF2] font-bold rounded-md md:py-2 xl:py-2 lg:py-[0.5vh] xl:px-11 lg:px-7 xl:text-xl lg:text-lg md:text-base text-xs inline-flex lg:mt-4 xl:mt-6 md:mt-4 mt-3 shadow-md transition-transform transform lg:hover:scale-105 py-[0.7vh] px-4 font-robotoFlex duration-500 ease-in-out dark:bg-gradient-to-r from-blue-600 to-indigo-600 dark:text-white"
                  >
                    Sell Now
                  </Link>
                </motion.div>

                {/* Right Image Section */}
                <div className="relative w-[50%] flex justify-center items-center">
                  <motion.img
                    src="/assets/Group_115.png"
                    alt="Background Shape"
                    className="absolute md:size-[32vw] xl:size-[25vw] lg:size-[25vw] size-[30vw] md:h-80 lg:h-[28vh] h-56 z-0"
                  />
                  <motion.img
                    src={bannerRight}
                    alt="Main Visual"
                    className="absolute xl:size-[26vw] lg:size-[33vw] md:size-[35vw] xl:mt-20 lg:mt-16 size-[45vw] z-10 mt-10"
                  />
                </div>
              </div>
            </SwiperSlide>

            {/* Slide 2 */}
            <SwiperSlide>
              <img
                width={170}
                src="\assets\circle.png"
                alt="image"
                className="absolute bottom-0 xl:left-72 lg:left-48 md:left-40 md:bottom-[-1.3vh] lg:bottom-0 hidden md:block"
              />

              <div className="flex h-full w-full items-center justify-between xl:px-20 lg:px-14 md:px-10 px-5 relative">
                {/* Left Content */}
                <motion.div className="text-white w-1/2">
                  <h1 className="lg:text-[2.5vw] xl:text-[2.2vw] md:text-[2.7vw] text-[0.85rem] font-bold leading-tight font-figtree">
                    Find What You Need, <br />
                    Sell What You Dont!
                  </h1>
                  <p className="hidden md:block lg:text-[1.7vw] xl:text-[1.4vw] md:text-[2vw] text-[0.7rem] lg:leading-7 md:leading-5  text-gray-200 font-medium mt-2 font-figtree">
                    The perfect place to buy, sell, and discover
                    <br className="hidden sm:block" /> amazing deals all in one
                    spot!
                  </p>
                  <p className="md:hidden lg:text-[1.7vw] xl:text-[1.4vw] md:text-[2vw] text-[0.7rem] lg:leading-7 md:leading-5  text-gray-200 font-medium mt-2 font-figtree">
                    One place to buy, sell, and discover
                    <br className="hidden sm:block" /> great deals.
                  </p>
                  <Link
                    to="/upload"
                    className="bg-white text-[#364EF2] font-bold rounded-md md:py-2 xl:py-2 lg:py-[0.5vh] xl:px-11 lg:px-7 xl:text-xl lg:text-lg md:text-base text-xs inline-flex lg:mt-4 xl:mt-6 md:mt-4 mt-3 shadow-md transition-transform transform lg:hover:scale-105 py-[0.8vh] px-5 font-robotoFlex duration-500 ease-in-out dark:bg-gradient-to-r from-blue-600 to-indigo-600 dark:text-white"
                  >
                    Explore Now
                  </Link>
                </motion.div>

                {/* Right Image Section */}
                <div className="relative w-[50%] flex justify-center items-center">
                  <motion.img
                    src="/assets/Group_115.png"
                    alt="Background Shape"
                    className="absolute md:size-[32vw] xl:size-[25vw] lg:size-[25vw] size-[30vw] md:h-80 lg:h-[28vh] h-56 z-0"
                  />
                  <motion.img
                    src={bannerRight}
                    alt="Main Visual"
                    className="absolute xl:size-[26vw] lg:size-[33vw] md:size-[35vw] xl:mt-20 lg:mt-16 size-[45vw] z-10 mt-10"
                  />
                </div>
              </div>
            </SwiperSlide>

            {/* Slide 3 */}
            <SwiperSlide>
              <img
                width={170}
                src="\assets\circle.png"
                alt="image"
                className="absolute bottom-0 xl:left-72 lg:left-48 md:left-40 md:bottom-[-1.3vh] lg:bottom-0 hidden md:block"
              />

              <div className="flex h-full w-full items-center justify-between xl:px-20 lg:px-14 md:px-10 px-5 relative">
                {/* Left Content */}
                <motion.div className="text-white w-1/2">
                  <h1 className="lg:text-[2.5vw] xl:text-[2.2vw] md:text-[2.7vw] text-[0.8rem] font-bold leading-tight font-figtree">
                    Buy Smart, Share Freely <br />
                    Simplified Campus Life!
                  </h1>
                  <p className="lg:text-[1.7vw] xl:text-[1.4vw] md:text-[2vw] text-[0.7rem] lg:leading-7 md:leading-5  text-gray-200 font-medium mt-2 font-figtree">
                    Where Students Connect
                    <br className="hidden sm:block" /> Trade & Save Together
                  </p>
                  <Link
                    to="/upload"
                    className="bg-white text-[#364EF2] font-bold rounded-md md:py-2 xl:py-2 lg:py-[0.5vh] xl:px-11 lg:px-7 xl:text-xl lg:text-lg md:text-base text-xs inline-flex lg:mt-4 xl:mt-6 md:mt-4 mt-3 shadow-md transition-transform transform lg:hover:scale-105 py-[0.8vh] px-5 font-robotoFlex duration-500 ease-in-out dark:bg-gradient-to-r from-blue-600 to-indigo-600 dark:text-white"
                  >
                    Trade Now
                  </Link>
                </motion.div>

                {/* Right Image Section */}
                <div className="relative w-[50%] flex justify-center items-center">
                  <motion.img
                    src="/assets/Group_115.png"
                    alt="Background Shape"
                    className="absolute md:size-[32vw] xl:size-[25vw] lg:size-[25vw] size-[30vw] md:h-80 lg:h-[28vh] h-56 z-0"
                  />
                  <motion.img
                    src={bannerRight}
                    alt="Main Visual"
                    className="absolute xl:size-[26vw] lg:size-[33vw] md:size-[35vw] xl:mt-20 lg:mt-16 size-[45vw] z-10 mt-10"
                  />
                </div>
              </div>
            </SwiperSlide>
          </Swiper>
        </motion.div>

        {/* White banner*/}
        <motion.div className="pt-3 pb-3 md:pb-5 md:pt-5 lg:pb-5 lg:pt-5 pr-[2vw] lg:pr-0 ml-[4vw] lg:ml-[4.5vw] lg:mr-[4.5vw] mr-[4vw] rounded-md md:rounded-xl text-white flex items-center justify-between relative overflow-hidden shadow-[14.361501693725586px_10.258214950561523px_30px_0px_rgba(0,0,0,0.06)] dark:bg-[#1A1D20]">
          {/* Background Image */}
          <img
            src="/assets/Group_114.png"
            alt="background"
            className="absolute bottom-9 right-[-14vw] lg:right-[-7vw] z-0 w-[46vw] md:w-[38vw] lg:w-[32vw] xl:w-[24vw] h-auto md:bottom-11 lg:bottom-14 md:right-[-14vw]"
          />

          {/* White Banner Container */}
          <motion.div className="w-full h-full text-black rounded-lg flex md:leading-tight leading-snug">
            {/* Left Text Section */}
            <div className="flex flex-col lg:pl-14 pl-6 w-3/4 justify-center md:pl-10">
              <motion.h1 className="font-extrabold text-[clamp(0.65rem,1.3vw,1.4rem)] md:text-[1rem] lg:text-[1.1rem] text-black font-figtree dark:text-[#B2B2B2] tracking-tight xl:tracking-normal xl:text-[1.3rem]">
                Sell Faster on Campus Mart
              </motion.h1>
              <motion.h1 className="text-[#364EF2] font-extrabold md:font-bold md:text-[1.2rem] lg:text-[1.3rem] tracking-tight text-[0.7rem] font-inter lg:mt-1 dark:text-white uppercase xl:text-[1.5rem]">
                Make Your Listing Stand Out
              </motion.h1>
              <motion.h3 className="hidden md:block text-[clamp(0.85rem,1.4vw,1.2rem)] lg:text-[1rem] text-black tracking-tight font-medium font-inter dark:text-[#C9C9C9] xl:text-[1.2rem]">
                Increase exposure and connect with interested buyers faster.
              </motion.h3>
              <motion.h3 className="md:hidden text-[clamp(0.55rem,1.4vw,1.2rem)] text-black font-medium font-inter dark:text-[#C9C9C9]">
                Reach more interested buyers and sell faster
              </motion.h3>
            </div>

            {/* Right Price Section */}
            <div className="flex items-end w-1/3 lg:gap-3 xl:gap-3 gap-2 justify-end lg:pr-12 pr-2 pt-3 md:pt-4">
              <motion.div className="text-right flex flex-col">
                <h1 className="text-black/85 lg:text-[1rem] xl:text-[1.1rem] text-[0.5rem] font-medium font-inter md:text-sm dark:text-[#CBCBCB]">
                  Boost my
                </h1>
                <span className="lg:text-[1.4rem] md:text-[1.3rem] xl:text-2xl font-semibold text-[0.75rem] text-black font-firaSans md:text-2xl mt-[-0.4vh] xl:text-[1.5rem] lg:mt-[-0.3vh] dark:text-white">
                  Product
                </span>
              </motion.div>

              {/* Arrow Button */}
              <motion.div>
                <Link
                  to={"/price"}
                  className="rounded-full bg-[#394FF1] lg:p-[0.5vw] xl:p-[0.4vw] md:p-[0.6rem] text-white lg:text-2xl flex justify-center items-center z-20 hover:scale-110 transition-transform p-[0.2rem] mb-[0.2vh] lg:mb-0 md:mb-[0.3vh] text-sm dark:bg-[#394FF1] dark:text-white"
                >
                  <IoIosArrowForward />
                </Link>
              </motion.div>
            </div>
          </motion.div>
        </motion.div>
      </div>

      <div className="w-full min-h-screen bg-white flex flex-col items-center pl-[4.5vw] pr-[4.5vw] dark:bg-[#131313]">
        {/* Category section */}
        <div className="flex w-[90vw] flex-col gap-2 lg:gap-4 xl:gap-6 lg:mt-12 mt-5">
          <div className="lg:text-[2vw] xl:text-[1.7vw] md:text-[2.1vw] text-sm">
            <h1 className="font-semibold xl:font-medium font-poppins md:tracking-wide dark:text-white">
              Categories
            </h1>
          </div>
          <div
            ref={sliderRef}
            className="flex w-full gap-2 md:gap-4 lg:gap-6 items-center overflow-x-auto no-scrollbar cursor-grab select-none"
            onMouseDown={onMouseDown}
            onMouseLeave={onMouseLeave}
            onMouseUp={onMouseUp}
            onMouseMove={onMouseMove}
          >
            <Category
              title="Electronics"
              imageSrc="/assets/icons8-electronics-961.png"
            />
            <Category title="Books" imageSrc="/assets/icons8-books-961.png" />
            <Category title="Essentials" imageSrc="/assets/Group_116.png" />
            <Category
              title="Cycles"
              imageSrc="/assets/icons8-bicycle-961.png"
            />
            <Category title="Matress" imageSrc="/assets/icons8-bed-961.png" />
            <Category title="Others" imageSrc={"/others.png"} />
          </div>
        </div>

        {/* Products section */}
        <div className="w-full lg:mt-12 mt-6 flex flex-col lg:gap-4 xl:gap-6 gap-2">
          <h1 className="font-semibold xl:font-medium font-poppins md:tracking-wide dark:text-white lg:text-[2vw] xl:text-[1.7vw] md:text-[2.1vw] text-sm">
            Popular Products
          </h1>
          <div className="w-full flex flex-wrap lg:shrink-0 mt-1 lg:gap-4 xl:gap-6 md:gap-3 gap-1">
            {/* EMPTY STATE */}
            {!initialLoading && products.length === 0 && (
              <div className="w-full text-center mt-10 text-gray-500">
                No products listed yet
              </div>
            )}
            {products.map((product, index) => {
              const isLast = products.length === index + 1;
              return (
                <ProductCard
                  key={product._id}
                  product={product}
                  ref={isLast ? lastProductRef : null}
                />
              );
            })}

            {error && (
              <p className="w-full text-center text-red-500 mt-4">{error}</p>
            )}
          </div>

          {loading && (
            <p className="w-full text-center mt-4 text-gray-500">
              Loading more products...
            </p>
          )}

          {!hasMore && products.length > 0 && (
            <p className="w-full text-center mt-4 text-gray-400">
              No more products
            </p>
          )}
        </div>
      </div>

      {/* More section
      <div className="w-full lg:text-[1.1vw] text-sm flex justify-center items-center lg:p-10 p-6 font-semibold font-poppins dark:text-white">
        <button>More</button>
        <IoIosArrowDown className="size-4" />
      </div> */}

      {/* {hasMore && !loading && (
        <button
          onClick={() => fetchProducts(page + 1)}
          className="mt-4 px-4 py-2 bg-blue-500 text-white rounded"
        >
          Load More
        </button>
      )} */}

      <Footer />
    </motion.div>
  );
};

export default Home;
