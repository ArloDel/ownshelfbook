import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';

interface Props {
  label: string;
  /** Shorter text shown on screen; `label` stays the accessible name. */
  shortLabel?: string;
  value: number;
  onChange(value: number): void;
  min?: number;
  max?: number;
  suffix?: string;
}

/** Number input that commits on blur/Enter and never emits NaN. */
export function NumberField({ label, shortLabel, value, onChange, min, max, suffix }: Props) {
  const id = useId();
  const [text, setText] = useState(String(value));
  // Re-sync after every commit too: the parent may clamp further and keep `value` unchanged.
  const [commits, setCommits] = useState(0);
  useEffect(() => setText(String(value)), [value, commits]);

  const commit = () => {
    const n = Number(text.replace(',', '.'));
    if (text.trim() === '' || !Number.isFinite(n)) {
      setText(String(value));
      return;
    }
    let v = n;
    if (min !== undefined) v = Math.max(min, v);
    if (max !== undefined) v = Math.min(max, v);
    setText(String(v));
    if (v !== value) onChange(v);
    setCommits((c) => c + 1);
  };

  return (
    <div className="field">
      <label htmlFor={id}>{shortLabel ?? label}</label>
      <span className="with-suffix">
        <Input
          id={id}
          className="w-20"
          aria-label={shortLabel ? label : undefined}
          type="text"
          inputMode="decimal"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
        {suffix && <em>{suffix}</em>}
      </span>
    </div>
  );
}
