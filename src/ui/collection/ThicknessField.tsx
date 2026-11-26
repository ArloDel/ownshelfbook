import { Input } from '@/components/ui/input';
import { useState } from 'react';
import { BOOK_DEFAULTS } from '../../domain/books';
import type { BookType } from '../../domain/types';

type SizeKey = 'thicknessCm' | 'heightCm';

/**
 * A size (cm) typed in a book form. Until the user types in it, it follows the
 * default for the chosen type; after that it keeps what they typed.
 */
export function useBookSize(type: BookType, key: SizeKey, initialCm?: number) {
  const [text, setText] = useState(initialCm?.toString() ?? '');
  const [touched, setTouched] = useState(initialCm !== undefined);
  const shown = touched ? text : String(BOOK_DEFAULTS[type][key]);
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

export const useThickness = (type: BookType, initialCm?: number) => useBookSize(type, 'thicknessCm', initialCm);
export const useHeight = (type: BookType, initialCm?: number) => useBookSize(type, 'heightCm', initialCm);

export function SizeField({ label, value, onChange }: { label: string; value: string; onChange(v: string): void }) {
  return (
    <label className="field">
      <span>{label}</span>
      <Input inputMode="decimal" value={value} onChange={(e) => onChange(e.target.value)} />
    </label>
  );
}

export function ThicknessField(props: { value: string; onChange(v: string): void }) {
  return <SizeField label="Tebal (cm)" {...props} />;
}
