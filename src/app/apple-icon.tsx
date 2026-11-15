import { ImageResponse } from "next/og";
import { BrandMark } from "./brand-mark";

// Icon used when someone adds the site to their phone's home screen.
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#d97706",
        }}
      >
        <BrandMark size={180} />
      </div>
    ),
    size
  );
}
