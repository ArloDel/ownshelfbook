import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useDataStore } from '../../store/dataStore';
import { NumberField } from '../common/NumberField';

export function RoomSettings() {
  const room = useDataStore((s) => s.room);
  const setRoom = useDataStore((s) => s.setRoom);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost">Ukuran ruangan</Button>
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={12} className="w-60">
        <div role="group" aria-label="Ukuran ruangan" className="flex flex-col gap-3">
          <NumberField label="Lebar" value={room.widthCm} min={50} max={3000} suffix="cm" onChange={(v) => void setRoom({ ...room, widthCm: v })} />
          <NumberField label="Panjang" value={room.depthCm} min={50} max={3000} suffix="cm" onChange={(v) => void setRoom({ ...room, depthCm: v })} />
          <NumberField label="Tinggi" value={room.heightCm} min={50} max={1000} suffix="cm" onChange={(v) => void setRoom({ ...room, heightCm: v })} />
          <p className="hint">Rak yang berada di luar ruangan akan digeser masuk.</p>
        </div>
      </PopoverContent>
    </Popover>
  );
}
