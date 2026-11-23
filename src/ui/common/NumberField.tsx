import { useEffect, useId, useState } from 'react';

interface Props {
  label: string;
  value: number;
  onChange(value: number): void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
}

/** Number input that commits on blur/Enter and never emits NaN. */
export function NumberField({ label, value, onChange, min, max, step = 1, suffix }: Props) {
  const id = useId();
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

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
  };

  return (
    <label className="field" htmlFor={id}>
      <span>{label}</span>
      <span className="with-suffix">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          value={text}
          min={min}
          max={max}
          step={step}
          onChange={(e) => setText(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => e.key === 'Enter' && commit()}
        />
        {suffix && <em>{suffix}</em>}
      </span>
    </label>
  );
}
