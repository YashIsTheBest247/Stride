import { useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import type { TailorStep } from "../lib/api";

/**
 * Live progress feed for /api/tailor/stream.
 *
 * Each real backend event (sanitize → tailor → compile → shrink → …) is pushed
 * into `events` by the page and rendered as a step here: completed steps get a
 * check, the most recent one spins. The parent unmounts this the moment the PDF
 * arrives, so the last step keeps pulsing until then.
 */
export default function TailorProgress({ events }: { events: TailorStep[] }) {
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const tick = window.setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => window.clearInterval(tick);
  }, []);

  // Before the first event lands, show a placeholder "starting" row.
  const rows: TailorStep[] = events.length
    ? events
    : [{ step: "start", label: "Starting up the tailoring engine" }];
  const lastIdx = rows.length - 1;

  return (
    <div className="panel p-8">
      <div className="mb-7 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow text-sap-200/70">/ Generating</p>
          <h3 className="display mt-1 text-2xl text-sap-50">Tailoring your resume</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-sap-50" />
          <span className="eyebrow tabular-nums text-sap-100/45">{elapsed}s</span>
        </div>
      </div>

      <ol>
        {rows.map((s, i) => {
          const active = i === lastIdx;
          const isLast = i === rows.length - 1;
          return (
            <li key={`${i}-${s.step}`} className="flex items-stretch gap-4">
              <div className="flex flex-col items-center">
                <span
                  className={[
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-300",
                    active
                      ? "border-sap-50 bg-white text-sap-50 ring-4 ring-sap-50/10"
                      : "border-sap-50 bg-sap-50 text-white",
                  ].join(" ")}
                >
                  {active ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} strokeWidth={3} />}
                </span>
                {!isLast && <span className="my-1 w-px flex-1 bg-sap-50" />}
              </div>

              <div className="pb-6">
                <p className={`text-sm font-bold tracking-tight ${active ? "text-sap-50" : "text-sap-100"}`}>
                  {s.label}
                  {active && <span className="ml-1 animate-pulse text-sap-300">…</span>}
                </p>
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-1 text-[11px] leading-relaxed text-sap-100/40">
        Usually 15–40s. The first run after a while can take longer while the server wakes up.
      </p>
    </div>
  );
}
