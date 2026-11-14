import type { NextConfig } from "next";

// Baseline security headers for every response. Deliberately limited to
// rules that can't break the app (no script-src yet: a strict script
// policy needs per-request nonces, which can be added later).
const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "frame-ancestors 'none'", // no embedding in other sites (clickjacking)
      "base-uri 'self'",
      "form-action 'self'", // forms/server actions only post to this app
      "object-src 'none'",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" }, // same as frame-ancestors, for older browsers
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
