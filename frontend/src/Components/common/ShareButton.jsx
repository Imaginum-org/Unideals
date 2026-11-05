import { useCallback, useState } from "react";
import "./ShareButton.css";

function ShareIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="18" cy="5" r="3" />
      <circle cx="6" cy="12" r="3" />
      <circle cx="18" cy="19" r="3" />
      <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
      <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
    </svg>
  );
}

export default function ShareButton({
  label = "Share Unideals",
  url = typeof window !== "undefined" ? window.location.href : "",
  title = "Unideals",
  text = "Check out Unideals",
  onShare,
  className = "",
}) {
  const [copied, setCopied] = useState(false);

  const handleClick = useCallback(async () => {
    if (onShare) {
      onShare();
      return;
    }

    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Share failed:", err);
        }
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Clipboard copy failed:", err);
    }
  }, [onShare, title, text, url]);

  return (
    <div className={`share-btn-wrapper ${className}`}>
      <span className="share-btn-track" aria-hidden="true" />
      <span className="share-btn-comet" aria-hidden="true" />
      <button
        type="button"
        className="share-btn"
        onClick={handleClick}
        aria-label={label}
      >
        <span className="share-btn-icon">
          <ShareIcon />
        </span>
        <span>{copied ? "Link copied" : label}</span>
      </button>
    </div>
  );
}
