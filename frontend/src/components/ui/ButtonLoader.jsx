import BrandLoader from "./BrandLoader.jsx";

// Button content with the animated Unideals mark while an action runs.
//
//   <button disabled={saving}>
//     <ButtonLoader loading={saving} loadingText="Saving…">Save</ButtonLoader>
//   </button>
//
// The mark uses tone="current", so it takes the button's own text colour
// (white on brand buttons, red on danger outlines, …) with no per-button
// styling. Idle state renders children untouched, so layouts don't change.
// eslint-disable-next-line react/prop-types
const ButtonLoader = ({ loading, loadingText, children }) => {
  if (!loading) return children ?? null;
  return (
    <span className="inline-flex items-center justify-center gap-2" aria-busy="true">
      <BrandLoader size="xs" tone="current" label={loadingText || "Loading"} />
      <span>{loadingText ?? children}</span>
    </span>
  );
};

export default ButtonLoader;
