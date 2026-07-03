import { FiShare2 } from "react-icons/fi";
import "./ShareButton.css";

const ShareButton = ({ onClick }) => {
  return (
    <button
      type="button"
      className="share-button"
      onClick={onClick}
      aria-label="Share Unideals"
    >
      {/* Animated Border */}
      <svg
        className="share-button__border"
        viewBox="0 0 220 52"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient
            id="shareBorderGradient"
            x1="0%"
            y1="0%"
            x2="100%"
            y2="0%"
          >
            <stop offset="0%" stopColor="#818CF8" stopOpacity="0" />
            <stop offset="40%" stopColor="#818CF8" stopOpacity="1" />
            <stop offset="50%" stopColor="#FFFFFF" stopOpacity="1" />
            <stop offset="60%" stopColor="#818CF8" stopOpacity="1" />
            <stop offset="100%" stopColor="#818CF8" stopOpacity="0" />
          </linearGradient>

          <filter id="shareGlow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        {/* Static Border */}
        <rect
          className="share-button__border-base"
          x="1"
          y="1"
          width="218"
          height="50"
          rx="25"
        />

        {/* Animated Border */}
        <rect
          className="share-button__border-animated"
          x="1"
          y="1"
          width="218"
          height="50"
          rx="25"
          filter="url(#shareGlow)"
        />
      </svg>

      {/* Button Content */}
      <span className="share-button__content">
        <FiShare2 size={18} />
        <span>Share Unideals</span>
      </span>
    </button>
  );
};

export default ShareButton;
