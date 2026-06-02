import React, { useMemo, useState, useEffect } from "react";

const AvatarComponent = ({
  name,
  imageUrl,
  size = "large",
  className = "",
  isLoading = false,
}) => {
  const [imageLoadError, setImageLoadError] = useState(false);
  const [cachedImage, setCachedImage] = useState(imageUrl);

  // Cache image to avoid flicker
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
    small: {
      container: "w-7 h-7",
      text: "text-[10px]",
    },

    medium: {
      container: "w-11 h-11",
      text: "text-xs",
    },

    large: {
      container: "w-20 h-20",
      text: "text-base",
    },

    xlarge: {
      container: "w-20 h-20",
      text: "text-2xl",
    },
  };

  const currentSize = sizeStyles[size] || sizeStyles.large;

  if (isLoading) {
    return (
      <div
        className={`${currentSize.container} rounded-full animate-pulse bg-gray-300 ${className}`}
      />
    );
  }

  const hasValidImage =
    typeof cachedImage === "string" &&
    cachedImage.trim().length > 0 &&
    !imageLoadError;

  // Treat backend default placeholder avatar as "no image" so initials render
  const isDefaultAvatar =
    typeof cachedImage === "string" && cachedImage.includes("avatar-default");

  const shouldShowImage = hasValidImage && !isDefaultAvatar;

  if (shouldShowImage) {
    return (
      <img
        src={cachedImage}
        alt={name || "Avatar"}
        title={name}
        className={`${currentSize.container}  object-cover ${className}`}
        referrerPolicy="no-referrer"
        loading="lazy"
        decoding="async"
        onError={() => setImageLoadError(true)}
      />
    );
  }

  return (
    <div
      className={`${currentSize.container} rounded-full flex items-center justify-center font-semibold text-white ${className}`}
      style={{ backgroundColor }}
      title={name}
    >
      <span className={currentSize.text}>{initials}</span>
    </div>
  );
};

export default React.memo(AvatarComponent);
