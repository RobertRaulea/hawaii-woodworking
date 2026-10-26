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
 <header className="flex items-center justify-between gap-4 border-b border-stone-200 dark:border-stone-800 px-5 py-4 md:px-7">
 <DialogTitle className="text-xl font-semibold">{title}</DialogTitle>
 <Button
 type="button"
 variant="ghost"
 disabled={locked}
 onClick={onClose}
 aria-label="Închide dialogul"
 className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg p-0 hover:bg-stone-100 dark:hover:bg-stone-800 disabled:opacity-30 [&_svg]:size-5"
 >
 <X className="h-5 w-5" />
 </Button>
 </header>
 <div className="p-5 md:p-7">{children}</div>
 </DialogContent>
 </Dialog>
 );
};
