import { useEffect } from 'react';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import { inventoryNotice } from '../../../utils/inventory.utils';
import type { InventoryController } from '../../../types/inventory.types';

interface InventoryFeedbackProps {
 operation: InventoryController;
}

export const InventoryFeedback = ({ operation }: InventoryFeedbackProps) => {
 const { completed, dismissCompleted } = operation;

 useEffect(() => {
 if (!completed) return;
 toast.success(inventoryNotice(completed), {
 id: `inventory-${completed.requestId}`,
 duration: 10000,
 onDismiss: dismissCompleted,
 });
 }, [completed, dismissCompleted]);

 return (
 <>
 {operation.pending ? (
 <section
 aria-label="Operațiune de inventar de verificat"
 className="my-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 p-4 text-amber-950 dark:text-amber-200"
 >
 <p className="font-semibold">
 {operation.busy
 ? 'Se salvează operațiunea...'
 : 'Operațiune de verificat'}
 </p>
 <p className="mt-1 text-sm">
 Nu porni un alt transfer. Verifică sau reia aceeași referință.
 </p>
 <p className="mt-2 break-all font-mono text-xs">
 {operation.pending.requestId}
 </p>
 <Button
 type="button"
 variant="outline"
 disabled={operation.busy || !operation.online}
 onClick={operation.retry}
 className="mt-3 min-h-11 h-auto rounded-lg border-amber-800 px-4 py-2 text-sm font-semibold disabled:opacity-40"
 >
 Verifică aceeași operațiune
 </Button>
 </section>
 ) : null}
 {operation.error ? (
 <Alert variant="destructive" className="my-3 rounded-lg bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-800 dark:text-red-300 ">
 {operation.error}
 </Alert>
 ) : null}
 </>
 );
};
