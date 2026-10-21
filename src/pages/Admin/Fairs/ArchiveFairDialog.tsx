import { useEffect, useRef, useState } from 'react';
import { ExclamationTriangleIcon } from '@heroicons/react/24/outline';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { useAdminQuery } from '../../../hooks/useAdminQuery';
import { formatStock } from '../../../utils/inventory.utils';
import { InventoryFeedback } from '../Inventory/InventoryFeedback';
import type { InventoryController } from '../../../types/inventory.types';

interface ArchiveFairDialogProps {
  fairId: Id<'fairs'>;
  operation: InventoryController;
  onClose: () => void;
}

export const ArchiveFairDialog = ({
  fairId,
  operation,
  onClose,
}: ArchiveFairDialogProps) => {
  const { data, error } = useAdminQuery(api.pos.getArchivePreview, { fairId });
  const previous = useRef(operation.completed?.requestId);
  const [requestId] = useState(() => crypto.randomUUID());
  const submitted = useRef(false);
  useEffect(() => {
    if (
      submitted.current &&
      operation.completed &&
      operation.completed.requestId !== previous.current
    )
      onClose();
  }, [operation.completed, onClose]);
  const blocked =
    !data ||
    !data.fair.active ||
    data.pendingPayments > 0 ||
    data.tooLarge ||
    data.items.some((item) => item.issue !== null) ||
    operation.blocked ||
    operation.busy ||
    !operation.online;
  return (
    <AdminDialog
      title="Arhivare târg"
      locked={Boolean(operation.pending) || operation.busy}
      onClose={onClose}
    >
      {error ? (
        <p role="alert" className="text-sm text-red-700">
          {error}
        </p>
      ) : !data ? (
        <p role="status">Se verifică stocul și plățile...</p>
      ) : (
        <>
          <ExclamationTriangleIcon className="mb-3 h-8 w-8 text-amber-700" />
          <h3 className="text-xl font-semibold">{data.fair.name}</h3>
          <p className="mb-5 mt-2 text-sm leading-6 text-stone-600">
            Produsele de mai jos vor fi returnate în stocul online. Târgul nu va
            mai apărea în POS; vânzările și istoricul rămân păstrate.
          </p>
          {data.pendingPayments > 0 ? (
            <p
              role="alert"
              className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-800"
            >
              Există {data.pendingPayments} plăți POS neclarificate. Rezolvă
              plățile înainte de arhivare.
            </p>
          ) : null}
          {data.tooLarge ? (
            <p role="alert" className="mb-4 text-sm text-red-700">
              Prea multe produse pentru o singură arhivare. Transferă stocul
              explicit înainte.
            </p>
          ) : null}
          {!data.fair.active ? (
            <p role="status" className="mb-4 text-sm text-amber-800">
              Acest târg este deja arhivat.
            </p>
          ) : null}
          {data.items.length ? (
            <div className="mb-5 overflow-x-auto rounded-lg border border-stone-200">
              <table className="w-full text-sm">
                <caption className="sr-only">
                  Produsele returnate online la arhivare
                </caption>
                <thead className="bg-stone-50 text-xs text-stone-500">
                  <tr>
                    <th className="p-3 text-left">Produs</th>
                    <th className="p-3 text-right">De returnat</th>
                    <th className="p-3 text-right">Disponibil online după</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item) => (
                    <tr
                      key={item.productId}
                      className="border-t border-stone-100"
                    >
                      <td className="p-3 font-medium">
                        {item.name}
                        {item.issue ? (
                          <p role="alert" className="mt-1 text-xs text-red-700">
                            {item.issue}
                          </p>
                        ) : null}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatStock(item.quantity)}
                      </td>
                      <td className="p-3 text-right tabular-nums">
                        {formatStock(item.onlineAfter)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="mb-5 rounded-lg bg-stone-100 p-4 text-sm">
              Târgul nu mai are produse în stoc.
            </p>
          )}
          <p className="mb-4 text-sm font-medium">
            Total de returnat:{' '}
            {formatStock(
              data.items.reduce((sum, item) => sum + item.quantity, 0),
            )}{' '}
            buc. · Totalul general nu se schimbă.
          </p>
          <button
            type="button"
            disabled={blocked}
            onClick={async () => {
              submitted.current = true;
              await operation.start({
                requestId,
                kind: 'archive',
                fairId,
                expectedInventory: data.items.map(
                  ({ productId, quantity }) => ({ productId, quantity }),
                ),
              });
            }}
            className="min-h-12 w-full rounded-xl bg-amber-800 px-4 py-3 font-semibold text-white hover:bg-amber-900 disabled:opacity-40"
          >
            Returnează stocul online și arhivează
          </button>
        </>
      )}
      <InventoryFeedback operation={{ ...operation, completed: null }} />
    </AdminDialog>
  );
};
