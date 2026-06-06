import React, { useMemo, useState, useEffect } from "react";
import { motion } from "framer-motion";

const AvatarComponent = ({
  name,
  imageUrl,
  size = "large",
  plan = "base_user", // "base_user", "pro", "pro_plus"
  showBadge = false, 
  shape = "circle", // "circle" or "square"
  className = "",
  isLoading = false,
}) => {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [cachedImage, setCachedImage] = useState(imageUrl);

  useEffect(() => {
    if (imageUrl) {
      setCachedImage(imageUrl);
      setImageLoadError(false);
    }
  }, [imageUrl]);

  const generateInitials = (fullName) => {
    if (!fullName) return "?";
    const nameArray = fullName.trim().split(" ");
    if (nameArray.length === 1) {
      return nameArray[0].substring(0, 2).toUpperCase();
    }
    return (nameArray[0][0] + nameArray[nameArray.length - 1][0]).toUpperCase();
  };

  const stringToColor = (string) => {
    if (!string) return "#364EF2";
    let hash = 0;
    for (let i = 0; i < string.length; i++) {
      hash = string.charCodeAt(i) + ((hash << 5) - hash);
    }
    let color = "#";
    for (let i = 0; i < 3; i++) {
      const value = (hash >> (i * 8)) & 0xff;
      color += `00${value.toString(16)}`.slice(-2);
    }
    return color;
  };

  const initials = useMemo(() => generateInitials(name), [name]);
  const backgroundColor = useMemo(() => stringToColor(name), [name]);

  const sizeStyles = {
    small: { container: "w-7 h-7", text: "text-[10px]" },
    xmedium: { container: "w-9 h-9", text: "text-[1rem]" },
    medium: { container: "w-11 h-11", text: "text-xs" },
    large: { container: "w-20 h-20", text: "text-base" },
    xlarge: { container: "w-24 h-24", text: "text-2xl" },
  };

  const currentSize = sizeStyles[size] || sizeStyles.large;
  const borderRadiusClass = shape === "square" ? "rounded-3xl" : "rounded-full";

  if (isLoading) {
    return (
      <div className={`${currentSize.container} ${borderRadiusClass} animate-pulse bg-gray-300 dark:bg-neutral-700 ${className}`} />
    );
  }

  const hasValidImage = typeof cachedImage === "string" && cachedImage.trim().length > 0 && !imageLoadError;
  const isDefaultAvatar = typeof cachedImage === "string" && cachedImage.includes("avatar-default");
  const shouldShowImage = hasValidImage && !isDefaultAvatar;

  const isProPlus = plan === "pro_plus";
  const isPremium = plan === "pro" || plan === "pro_plus";
  const isSquare = shape === "square";

  // Gradients for Pro/Pro+
  const gradientClass = isProPlus
    ? "bg-gradient-to-tr from-[#FFD700] via-[#FDB931] to-[#FF8C00]"
    : "bg-gradient-to-tr from-[#3838EC] to-[#5C6DFF]";

  return (
    <div className={`relative inline-flex items-center justify-center ${currentSize.container} ${className}`}>
      
      {/* 1. Glow Layer (Behind everything) */}
      {isPremium && (
        <motion.div
          className={`absolute inset-0 ${borderRadiusClass} ${gradientClass} opacity-50 z-0`}
          style={{ filter: "blur(6px)" }}
          animate={isSquare ? {} : { rotate: 360, scale: isProPlus ? [1, 1.08, 1] : 1 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* 2. Spinning Crisp Gradient Border Layer */}
      {isPremium && (
        <motion.div
          className={`absolute inset-0 ${borderRadiusClass} ${gradientClass} z-0`}
          animate={isSquare ? {} : { rotate: 360 }}
          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* 3. Static Inner Avatar (Never rotates, perfectly centered) */}
      <div 
        // inset-[2px] exposes exactly 2px of the animated gradient behind it.
        // border-[2px] creates the clean white/dark gap between the image and the gradient.
        className={`absolute ${isPremium ? 'inset-[2px] border-[2px] border-white dark:border-[#131313]' : 'inset-0'} z-10 ${borderRadiusClass} bg-white dark:bg-[#131313] overflow-hidden`}
      >
        {shouldShowImage ? (
          <img
            src={cachedImage}
            alt={name || "Avatar"}
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
            loading="lazy"
            decoding="async"
            onError={() => setImageLoadError(true)}
          />
        ) : (
          <div
            className="w-full h-full flex items-center justify-center font-semibold text-white"
            style={{ backgroundColor }}
            title={name}
          >
            <span className={currentSize.text}>{initials}</span>
          </div>
        )}
      </div>

      {/* 4. PRO Badge */}
      {showBadge && plan === "pro" && (
        <span className="absolute -bottom-1 -right-1 translate-x-1/4 translate-y-1/4 bg-gradient-to-r from-[#3838EC] to-[#5C6DFF] text-white shadow-[#3838EC]/40 shadow-lg text-[9px] leading-none font-extrabold px-1.5 py-0.5 rounded border border-white dark:border-[#131313] z-20">
          PRO
        </span>
      )}

      {/* 5. PRO+ Badge */}
      {showBadge && plan === "pro_plus" && (
        <span className="absolute -bottom-1 -right-1 translate-x-1/4 translate-y-1/4 bg-gradient-to-r from-[#FFD700] to-[#FF8C00] text-black shadow-[#FFD700]/40 shadow-lg text-[9px] leading-none font-extrabold px-1.5 py-0.5 rounded border border-white dark:border-[#131313] z-20">
          PRO+
        </span>
      )}
    </div>
  );
};

export default React.memo(AvatarComponent);