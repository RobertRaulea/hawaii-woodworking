import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { formatStock } from '../../../utils/inventory.utils';
import { InventoryFeedback } from './InventoryFeedback';
import type {
  InventoryController,
  InventoryFair,
  InventoryProduct,
  TransferDirection,
} from '../../../types/inventory.types';

interface StockTransferDialogProps {
  products: InventoryProduct[];
  fairs: InventoryFair[];
  initialProductId?: string;
  initialFairId?: string;
  operation: InventoryController;
  onClose: () => void;
}

interface TransferFields {
  productId: string;
  fairId: string;
  direction: TransferDirection;
  quantity: string;
}

export const StockTransferDialog = ({
  products,
  fairs,
  initialProductId,
  initialFairId,
  operation,
  onClose,
}: StockTransferDialogProps) => {
  const activeFairs = fairs.filter((fair) => fair.active);
  const previous = useRef(operation.completed?.requestId);
  const [requestId] = useState(() => crypto.randomUUID());
  const submitted = useRef(false);
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<TransferFields>({
    defaultValues: {
      productId: initialProductId ?? '',
      fairId:
        activeFairs.find((fair) => fair._id === initialFairId)?._id ??
        activeFairs[0]?._id ??
        '',
      direction: 'to_fair',
      quantity: '1',
    },
  });
  const product = products.find((item) => item.id === watch('productId'));
  const fair = activeFairs.find((item) => item._id === watch('fairId'));
  const direction = watch('direction');
  const fairStock =
    product?.fairs.find((row) => row.fairId === fair?._id)?.quantity ?? 0;
  const source =
    direction === 'to_fair' ? (product?.onlineStock ?? null) : fairStock;
  const disabled =
    operation.blocked || operation.busy || isSubmitting || !operation.online;
  useEffect(() => {
    if (
      submitted.current &&
      operation.completed &&
      operation.completed.requestId !== previous.current
    )
      onClose();
  }, [operation.completed, onClose]);

  return (
    <AdminDialog
      title="Transfer de stoc"
      locked={Boolean(operation.pending) || operation.busy}
      onClose={onClose}
    >
      <p className="mb-5 text-sm leading-6 text-stone-500">
        Muți produse între online și târg. Totalul fizic rămâne neschimbat.
      </p>
      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          if (!product || !fair) return;
          submitted.current = true;
          await operation.start({
            requestId,
            kind: 'transfer',
            productId: product.id,
            fairId: fair._id,
            direction: values.direction,
            quantity: Number(values.quantity),
          });
        })}
      >
        <div>
          <label htmlFor="stock-product" className="block text-sm font-medium">
            Produs
          </label>
          <select
            id="stock-product"
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-3"
            {...register('productId', {
              validate: (value) =>
                Boolean(
                  products.find(
                    (item) => item.id === value && !item.invalidStock,
                  ),
                ) || 'Selectează un produs cu stoc valid.',
            })}
          >
            <option value="">Alege produsul</option>
            {products.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
                {item.sku ? ` · ${item.sku}` : ''}
              </option>
            ))}
          </select>
          {errors.productId ? (
            <p role="alert" className="mt-1 text-sm text-red-700">
              {errors.productId.message}
            </p>
          ) : null}
        </div>
        <div>
          <label htmlFor="stock-fair" className="block text-sm font-medium">
            Târg
          </label>
          <select
            id="stock-fair"
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-3"
            {...register('fairId', {
              validate: (value) =>
                activeFairs.some((item) => item._id === value) ||
                'Selectează un târg activ.',
            })}
          >
            {!activeFairs.length ? (
              <option value="">Nu există târguri active</option>
            ) : null}
            {activeFairs.map((item) => (
              <option key={item._id} value={item._id}>
                {item.name}
              </option>
            ))}
          </select>
          {errors.fairId ? (
            <p role="alert" className="mt-1 text-sm text-red-700">
              {errors.fairId.message}
            </p>
          ) : null}
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="stock-direction"
              className="block text-sm font-medium"
            >
              Direcția transferului
            </label>
            <select
              id="stock-direction"
              disabled={disabled}
              className="mt-1 min-h-12 w-full rounded-lg border border-stone-300 bg-white p-3"
              {...register('direction')}
            >
              <option value="to_fair">Online → târg</option>
              <option value="to_online">Târg → online</option>
            </select>
          </div>
          <div>
            <label
              htmlFor="stock-quantity"
              className="block text-sm font-medium"
            >
              Cantitate
            </label>
            <input
              id="stock-quantity"
              inputMode="numeric"
              disabled={disabled}
              className="mt-1 w-full rounded-lg border border-stone-300 p-3"
              {...register('quantity', {
                validate: (value) => {
                  const quantity = Number(value);
                  return (
                    (/^\d+$/.test(value) &&
                      Number.isSafeInteger(quantity) &&
                      quantity > 0 &&
                      source !== null &&
                      quantity <= source) ||
                    'Introdu o cantitate întreagă pozitivă, disponibilă în sursă.'
                  );
                },
              })}
            />
            {errors.quantity ? (
              <p role="alert" className="mt-1 text-sm text-red-700">
                {errors.quantity.message}
              </p>
            ) : null}
          </div>
        </div>
        {product ? (
          <dl className="grid grid-cols-3 gap-3 rounded-xl bg-stone-100 p-4 text-sm">
            <div>
              <dt className="text-xs text-stone-500">Total</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {formatStock(product.totalStock)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Online disponibil</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {formatStock(product.onlineStock)}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-stone-500">Acest târg</dt>
              <dd className="mt-1 font-semibold tabular-nums">
                {formatStock(fairStock)}
              </dd>
            </div>
          </dl>
        ) : null}
        {!product?.trackStock && product ? (
          <p className="text-sm text-amber-800">
            Stocul online nu este urmărit. Poți returna stoc deja alocat, dar
            trebuie activată evidența înainte de o alocare nouă.
          </p>
        ) : null}
        {!operation.online ? (
          <p role="status" className="text-sm text-red-700">
            Fără conexiune. Transferul este blocat.
          </p>
        ) : null}
        <button
          type="submit"
          disabled={disabled || !activeFairs.length}
          className="min-h-12 w-full rounded-xl bg-amber-700 px-4 py-3 font-semibold text-white hover:bg-amber-800 disabled:opacity-40"
        >
          {operation.busy ? 'Se salvează...' : 'Confirmă transferul'}
        </button>
      </form>
      <InventoryFeedback operation={{ ...operation, completed: null }} />
    </AdminDialog>
  );
};
