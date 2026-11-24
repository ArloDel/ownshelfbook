import { useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel: string;
  danger?: boolean;
  onConfirm(): void;
  onCancel(): void;
}

export function ConfirmDialog({ open, title, message, confirmLabel, danger, onConfirm, onCancel }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);
  return (
    <Dialog open={open} onOpenChange={(o) => !o && onCancel()}>
      <DialogContent
        ref={boxRef}
        tabIndex={-1}
        showCloseButton={false}
        className="sm:max-w-sm"
        // Focus the dialog itself, not a button: an Enter that opened it must not also press Batal.
        onOpenAutoFocus={(e) => {
          e.preventDefault();
          boxRef.current?.focus();
        }}
      >
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{message}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="ghost" onClick={onCancel}>
            Batal
          </Button>
          <Button variant={danger ? 'destructive' : 'default'} className={danger ? 'bg-destructive text-white hover:bg-destructive/90' : undefined} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
