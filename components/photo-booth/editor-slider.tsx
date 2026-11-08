"use client";

type EditorSliderProps = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: string;
  onChange: (value: number) => void;
};

/** One labelled range row, used by the frame controls and the sticker tools. */
export function EditorSlider({
  label,
  value,
  min,
  max,
  step,
  display,
  onChange,
}: EditorSliderProps) {
  return (
    <label className="flex items-center gap-2">
      <span className="w-12 shrink-0 text-[10px] tracking-wide text-paper-foreground/55 uppercase">
        {label}
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="min-w-0 flex-1 accent-[var(--primary)]"
      />
      <span className="w-10 shrink-0 text-right text-[11px] tabular-nums text-paper-foreground/70">
        {display}
      </span>
    </label>
  );
}
