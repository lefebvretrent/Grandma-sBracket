import type { Metadata } from "next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClaimAccess } from "./claim-access";

// Landing page for the secret organizer link:
//   /events/<code>/organizer#<secret>
// The secret after the "#" never reaches the server in the page request,
// so the real work happens in the browser (see claim-access.tsx).
export const metadata: Metadata = {
  title: "Organizer access",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function OrganizerPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;

  return (
    <main className="min-h-screen bg-stone-50 p-6 flex items-center justify-center">
      <Card className="max-w-md w-full">
        <CardHeader>
          <CardTitle>Organizer access</CardTitle>
        </CardHeader>
        <CardContent>
          <ClaimAccess slug={slug} />
        </CardContent>
      </Card>
    </main>
  );
}
