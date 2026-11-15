"use client";

import { useState } from "react";
import { renderSVG } from "uqr";
import { Button } from "@/components/ui/button";

// A "Show QR code" button that reveals a scannable code for some text
// (usually a link). The code is drawn in the browser only when asked
// for, so `getText` can use things like window.location that don't
// exist on the server.
export function QrCodeToggle({
  getText,
  label = "Show QR code",
  caption,
}: {
  getText: () => string;
  label?: string;
  caption?: string;
}) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  function toggle() {
    if (dataUrl) {
      setDataUrl(null);
      return;
    }
    try {
      const svg = renderSVG(getText(), { border: 1 });
      setDataUrl(`data:image/svg+xml;utf8,${encodeURIComponent(svg)}`);
    } catch {
      // Text too long for a QR code. The link can still be copied, so
      // just leave the code hidden.
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" onClick={toggle}>
        {dataUrl ? "Hide QR code" : label}
      </Button>
      {dataUrl && (
        <div className="basis-full flex flex-col items-start gap-2">
          {/* A generated data: URL, so next/image has nothing to optimize. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={dataUrl}
            alt="QR code"
            width={240}
            height={240}
            className="rounded-lg border border-stone-200 bg-white"
          />
          {caption && <p className="text-sm text-stone-500">{caption}</p>}
        </div>
      )}
    </>
  );
}
