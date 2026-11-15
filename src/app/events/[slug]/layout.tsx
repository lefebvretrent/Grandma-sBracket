import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

// Puts the event's name in the browser tab and in link previews for
// every page under /events/<code>. Event pages are kept out of search
// engines: they're meant for the people who were given the code.
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const event = await prisma.event.findUnique({
    where: { slug },
    select: { name: true },
  });

  return {
    title: event?.name ?? "Event not found",
    robots: { index: false, follow: false },
  };
}

export default function EventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
