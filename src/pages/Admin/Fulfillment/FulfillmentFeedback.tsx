import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Alert } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/sonner';
import type {
 FulfillmentEvent,
 OrderActionController,
} from '../../../types/orders.types';

interface FulfillmentFeedbackProps {
 controller: OrderActionController;
 activity?: string | null;
 onActivityDismiss?: () => void;
}

const KIND_PAST_TENSE: Record<FulfillmentEvent['kind'], string> = {
 claimed: 'preluată',
 released: 'eliberată',
 reassigned: 'realocată',
 checked: 'marcată ca verificată',
 note: 'completată cu o notiță',
 packed: 'ambalată',
 shipped: 'expediată',
 delivered: 'livrată',
 cancelled: 'anulată',
};

export const FulfillmentFeedback = ({
 controller,
 activity,
 onActivityDismiss,
}: FulfillmentFeedbackProps) => {
 const { pending, completed, busy, online, error, retry, dismissCompleted } =
 controller;

 useEffect(() => {
 if (!completed) return;
 toast.success(`Comanda a fost ${KIND_PAST_TENSE[completed.kind]}.`, {
 id: `fulfillment-${completed.requestId}`,
 duration: 6000,
 onDismiss: dismissCompleted,
 action: (
 <Link
 to={`/admin/fulfillment/${completed.orderId}`}
 className="font-semibold underline underline-offset-2"
 >
 Deschide comanda
 </Link>
 ),
 });
 }, [completed, dismissCompleted]);

 useEffect(() => {
 if (!activity) return;
 toast.success(activity, {
 id: 'fulfillment-activity',
 duration: 6000,
 onDismiss: onActivityDismiss,
 });
 }, [activity, onActivityDismiss]);

 return (
 <>
 {pending ? (
 <section
 aria-label="Acțiune fulfillment în așteptare"
 className="my-4 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/60 p-4 text-amber-950 dark:text-amber-200"
 >
 <p className="font-semibold">
 {busy ? 'Se salvează acțiunea...' : 'Acțiune de verificat'}
 </p>
 <p className="mt-1 text-sm">
 Nu repeta acțiunea. Verifică aceeași referință înainte de a continua.
 </p>
 <p className="mt-2 break-all font-mono text-xs">
 {pending.requestId}
 </p>
 <Button
 type="button"
 variant="outline"
 disabled={busy || !online}
 onClick={retry}
 className="mt-3 min-h-11 h-auto rounded-lg border-amber-800 px-4 py-2 text-sm font-semibold disabled:opacity-40"
 >
 Reîncearcă aceeași acțiune
 </Button>
 </section>
 ) : null}
 {error ? (
 <Alert variant="destructive" className="my-3 rounded-lg bg-red-50 dark:bg-red-950/50 p-3 text-sm text-red-800 dark:text-red-300 ">
 {error}
 </Alert>
 ) : null}
 </>
 );
};
