"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { QrCodeToggle } from "@/components/qr-code";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";

// Shown to organizers only. Builds the secret organizer link for this
// event so they can open it on another device or hand it to a co-host.
//
// The secret goes after the "#" in the link on purpose: browsers never
// send that part to a server, so it stays out of server logs and isn't
// passed along when someone follows a link off the site.
export function OrganizerLinkCard({
  slug,
  token,
  resetAction,
}: {
  slug: string;
  token: string;
  resetAction: () => Promise<void>;
}) {
  const [copied, setCopied] = useState(false);

  const organizerLink = () =>
    `${window.location.origin}/events/${slug}/organizer#${token}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(organizerLink());
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard unavailable: the QR code still works.
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Organizer link</CardTitle>
        <CardDescription>
          Anyone who opens this link can edit the event: add teams, enter
          scores, delete things. Use it to score from your phone or to
          bring in a co-host. Save it somewhere safe too, because it&apos;s
          the only way back in if this browser forgets you.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="sm" onClick={copy}>
          {copied ? "Copied!" : "Copy organizer link"}
        </Button>
        <QrCodeToggle
          getText={organizerLink}
          caption="Scan with the phone you want to score from. Don't put this one on the big screen."
        />
        <form action={resetAction}>
          <ConfirmSubmitButton
            confirmMessage="Reset the organizer link? The old link stops working and every other device loses edit access. This browser keeps it."
            variant="ghost"
            size="sm"
          >
            Reset link
          </ConfirmSubmitButton>
        </form>
      </CardContent>
    </Card>
  );
}
