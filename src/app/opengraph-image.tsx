import { ImageResponse } from "next/og";
import { BrandMark } from "./brand-mark";
import { SITE_NAME } from "@/lib/site";

// The picture shown when a link to the site is pasted into a text
// message, WhatsApp, Facebook, Slack and so on.
export const alt = `${SITE_NAME}: brackets made so easy, even your grandma could do it`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: 80,
          background: "#fafaf9",
          borderBottom: "24px solid #d97706",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <BrandMark size={112} />
          <div style={{ fontSize: 64, fontWeight: 700, color: "#1c1917" }}>
            {SITE_NAME}
          </div>
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: 56,
            fontSize: 76,
            lineHeight: 1.15,
            color: "#1c1917",
          }}
        >
          <div>Brackets made so easy,</div>
          <div style={{ color: "#d97706" }}>even your grandma</div>
          <div>could do it.</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 34, color: "#78716c" }}>
          Family field day, sorted. Free, no accounts.
        </div>
      </div>
    ),
    size
  );
}
