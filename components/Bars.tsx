import type { Tally } from "@/lib/metrics";
import { labelOf } from "@/lib/options";

export default function Bars({ data, list, total }: { data: Tally; list: readonly { id: string; label: string }[]; total: number }) {
  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.id}>
          <div className="mb-1 flex justify-between text-sm">
            <span>{labelOf(list, d.id)}</span>
            <span className="tabular-nums text-stone-500">
              {d.count}명 · {total ? Math.round(d.share * 100) : 0}%
            </span>
          </div>
          <div className="h-2.5 rounded-full bg-stone-100">
            <div className="h-2.5 rounded-full bg-brand-500" style={{ width: `${Math.round(d.share * 100)}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
