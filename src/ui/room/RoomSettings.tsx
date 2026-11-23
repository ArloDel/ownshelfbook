import { useState } from 'react';
import { useDataStore } from '../../store/dataStore';
import { NumberField } from '../common/NumberField';

export function RoomSettings() {
  const [open, setOpen] = useState(false);
  const room = useDataStore((s) => s.room);
  const setRoom = useDataStore((s) => s.setRoom);

  return (
    <div className="menu-wrap">
      <button aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Ukuran ruangan
      </button>
      {open && (
        <div role="group" aria-label="Ukuran ruangan" className="menu popover">
          <NumberField label="Lebar" value={room.widthCm} min={50} max={3000} suffix="cm" onChange={(v) => void setRoom({ ...room, widthCm: v })} />
          <NumberField label="Panjang" value={room.depthCm} min={50} max={3000} suffix="cm" onChange={(v) => void setRoom({ ...room, depthCm: v })} />
          <NumberField label="Tinggi" value={room.heightCm} min={50} max={1000} suffix="cm" onChange={(v) => void setRoom({ ...room, heightCm: v })} />
          <p className="hint">Rak yang berada di luar ruangan akan digeser masuk.</p>
        </div>
      )}
    </div>
  );
}
