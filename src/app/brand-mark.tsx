// The app's logo: a little bracket on an amber tile. Drawn in code so
// the browser-tab icon, the phone home-screen icon and the link-preview
// image all come from one place (see icon.tsx, apple-icon.tsx and
// opengraph-image.tsx).
export function BrandMark({ size }: { size: number }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#d97706",
        borderRadius: size * 0.22,
      }}
    >
      <svg
        width={size * 0.62}
        height={size * 0.62}
        viewBox="0 0 32 32"
        fill="none"
      >
        <path
          d="M4 7 H15 V25 H4 M15 16 H28"
          stroke="white"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
