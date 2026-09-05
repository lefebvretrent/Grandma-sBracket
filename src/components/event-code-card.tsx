"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

export function EventCodeCard({ code }: { code: string }) {
  const [copied, setCopied] = useState<"code" | "link" | null>(null);

  async function copy(text: string, which: "code" | "link") {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(which);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      // Clipboard API can be unavailable (older browsers, permissions) —
      // fine to just no-op, the code is still visible to copy by hand.
    }
  }

  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/events/${code}`
      : "";

  return (
    <Card className="border-amber-200 bg-amber-50">
      <CardHeader>
        <CardTitle>Event code</CardTitle>
        <CardDescription>
          Share this so others can join without needing a link.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <span className="text-4xl font-bold tracking-[0.2em] text-amber-900">
          {code}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copy(code, "code")}
        >
          {copied === "code" ? "Copied!" : "Copy code"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => copy(link, "link")}
        >
          {copied === "link" ? "Copied!" : "Copy link"}
        </Button>
      </CardContent>
    </Card>
  );
}