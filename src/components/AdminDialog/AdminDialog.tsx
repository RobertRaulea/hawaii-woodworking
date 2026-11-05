import type { ReactNode } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
 Dialog,
 DialogContent,
 DialogTitle,
} from '@/components/ui/dialog';

interface AdminDialogProps {
 title: string;
 children: ReactNode;
 locked?: boolean;
 onClose: () => void;
}

export const AdminDialog = ({
 title,
 children,
 locked = false,
 onClose,
}: AdminDialogProps) => {
 return (
 <Dialog
 open
 onOpenChange={(open) => {
 if (!open && !locked) onClose();
 }}
 >
 <DialogContent
 hideClose
 className="max-w-2xl gap-0 p-0"
 onEscapeKeyDown={(event) => {
 if (locked) event.preventDefault();
 }}
 onInteractOutside={(event) => {
 event.preventDefault();
 }}
 >
 <header className="flex items-center justify-between gap-4 border-b border-border px-5 py-4 md:px-7">
 <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
 <Button
 type="button"
 variant="ghost"
 disabled={locked}
 onClick={onClose}
 aria-label="Închide dialogul"
 className="flex size-11 shrink-0 items-center justify-center rounded-lg p-0 hover:bg-muted disabled:opacity-30 [&_svg]:size-5"
 >
 <X className="size-5" />
 </Button>
 </header>
 <div className="p-5 md:p-7">{children}</div>
 </DialogContent>
 </Dialog>
 );
};
