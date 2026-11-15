import type { ActivityStatus } from "@/lib/activity-status";

const STYLES: Record<ActivityStatus, { label: string; className: string }> = {
  NOT_SET_UP: {
    label: "Not set up",
    className: "bg-stone-100 text-stone-500",
  },
  NOT_STARTED: {
    label: "Not started",
    className: "bg-stone-100 text-stone-700",
  },
  IN_PROGRESS: {
    label: "In progress",
    className: "bg-amber-100 text-amber-800",
  },
  DONE: { label: "Done", className: "bg-emerald-100 text-emerald-800" },
};

export function StatusBadge({ status }: { status: ActivityStatus }) {
  const { label, className } = STYLES[status];
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  );
}
