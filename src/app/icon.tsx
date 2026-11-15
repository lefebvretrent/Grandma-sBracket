import { ImageResponse } from "next/og";
import { BrandMark } from "./brand-mark";

// Browser-tab icon.
export const size = { width: 48, height: 48 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(<BrandMark size={48} />, size);
}
