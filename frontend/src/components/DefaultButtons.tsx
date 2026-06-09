import { useState } from "react";
import { BookmarkPlus, Star } from "lucide-react";
import {
  RESUME_PRESETS,
  loadPreset,
  presetIsCustomized,
  savePreset,
} from "../lib/defaultResume";

/**
 * Default-resume picker shared by /app and /search.
 *
 * Three preset buttons (Off-Campus / On-Campus / Priority) load that preset's
 * LaTeX into the editor and mark it active. "Save" persists the current editor
 * contents to whichever preset is active — so editing a loaded preset and
 * saving overrides THAT preset (per-preset persistence). A • marks a preset the
 * user has customized. `compact` matches the smaller pills used on /search.
 */
export default function DefaultButtons({
  value,
  onLoad,
  compact = false,
}: {
  value: string;
  onLoad: (latex: string) => void;
  compact?: boolean;
}) {
  const [activeId, setActiveId] = useState(RESUME_PRESETS[0].id);
  const [customized, setCustomized] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(RESUME_PRESETS.map((p) => [p.id, presetIsCustomized(p.id)])),
  );

  const base = [
    "inline-flex items-center rounded-full border bg-black/[0.03] font-bold uppercase",
    "tracking-[0.16em] transition active:scale-[0.97] disabled:opacity-40",
    compact ? "gap-1 px-2 py-0.5 text-[9px]" : "gap-1.5 px-3 py-1 text-[10px]",
  ].join(" ");
  const idle = "border-black/15 text-sap-200 hover:border-black/40 hover:text-sap-50";
  const active = "border-black/60 text-sap-50";
  const icon = compact ? 10 : 11;

  function load(id: string) {
    setActiveId(id);
    onLoad(loadPreset(id));
  }

  function save() {
    if (!value.trim()) return;
    savePreset(activeId, value);
    setCustomized((c) => ({ ...c, [activeId]: true }));
  }

  const activeLabel = RESUME_PRESETS.find((p) => p.id === activeId)?.label ?? "";

  return (
    <>
      {RESUME_PRESETS.map((p) => (
        <button
          key={p.id}
          type="button"
          onClick={() => load(p.id)}
          title={customized[p.id] ? `${p.title} (edited — your saved version)` : p.title}
          className={`${base} ${p.id === activeId ? active : idle}`}
        >
          <Star size={icon} />
          {p.label}
          {customized[p.id] ? " •" : ""}
        </button>
      ))}

      <button
        type="button"
        onClick={save}
        disabled={!value.trim()}
        title={`Save the current .tex as your ${activeLabel} default`}
        className={`${base} ${idle}`}
      >
        <BookmarkPlus size={icon} />
        Save
      </button>
    </>
  );
}
