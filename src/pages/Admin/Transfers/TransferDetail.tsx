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
import {
  TRANSFER_EVENT_LABELS,
  TRANSFER_STATUS_LABELS,
} from '../../../utils/transfer.utils';
import type {
  TransferDoc,
  TransferEvent,
} from '../../../types/transfers.types';

const fieldClass =
  'w-full rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40';
const labelClass =
  'block text-xs font-medium uppercase tracking-wide text-stone-500 mb-1.5';
const thClass =
  'px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-stone-500';
const tdClass = 'px-4 py-3';

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
    return <p className="text-sm text-stone-500">Se încarcă…</p>;
  if (detail === null || !transfer)
    return (
      <p className="text-sm text-stone-500">
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
          className="text-sm text-amber-700 hover:underline"
        >
          ← Transferuri
        </Link>
        <div className="mt-1 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold text-stone-900">
            Transfer {formatDate(transfer.createdAt)}
          </h1>
          <span className="rounded-full bg-stone-100 px-3 py-1 text-sm font-medium text-stone-700">
            {TRANSFER_STATUS_LABELS[transfer.status]}
          </span>
        </div>
        <p className="mt-1 text-sm text-stone-600">
          {transfer.fromName ?? '—'} → {transfer.toName ?? '—'}
        </p>
        {transfer.note && (
          <p className="mt-1 text-sm italic text-stone-500">{transfer.note}</p>
        )}
        {transfer.cancelReason && (
          <p className="mt-1 text-sm text-red-600">
            Motiv anulare: {transfer.cancelReason}
          </p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        {canExecute && editable && (
          <>
            {transfer.status === 'requested' && (
              <button
                type="button"
                onClick={() => setDialog('accept')}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Acceptă
              </button>
            )}
            <Link
              to={`/admin/transfers/${transfer._id}/edit`}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
            >
              Editează
            </Link>
            {transfer.status === 'draft' && (
              <button
                type="button"
                onClick={() => setDialog('ship')}
                className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
              >
                Expediază
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                cancelForm.reset({ reason: '' });
                setDialog('cancel');
              }}
              className="rounded-md border border-red-300 px-4 py-2 text-sm text-red-700 hover:bg-red-50"
            >
              Anulează
            </button>
          </>
        )}
        {canReceive && receivable && (
          <button
            type="button"
            onClick={openReceive}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700"
          >
            Recepționează
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border border-stone-200 bg-white">
        <table className="min-w-full divide-y divide-stone-200 text-sm">
          <thead className="bg-stone-50">
            <tr>
              <th className={thClass}>Produs</th>
              <th className={thClass}>Solicitat</th>
              <th className={thClass}>Planificat</th>
              <th className={thClass}>Expediat</th>
              <th className={thClass}>Recepționat</th>
              <th className={thClass}>În tranzit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {transfer.lines.map((line) => (
              <tr key={line.productId}>
                <td className={tdClass}>{line.productName}</td>
                <td className={tdClass}>{line.requestedQuantity ?? '—'}</td>
                <td className={tdClass}>{line.quantity}</td>
                <td className={tdClass}>{line.shippedQuantity}</td>
                <td className={tdClass}>{line.receivedQuantity}</td>
                <td className={tdClass}>
                  {Math.max(0, line.shippedQuantity - line.receivedQuantity)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="rounded-lg border border-stone-200 bg-white p-5">
        <h2 className="text-sm font-medium uppercase tracking-wide text-stone-500">
          Istoric operațiuni
        </h2>
        <ul className="mt-3 space-y-3">
          {events.map((event: TransferEvent) => (
            <li
              key={event._id}
              className="border-l-2 border-stone-200 pl-3 text-sm"
            >
              <p className="font-medium text-stone-900">
                {TRANSFER_EVENT_LABELS[event.kind] ?? event.kind}
                <span className="ml-2 font-normal text-stone-500">
                  {formatDate(event.createdAt)} · {userLabel(event.actorId)}
                </span>
              </p>
              {event.lines && event.lines.length > 0 && (
                <p className="text-stone-600">
                  {event.lines
                    .map(
                      (line) =>
                        `${transfer.lines.find((item) => item.productId === line.productId)?.productName ?? line.productId}: ${line.quantity} buc.`,
                    )
                    .join(', ')}
                </p>
              )}
              {event.note && (
                <p className="italic text-stone-500">{event.note}</p>
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
          <ul className="space-y-1 text-sm text-stone-700">
            {transfer.lines.map((line) => (
              <li key={line.productId}>
                {line.productName}: <strong>{line.quantity} buc.</strong>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-stone-500">
            Transferul trece în draft cu sursa Atelier și cantitățile
            solicitate. Stocul va fi scăzut abia la expediere; dacă detaliile
            trebuie ajustate, folosește Editează.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDialog(null)}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700"
            >
              Renunță
            </button>
            <button
              type="button"
              onClick={submitAccept}
              disabled={controller.busy || controller.blocked}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {controller.busy ? 'Se trimite…' : 'Acceptă'}
            </button>
          </div>
        </AdminDialog>
      )}

      {dialog === 'ship' && (
        <AdminDialog
          title="Confirmă expedierea"
          locked={controller.busy}
          onClose={() => setDialog(null)}
        >
          <ul className="space-y-1 text-sm text-stone-700">
            {transfer.lines.map((line) => (
              <li key={line.productId}>
                {line.productName}: <strong>{line.quantity} buc.</strong>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-sm text-stone-500">
            Stocul sursei ({transfer.fromName ?? '—'}) va fi scăzut imediat;
            destinația este actualizată la recepție.
          </p>
          <div className="mt-5 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDialog(null)}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700"
            >
              Renunță
            </button>
            <button
              type="button"
              onClick={submitShip}
              disabled={controller.busy || controller.blocked}
              className="rounded-md bg-amber-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {controller.busy ? 'Se trimite…' : 'Expediază'}
            </button>
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
                    <div>
                      <p className="text-sm font-medium text-stone-900">
                        {line.productName}
                      </p>
                      <p className="text-xs text-stone-500">
                        În tranzit:{' '}
                        {line.shippedQuantity - line.receivedQuantity} buc.
                      </p>
                    </div>
                    <input
                      type="number"
                      min={0}
                      max={remaining(transfer, line.productId)}
                      step={1}
                      aria-label={`Cantitate ${line.productName}`}
                      className={`${fieldClass} w-28`}
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
              <p className="text-xs text-red-600">
                {String(receiveForm.formState.errors.quantities.message)}
              </p>
            ) : null}
            <div>
              <label htmlFor="receive-note" className={labelClass}>
                Notă (opțional)
              </label>
              <textarea
                id="receive-note"
                rows={2}
                className={fieldClass}
                {...receiveForm.register('note')}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700"
              >
                Renunță
              </button>
              <button
                type="submit"
                disabled={controller.busy || controller.blocked}
                className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {controller.busy ? 'Se trimite…' : 'Confirmă recepția'}
              </button>
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
              <label htmlFor="cancel-reason" className={labelClass}>
                Motiv anulare
              </label>
              <textarea
                id="cancel-reason"
                rows={2}
                className={fieldClass}
                {...cancelForm.register('reason', {
                  required: 'Motivul este obligatoriu.',
                  minLength: {
                    value: 3,
                    message: 'Minim 3 caractere.',
                  },
                })}
              />
              {cancelForm.formState.errors.reason && (
                <p className="mt-1 text-xs text-red-600">
                  {cancelForm.formState.errors.reason.message}
                </p>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setDialog(null)}
                className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700"
              >
                Renunță
              </button>
              <button
                type="submit"
                disabled={controller.busy || controller.blocked}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
              >
                {controller.busy ? 'Se trimite…' : 'Anulează transferul'}
              </button>
            </div>
          </form>
        </AdminDialog>
      )}

      {controller.error && (
        <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          <p>{controller.error}</p>
          {controller.pending && (
            <button
              type="button"
              onClick={() => void controller.retry()}
              className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
            >
              Reîncearcă
            </button>
          )}
        </div>
      )}
      {controller.completed && (
        <p className="text-sm text-emerald-700">
          Acțiunea a fost înregistrată cu succes.
        </p>
      )}
      {!canExecute && transfer.status === 'requested' && (
        <p className="text-sm text-stone-500">
          Solicitarea așteaptă aprobarea echipei de atelier.
        </p>
      )}
    </section>
  );
};

export default TransferDetail;
