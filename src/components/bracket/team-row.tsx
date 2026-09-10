export function TeamRow({
  name,
  score,
  isWinner,
}: {
  name?: string | null;
  score?: number | null;
  isWinner: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between rounded-md px-2 py-1.5 text-sm ${
        isWinner ? "bg-amber-50 text-amber-900 font-medium" : "text-stone-700"
      }`}
    >
      <span>{name ?? "TBD"}</span>
      {score !== null && score !== undefined && <span>{score}</span>}
    </div>
  );
}
