import { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";
import { MdCelebration } from "react-icons/md";
import { HiSparkles } from "react-icons/hi2";
import { FaArrowRight } from "react-icons/fa";

const FirstListingCelebration = ({ onClose }) => {
  useEffect(() => {
    const duration = 3000;
    const end = Date.now() + duration;

    const frame = () => {
      confetti({
        particleCount: 2,
        angle: 60,
        spread: 55,
        origin: { x: 0 },
      });

      confetti({
        particleCount: 2,
        angle: 120,
        spread: 55,
        origin: { x: 1 },
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    confetti({
      particleCount: 180,
      spread: 120,
      startVelocity: 35,
      origin: { y: 0.6 },
    });

    frame();

    const timer = setTimeout(() => {
      onClose?.();
    }, 5000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="
  fixed
  inset-0
  z-[99999]
  flex
  items-center
  justify-center
  bg-black/40
  backdrop-blur-[3px]
  px-4
"
      >
        <motion.div
          initial={{
            opacity: 0,
            scale: 0.85,
            y: 40,
          }}
          animate={{
            opacity: 1,
            scale: 1,
            y: 0,
          }}
          exit={{
            opacity: 0,
            scale: 0.92,
            y: 20,
          }}
          transition={{
            type: "spring",
            stiffness: 180,
            damping: 18,
          }}
          className="
            relative
            overflow-hidden
            w-full
            max-w-2xl
            rounded-[32px]
            bg-gradient-to-br
            from-white
            via-indigo-50
            to-purple-50
            shadow-[0_30px_100px_rgba(0,0,0,0.25)]
          "
        >
          {/* Decorative Glow */}
          <div className="absolute -top-10 -left-10 h-40 w-40 rounded-full bg-indigo-300/30 blur-3xl" />

          <div className="absolute -bottom-10 -right-10 h-40 w-40 rounded-full bg-purple-300/30 blur-3xl" />

          {/* Sparkles */}
          <motion.div
            animate={{
              y: [0, -10, 0],
              rotate: [0, 10, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.5,
            }}
            className="absolute left-10 top-12 text-yellow-400"
          >
            <HiSparkles size={28} />
          </motion.div>

          <motion.div
            animate={{
              y: [0, -12, 0],
              rotate: [0, -10, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.8,
            }}
            className="absolute right-10 top-16 text-yellow-400"
          >
            <HiSparkles size={24} />
          </motion.div>

          <div className="relative z-10 px-8 py-10 md:px-12 md:py-12 text-center">
            {/* Celebration Icon */}
            <motion.div
              animate={{
                scale: [1, 1.04, 1],
              }}
              transition={{
                repeat: Infinity,
                duration: 2,
              }}
              className="
                mx-auto
                mb-6
                flex
                h-24
                w-24
                items-center
                justify-center
                rounded-full
                bg-gradient-to-r
                from-indigo-600
                to-purple-600
                shadow-[0_12px_40px_rgba(79,70,229,0.35)]
              "
            >
              <MdCelebration className="text-white" size={54} />
            </motion.div>

            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="
                inline-flex
                items-center
                gap-2
                rounded-full
                border
                border-indigo-100
                bg-white
                px-4
                py-2
                text-sm
                font-semibold
                text-indigo-700
                shadow-sm
              "
            >
              ✨ First Listing Achievement
            </motion.div>

            {/* Heading */}
            <motion.h2
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
              className="
                mt-6
                text-3xl
                md:text-4xl
                font-extrabold
                tracking-tight
                text-gray-900
              "
            >
              Congratulations!
            </motion.h2>

            {/* Main Text */}
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="
    mt-5
    mx-auto
    max-w-lg
    text-lg
    leading-8
    text-gray-700
  "
            >
              Your first product is now live on
              <span className="font-bold text-indigo-600"> Unideals</span>.
            </motion.p>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.65 }}
              className="
                mt-3
                text-gray-500
                leading-7
              "
            >
              Students can now discover, view and connect with you through your
              listing.
            </motion.p>

            {/* CTA */}
            <motion.button
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.8 }}
              whileHover={{
                scale: 1.03,
              }}
              whileTap={{
                scale: 0.98,
              }}
              onClick={onClose}
              className="
                mt-8
                inline-flex
                items-center
                gap-2
                rounded-2xl
                bg-indigo-600
                px-7
                py-3.5
                text-white
                font-semibold
                shadow-lg
                transition-all
                hover:bg-indigo-700
              "
            >
              Continue Exploring
              <FaArrowRight size={14} />
            </motion.button>

            {/* Footer */}
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 1 }}
              className="
                mt-5
                text-xs
                text-gray-400
              "
            >
              This celebration will close automatically in a few seconds
            </motion.p>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default FirstListingCelebration;
