import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { BOOK_DEFAULTS } from '../../domain/books';
import type { BookType } from '../../domain/types';

/**
 * Thickness text for a book form. Until the user types in it, it follows the
 * default for the chosen type; after that it keeps what they typed.
 */
export function useThickness(type: BookType, initialCm?: number) {
  const [text, setText] = useState(initialCm?.toString() ?? '');
  const [touched, setTouched] = useState(initialCm !== undefined);
  const shown = touched ? text : String(BOOK_DEFAULTS[type].thicknessCm);
  return {
    text: shown,
    change(v: string) {
      setText(v);
      setTouched(true);
    },
    /** Parsed cm (accepts a decimal comma); NaN when it is not a number. */
    cm(): number {
      const t = shown.trim();
      return t === '' ? NaN : Number(t.replace(',', '.'));
    },
  };
}

export function ThicknessField({ value, onChange }: { value: string; onChange(v: string): void }) {
  return (
    <label className="field">
      <span>Tebal (cm)</span>
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}
