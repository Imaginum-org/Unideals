import { STEPPER_STEPS } from "./stepperData";

import useProductListing from "../../hooks/useProductListing";

const Stepper = () => {
  const { step } = useProductListing();

  return (
    <div className="w-full">
      {/* Desktop */}
      <div className="hidden md:grid grid-cols-4 gap-3">
        {STEPPER_STEPS.map((item) => {
          const isCompleted = step > item.id;

          const isActive = step === item.id;

          return (
            <div key={item.id}>
              {/* Bar */}
              <div
                className={`h-[6px] rounded-full transition-all duration-300
                
                ${
                  isCompleted
                    ? "bg-[#16A34A]"
                    : isActive
                      ? "bg-[#4F46E5]"
                      : "bg-[#E6E8EC]"
                }`}
              />

              {/* Label */}
              <p
                className={`mt-3 text-center text-xs font-medium tracking-wide uppercase
                
                ${
                  isCompleted
                    ? "text-[#16A34A]"
                    : isActive
                      ? "text-[#2E3FDC]"
                      : "text-[#757687]"
                }`}
              >
                {item.label}
              </p>
            </div>
          );
        })}
      </div>

      {/* Mobile */}
      <div className="md:hidden">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-[#4F46E5]">Step {step} of 4</p>

          <p className="text-sm text-[#6B7280]">
            {STEPPER_STEPS[step - 1]?.label}
          </p>
        </div>

        <div className="mt-3 w-full h-[6px] rounded-full bg-[#E5E7EB] overflow-hidden">
          <div
            className="h-full rounded-full bg-[#4F46E5] transition-all duration-300"
            style={{
              width: `${(step / 4) * 100}%`,
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default Stepper;
