import { useEffect } from "react";
import useProductListing from "../../hooks/useProductListing";
import { AnimatePresence, motion } from "framer-motion";
import BasicInfoStep from "../../steps/BasicInfoStep";
import ImagesStep from "../../steps/ImagesStep";
import PricingStep from "../../steps/PricingStep";
import PreviewStep from "../../steps/PreviewStep";
import { IoArrowBack } from "react-icons/io5";
import Stepper from "../stepper/Stepper";
import TipsCard from "../shared/TipsCard";

const ListingLayout = () => {
  const { step } = useProductListing();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: "instant",
    });
  }, [step]);

  const renderStep = () => {
    switch (step) {
      case 1:
        return <BasicInfoStep />;

      case 2:
        return <ImagesStep />;

      case 3:
        return <PricingStep />;

      case 4:
        return <PreviewStep />;

      default:
        return <BasicInfoStep />;
    }
  };

  const { prevStep } = useProductListing();

  return (
    <div className="w-full min-h-screen text-black dark:text-white bg-[#FAFAFA] dark:bg-[#131313] font-figtree">
      <div className="max-w-6xl w-full mx-auto px-7 sm:px-6 lg:px-8 xl:px-10 py-6 md:py-8">
        {/* Back */}
        <button
          onClick={() => {
            if (step === 1) {
              window.history.back();
            } else {
              prevStep();
            }
          }}
          className="group inline-flex items-center gap-1 text-sm lg:text-base font-medium text-[#090A0B] dark:text-white"
        >
          <div className="flex items-center justify-center w-8 h-8 group-hover:text-[#4F46E5]">
            <IoArrowBack className="size-4" />
          </div>

          <span className="transition-colors duration-200 group-hover:text-[#4F46E5]">
            Back
          </span>
        </button>

        {/* Header */}
        <div className="mt-7">
          <h1 className="text-xl md:text-2xl xl:text-2xl font-bold text-[#0F172A] dark:text-white leading-tight">
            Sell Your Product
          </h1>

          <p className="mt-2 xl:mt-1 text-[#475569] dark:text-[#A1A1AA] text-sm md:text-base">
            Provide the basic details to help buyers find your product.
          </p>
        </div>

        {/* Stepper */}
        <div className="mt-6">
          <Stepper />
        </div>

        {/* Main */}
        <div
          className={`mt-8 grid grid-cols-1 gap-6 items-start ${
            step !== 4 ? "xl:grid-cols-[1fr_320px]" : ""
          }`}
        >
          {/* LEFT */}
          <div className={`w-full ${step !== 4 ? "xl:max-w-[920px]" : ""}`}>
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{
                  opacity: 0,
                  y: 12,
                }}
                animate={{
                  opacity: 1,
                  y: 0,
                }}
                exit={{
                  opacity: 0,
                  y: -8,
                }}
                transition={{
                  duration: 0.25,
                  ease: "easeOut",
                }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* RIGHT */}
          {step !== 4 && (
            <div className="hidden xl:block sticky top-24">
              <TipsCard step={step} />
            </div>
          )}
        </div>

        {step !== 4 && (
          <div className="xl:hidden mt-5">
            <TipsCard step={step} />
          </div>
        )}
      </div>
    </div>
  );
};

export default ListingLayout;
