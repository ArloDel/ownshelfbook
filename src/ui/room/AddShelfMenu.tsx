import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { SHELF_PRESETS } from '../../domain/shelves';
import type { ShelfModel } from '../../domain/types';
import { useDataStore } from '../../store/dataStore';
import { useUiStore } from '../../store/uiStore';

const MODELS = Object.keys(SHELF_PRESETS) as ShelfModel[];

export function AddShelfMenu() {
  const addShelf = useDataStore((s) => s.addShelf);
  const selectShelf = useUiStore((s) => s.selectShelf);
  const setMode = useUiStore((s) => s.setMode);

  async function add(model: ShelfModel) {
    const id = await addShelf(model);
    setMode('tata');
    selectShelf(id);
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button>
          <Plus data-icon="inline-start" aria-hidden />
          Tambah rak
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent side="top" align="center" sideOffset={12} className="min-w-44">
        {MODELS.map((m) => (
          <DropdownMenuItem key={m} onSelect={() => void add(m)}>
            {SHELF_PRESETS[m].label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
