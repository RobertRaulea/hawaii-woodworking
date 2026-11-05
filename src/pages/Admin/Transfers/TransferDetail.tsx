import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import { useForm } from 'react-hook-form';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useStaffAccess } from '../../../hooks/useStaffAccess';
import { useStaffDirectory } from '../../../hooks/useStaffDirectory';
import { useTransferAction } from '../../../hooks/useTransferAction';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { ProductThumb } from '../../../components/ProductThumb';
import { useProductThumbnails } from '../../../hooks/useProductThumbnails';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldLabel } from '@/components/ui/field';
import {
 Table,
 TableBody,
 TableCell,
 TableHead,
 TableHeader,
 TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import {
 TRANSFER_EVENT_LABELS,
 TRANSFER_STATUS_LABELS,
} from '../../../utils/transfer.utils';
import type {
 TransferDoc,
 TransferEvent,
} from '../../../types/transfers.types';


const formatDate = (timestamp: number) =>
 new Date(timestamp).toLocaleString('ro-RO', {
 dateStyle: 'short',
 timeStyle: 'short',
 });

interface ReceiveFormValues {
 quantities: Record<string, number>;
 note: string;
}

interface CancelFormValues {
 reason: string;
}

type DialogKind = 'accept' | 'ship' | 'receive' | 'cancel' | null;

const remaining = (transfer: TransferDoc, productId: string) => {
 const line = transfer.lines.find(
 (item) => item.productId === (productId as Id<'products'>),
 );
 return line ? Math.max(0, line.shippedQuantity - line.receivedQuantity) : 0;
};

const TransferDetail = () => {
 const { id } = useParams();
 const transferId = (id ?? '') as Id<'transfers'>;
 const { can, userId } = useStaffAccess();
 const userLabel = useStaffDirectory();
 const thumbnails = useProductThumbnails();
 const controller = useTransferAction(userId);
 const detail = useQuery(api.transfers.get, { transferId });
 const [dialog, setDialog] = useState<DialogKind>(null);

 const transfer = detail?.transfer ?? null;
 const events = useMemo(
 () =>
 [...(detail?.events ?? [])].sort((a, b) => a.createdAt - b.createdAt),
 [detail],
 );

 const receiveForm = useForm<ReceiveFormValues>({
 defaultValues: { quantities: {}, note: '' },
 });
 const cancelForm = useForm<CancelFormValues>({
 defaultValues: { reason: '' },
 });

 const openReceive = () => {
 if (!transfer) return;
 receiveForm.reset({
 quantities: Object.fromEntries(
 transfer.lines.map((line) => [
 line.productId,
 line.shippedQuantity - line.receivedQuantity,
 ]),
 ),
 note: '',
 });
 setDialog('receive');
 };

 const submitAccept = () => {
 void controller
 .start({ kind: 'accepted', transferId })
 .then(() => setDialog(null));
 };

 const submitShip = () => {
 void controller
 .start({ kind: 'shipped', transferId })
 .then(() => setDialog(null));
 };

 const submitReceive = receiveForm.handleSubmit((values) => {
 if (!transfer) return;
 const lines = transfer.lines
 .map((line) => ({
 productId: line.productId,
 quantity: Number(values.quantities[line.productId] ?? 0),
 }))
 .filter((line) => line.quantity > 0);
 if (!lines.length) {
 receiveForm.setError('quantities', {
 type: 'required',
 message: 'Introdu cel puțin o cantitate pozitivă.',
 });
 return;
 }
 void controller
 .start({
 kind: 'received',
 transferId,
 lines,
 note: values.note.trim() || undefined,
 })
 .then(() => setDialog(null));
 });

 const submitCancel = cancelForm.handleSubmit((values) => {
 void controller
 .start({ kind: 'cancelled', transferId, reason: values.reason })
 .then(() => setDialog(null));
 });

 if (detail === undefined)
 return <p className="text-sm text-muted-foreground">Se încarcă…</p>;
 if (detail === null || !transfer)
 return (
 <p className="text-sm text-muted-foreground">
 Transferul nu este disponibil pentru acest cont.
 </p>
 );

 const canExecute = can('transfers.execute');
 const editable = transfer.status === 'requested' || transfer.status === 'draft';
 const receivable =
 transfer.status === 'in_transit' ||
 transfer.status === 'partially_received';
 const canReceive = canExecute || transfer.createdBy === userId;

 return (
 <section className="max-w-4xl space-y-6">
 <div>
 <Link
 to="/admin/transfers"
 className="text-sm text-amber-700 dark:text-amber-400 hover:underline"
 >
 ← Transferuri
 </Link>
 <div className="mt-1 flex flex-wrap items-center gap-3">
 <h1 className="text-2xl md:text-3xl font-medium font-serif text-foreground">
 Transfer {formatDate(transfer.createdAt)}
 </h1>
 <Badge
 variant="soft"
 className="px-3 py-1 text-sm font-medium"
 >
 {TRANSFER_STATUS_LABELS[transfer.status]}
 </Badge>
 </div>
 <p className="mt-1 text-sm text-stone-600 dark:text-stone-300 ">
 {transfer.fromName ?? '—'} → {transfer.toName ?? '—'}
 </p>
 {transfer.note && (
 <p className="mt-1 text-sm italic text-muted-foreground">{transfer.note}</p>
 )}
 {transfer.cancelReason && (
 <p className="mt-1 text-sm text-red-600 dark:text-red-400 ">
 Motiv anulare: {transfer.cancelReason}
 </p>
 )}
 </div>

 <div className="flex flex-wrap gap-2">
 {canExecute && editable && (
 <>
 {transfer.status === 'requested' && (
 <Button variant="brand"
 type="button"
 onClick={() => setDialog('accept')}
 className="rounded-md"
 >
 Acceptă
 </Button>
 )}
 <Button
 asChild
 variant="outline"
 className="rounded-md"
 >
 <Link to={`/admin/transfers/${transfer._id}/edit`}>
 Editează
 </Link>
 </Button>
 {transfer.status === 'draft' && (
 <Button variant="brand"
 type="button"
 onClick={() => setDialog('ship')}
 className="rounded-md"
 >
 Expediază
 </Button>
 )}
 <Button
 type="button"
 variant="outline"
 onClick={() => {
 cancelForm.reset({ reason: '' });
 setDialog('cancel');
 }}
 className="rounded-md border-red-300 dark:border-red-700 px-4 py-2 text-sm text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 dark:hover:text-red-400"
 >
 Anulează
 </Button>
 </>
 )}
 {canReceive && receivable && (
 <Button
 type="button"
 onClick={openReceive}
 className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-700"
 >
 Recepționează
 </Button>
 )}
 </div>

 <div className="overflow-x-auto rounded-lg border border-border bg-card">
 <Table className="min-w-full text-sm">
 <TableHeader className="bg-stone-50 dark:bg-stone-800 ">
 <TableRow className="hover:bg-stone-50 dark:hover:bg-stone-900">
 <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Produs</TableHead>
 <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Solicitat</TableHead>
 <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Planificat</TableHead>
 <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Expediat</TableHead>
 <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">Recepționat</TableHead>
 <TableHead className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-muted-foreground">În tranzit</TableHead>
 </TableRow>
 </TableHeader>
 <TableBody>
 {transfer.lines.map((line) => (
 <TableRow key={line.productId} className="hover:bg-transparent">
 <TableCell className="px-4 py-3">
 <span className="flex items-center gap-3">
 <ProductThumb
 src={thumbnails.get(line.productId)}
 alt={line.productName}
 className="size-8"
 />
 {line.productName}
 </span>
 </TableCell>
 <TableCell className="px-4 py-3">{line.requestedQuantity ?? '—'}</TableCell>
 <TableCell className="px-4 py-3">{line.quantity}</TableCell>
 <TableCell className="px-4 py-3">{line.shippedQuantity}</TableCell>
 <TableCell className="px-4 py-3">{line.receivedQuantity}</TableCell>
 <TableCell className="px-4 py-3">
 {Math.max(0, line.shippedQuantity - line.receivedQuantity)}
 </TableCell>
 </TableRow>
 ))}
 </TableBody>
 </Table>
 </div>

 <section className="rounded-lg border border-border bg-card p-5">
 <h2 className="text-sm font-medium uppercase tracking-wide text-muted-foreground">
 Istoric operațiuni
 </h2>
 <ul className="mt-3 space-y-3">
 {events.map((event: TransferEvent) => (
 <li
 key={event._id}
 className="border-l-2 border-border pl-3 text-sm"
 >
 <p className="font-medium text-foreground">
 {TRANSFER_EVENT_LABELS[event.kind] ?? event.kind}
 <span className="ml-2 font-normal text-muted-foreground">
 {formatDate(event.createdAt)} · {userLabel(event.actorId)}
 </span>
 </p>
 {event.lines && event.lines.length > 0 && (
 <p className="text-stone-600 dark:text-stone-300 ">
 {event.lines
 .map(
 (line) =>
 `${transfer.lines.find((item) => item.productId === line.productId)?.productName ?? line.productId}: ${line.quantity} buc.`,
 )
 .join(', ')}
 </p>
 )}
 {event.note && (
 <p className="italic text-muted-foreground">{event.note}</p>
 )}
 </li>
 ))}
 </ul>
 </section>

 {dialog === 'accept' && (
 <AdminDialog
 title="Acceptă solicitarea"
 locked={controller.busy}
 onClose={() => setDialog(null)}
 >
 <ul className="space-y-1 text-sm text-stone-700 dark:text-stone-300 ">
 {transfer.lines.map((line) => (
 <li key={line.productId} className="flex items-center gap-2.5">
 <ProductThumb
 src={thumbnails.get(line.productId)}
 alt={line.productName}
 className="size-8"
 />
 <span>
 {line.productName}: <strong>{line.quantity} buc.</strong>
 </span>
 </li>
 ))}
 </ul>
 <p className="mt-3 text-sm text-muted-foreground">
 Transferul trece în draft cu sursa Atelier și cantitățile
 solicitate. Stocul va fi scăzut abia la expediere; dacă detaliile
 trebuie ajustate, folosește Editează.
 </p>
 <div className="mt-5 flex justify-end gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setDialog(null)}
 className="rounded-md"
 >
 Renunță
 </Button>
 <Button variant="brand"
 type="button"
 onClick={submitAccept}
 disabled={controller.busy || controller.blocked}
 className="rounded-md"
 >
 {controller.busy ? 'Se trimite…' : 'Acceptă'}
 </Button>
 </div>
 </AdminDialog>
 )}

 {dialog === 'ship' && (
 <AdminDialog
 title="Confirmă expedierea"
 locked={controller.busy}
 onClose={() => setDialog(null)}
 >
 <ul className="space-y-1 text-sm text-stone-700 dark:text-stone-300 ">
 {transfer.lines.map((line) => (
 <li key={line.productId} className="flex items-center gap-2.5">
 <ProductThumb
 src={thumbnails.get(line.productId)}
 alt={line.productName}
 className="size-8"
 />
 <span>
 {line.productName}: <strong>{line.quantity} buc.</strong>
 </span>
 </li>
 ))}
 </ul>
 <p className="mt-3 text-sm text-muted-foreground">
 Stocul sursei ({transfer.fromName ?? '—'}) va fi scăzut imediat;
 destinația este actualizată la recepție.
 </p>
 <div className="mt-5 flex justify-end gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setDialog(null)}
 className="rounded-md"
 >
 Renunță
 </Button>
 <Button variant="brand"
 type="button"
 onClick={submitShip}
 disabled={controller.busy || controller.blocked}
 className="rounded-md"
 >
 {controller.busy ? 'Se trimite…' : 'Expediază'}
 </Button>
 </div>
 </AdminDialog>
 )}

 {dialog === 'receive' && (
 <AdminDialog
 title="Recepționează transferul"
 locked={controller.busy}
 onClose={() => setDialog(null)}
 >
 <form onSubmit={submitReceive} className="space-y-4">
 <ul className="space-y-3">
 {transfer.lines
 .filter(
 (line) =>
 line.shippedQuantity - line.receivedQuantity > 0,
 )
 .map((line) => (
 <li
 key={line.productId}
 className="flex items-end justify-between gap-3"
 >
 <div className="flex items-center gap-3">
 <ProductThumb
 src={thumbnails.get(line.productId)}
 alt={line.productName}
 />
 <div>
 <p className="text-sm font-medium text-foreground">
 {line.productName}
 </p>
 <p className="text-xs text-muted-foreground">
 În tranzit:{' '}
 {line.shippedQuantity - line.receivedQuantity} buc.
 </p>
 </div>
 </div>
 <Input
 type="number"
 min={0}
 max={remaining(transfer, line.productId)}
 step={1}
 aria-label={`Cantitate ${line.productName}`}
 className="h-auto w-28 rounded-md px-3.5 py-2.5"
 {...receiveForm.register(
 `quantities.${line.productId}`,
 {
 valueAsNumber: true,
 min: 0,
 max: remaining(transfer, line.productId),
 },
 )}
 />
 </li>
 ))}
 </ul>
 {receiveForm.formState.errors.quantities?.message ? (
 <p className="text-xs text-red-600 dark:text-red-400 ">
 {String(receiveForm.formState.errors.quantities.message)}
 </p>
 ) : null}
 <div>
 <FieldLabel variant="caps" htmlFor="receive-note">
 Notă (opțional)
 </FieldLabel>
 <Textarea
 id="receive-note"
 rows={2}
 className="w-full rounded-md px-3.5 py-2.5"
 {...receiveForm.register('note')}
 />
 </div>
 <div className="flex justify-end gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setDialog(null)}
 className="rounded-md"
 >
 Renunță
 </Button>
 <Button
 type="submit"
 disabled={controller.busy || controller.blocked}
 className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-700"
 >
 {controller.busy ? 'Se trimite…' : 'Confirmă recepția'}
 </Button>
 </div>
 </form>
 </AdminDialog>
 )}

 {dialog === 'cancel' && (
 <AdminDialog
 title="Anulează transferul"
 locked={controller.busy}
 onClose={() => setDialog(null)}
 >
 <form onSubmit={submitCancel} className="space-y-4">
 <div>
 <FieldLabel variant="caps" htmlFor="cancel-reason">
 Motiv anulare
 </FieldLabel>
 <Textarea
 id="cancel-reason"
 rows={2}
 className="w-full rounded-md px-3.5 py-2.5"
 {...cancelForm.register('reason', {
 required: 'Motivul este obligatoriu.',
 minLength: {
 value: 3,
 message: 'Minim 3 caractere.',
 },
 })}
 />
 {cancelForm.formState.errors.reason && (
 <p className="mt-1 text-xs text-red-600 dark:text-red-400 ">
 {cancelForm.formState.errors.reason.message}
 </p>
 )}
 </div>
 <div className="flex justify-end gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => setDialog(null)}
 className="rounded-md"
 >
 Renunță
 </Button>
 <Button
 type="submit"
 variant="destructive"
 disabled={controller.busy || controller.blocked}
 className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium hover:bg-red-700"
 >
 {controller.busy ? 'Se trimite…' : 'Anulează transferul'}
 </Button>
 </div>
 </form>
 </AdminDialog>
 )}

 {controller.error && (
 <Alert variant="destructive" className="rounded-md">
 <AlertDescription>
 {controller.error}
 {controller.pending && (
 <Button
 type="button"
 variant="destructive"
 size="sm"
 onClick={() => void controller.retry()}
 className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-700"
 >
 Reîncearcă
 </Button>
 )}
 </AlertDescription>
 </Alert>
 )}
 {controller.completed && (
 <p className="text-sm text-emerald-700 dark:text-emerald-400 ">
 Acțiunea a fost înregistrată cu succes.
 </p>
 )}
 {!canExecute && transfer.status === 'requested' && (
 <p className="text-sm text-muted-foreground">
 Solicitarea așteaptă aprobarea echipei de atelier.
 </p>
 )}
 </section>
 );
};

export default TransferDetail;
