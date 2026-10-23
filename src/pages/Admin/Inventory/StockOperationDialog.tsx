import { useCallback, useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useConvex, useMutation } from 'convex/react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { formatStock } from '../../../utils/inventory.utils';
import { StockOperationFeedback } from './StockOperationFeedback';
import type {
  InventoryFair,
  InventoryProduct,
  StockOperationController,
} from '../../../types/inventory.types';

type OperationKind = 'receipt' | 'adjustment' | 'count' | 'threshold';

interface StockOperationDialogProps {
  product: InventoryProduct;
  fairs: InventoryFair[];
  operation: StockOperationController;
  onClose: () => void;
}

interface StockFields {
  kind: OperationKind;
  quantity: string;
  location: string;
  delta: string;
  reason: 'damaged' | 'lost' | 'found' | 'correction' | 'other';
  note: string;
  counted: string;
  threshold: string;
}

interface CountSnapshot {
  expectedQuantity: number;
  lastMovementId: Id<'stockMovements'> | null;
  held: number;
  posSaleInProgress: boolean;
}

const REASON_LABELS = [
  ['damaged', 'Deteriorat'],
  ['lost', 'Pierdut'],
  ['found', 'Găsit'],
  ['correction', 'Corecție'],
  ['other', 'Altele'],
] as const;

export const StockOperationDialog = ({
  product,
  fairs,
  operation,
  onClose,
}: StockOperationDialogProps) => {
  const convex = useConvex();
  const setThreshold = useMutation(api.inventory.setLowStockThreshold);
  const activeFairs = fairs.filter((fair) => fair.active);
  const submitted = useRef(false);
  const previous = useRef(operation.completed?.requestId);
  const [snapshot, setSnapshot] = useState<CountSnapshot | null>(null);
  const [snapshotError, setSnapshotError] = useState('');
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<StockFields>({
    defaultValues: {
      kind: 'receipt',
      quantity: '1',
      location: 'workshop',
      delta: '',
      reason: 'damaged',
      note: '',
      counted: '',
      threshold:
        product.lowStockThreshold === null ? '' : String(product.lowStockThreshold),
    },
  });
  const kind = watch('kind');
  const location = watch('location');
  const counted = watch('counted');
  const locationFair =
    location === 'workshop' ? undefined : (location as Id<'fairs'>);

  const loadSnapshot = useCallback(async () => {
    setSnapshotError('');
    try {
      setSnapshot(
        await convex.query(api.inventory.countSnapshot, {
          productId: product.id,
          fairId: locationFair,
        }),
      );
    } catch {
      setSnapshot(null);
      setSnapshotError('Instantaneul de numărare nu este disponibil.');
    }
  }, [convex, product.id, locationFair]);

  useEffect(() => {
    if (kind === 'count') void loadSnapshot();
  }, [kind, loadSnapshot]);

  const disabled =
    operation.blocked || operation.busy || isSubmitting || !operation.online;
  const expected = snapshot?.expectedQuantity ?? null;
  const difference =
    expected !== null && /^-?\d+$/.test(counted)
      ? Number(counted) - expected
      : null;
  const countConflict =
    kind === 'count' && operation.error.includes('Revalidează');

  useEffect(() => {
    if (
      submitted.current &&
      operation.completed &&
      operation.completed.requestId !== previous.current
    )
      onClose();
  }, [operation.completed, onClose]);

  const onSubmit = handleSubmit(async (values) => {
    submitted.current = true;
    if (values.kind === 'receipt') {
      await operation.start({
        kind: 'receipt',
        productId: product.id,
        quantity: Number(values.quantity),
        note: values.note.trim() || undefined,
      });
      return;
    }
    if (values.kind === 'adjustment') {
      await operation.start({
        kind: 'adjustment',
        productId: product.id,
        fairId: locationFair,
        delta: Number(values.delta),
        reason: values.reason,
        note: values.note,
      });
      return;
    }
    if (values.kind === 'count') {
      if (!snapshot) return;
      await operation.start({
        kind: 'count',
        productId: product.id,
        fairId: locationFair,
        expectedQuantity: snapshot.expectedQuantity,
        lastMovementId: snapshot.lastMovementId,
        countedQuantity: Number(values.counted),
        note: values.note.trim() || undefined,
      });
      return;
    }
    try {
      const threshold = values.threshold.trim();
      await setThreshold({
        productId: product.id,
        threshold: threshold === '' ? null : Number(threshold),
      });
      onClose();
    } catch {
      setSnapshotError('Pragul nu a putut fi salvat.');
    }
  });

  return (
    <AdminDialog
      title={`Stoc: ${product.name}`}
      locked={Boolean(operation.pending) || operation.busy}
      onClose={onClose}
    >
      <form className="space-y-4" onSubmit={onSubmit}>
        <div>
          <label htmlFor="stock-op-kind" className="block text-sm font-medium">
            Operațiune
          </label>
          <select
            id="stock-op-kind"
            disabled={disabled}
            className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-3"
            {...register('kind')}
          >
            <option value="receipt">Intrare</option>
            <option value="adjustment">Ajustare</option>
            <option value="count">Inventariere</option>
            <option value="threshold">Prag minim</option>
          </select>
        </div>

        {kind === 'receipt' ? (
          <div>
            <label
              htmlFor="stock-op-quantity"
              className="block text-sm font-medium"
            >
              Cantitate intrată (Atelier)
            </label>
            <input
              id="stock-op-quantity"
              inputMode="numeric"
              disabled={disabled}
              className="mt-1 w-full rounded-lg border border-stone-300 p-3"
              {...register('quantity', {
                validate: (value) =>
                  (/^\d+$/.test(value) &&
                    Number.isSafeInteger(Number(value)) &&
                    Number(value) > 0 &&
                    Number(value) <= 10_000) ||
                  'Introdu o cantitate întreagă pozitivă.',
              })}
            />
            {errors.quantity ? (
              <p role="alert" className="mt-1 text-sm text-red-700">
                {errors.quantity.message}
              </p>
            ) : null}
          </div>
        ) : null}

        {kind === 'adjustment' || kind === 'count' ? (
          <div>
            <label
              htmlFor="stock-op-location"
              className="block text-sm font-medium"
            >
              Locație
            </label>
            <select
              id="stock-op-location"
              disabled={disabled}
              className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-3"
              {...register('location')}
            >
              <option value="workshop">Atelier</option>
              {activeFairs.map((fair) => (
                <option key={fair._id} value={fair._id}>
                  {fair.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {kind === 'adjustment' ? (
          <>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="stock-op-delta"
                  className="block text-sm font-medium"
                >
                  Diferență (+/−)
                </label>
                <input
                  id="stock-op-delta"
                  inputMode="numeric"
                  disabled={disabled}
                  className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                  {...register('delta', {
                    validate: (value) =>
                      (/^-?\d+$/.test(value.trim()) &&
                        Number(value) !== 0 &&
                        Math.abs(Number(value)) <= 10_000) ||
                      'Introdu o diferență întreagă nenulă.',
                  })}
                />
                {errors.delta ? (
                  <p role="alert" className="mt-1 text-sm text-red-700">
                    {errors.delta.message}
                  </p>
                ) : null}
              </div>
              <div>
                <label
                  htmlFor="stock-op-reason"
                  className="block text-sm font-medium"
                >
                  Motiv
                </label>
                <select
                  id="stock-op-reason"
                  disabled={disabled}
                  className="mt-1 w-full rounded-lg border border-stone-300 bg-white p-3"
                  {...register('reason')}
                >
                  {REASON_LABELS.map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div>
              <label
                htmlFor="stock-op-note"
                className="block text-sm font-medium"
              >
                Notă <span className="text-red-600">*</span>
              </label>
              <textarea
                id="stock-op-note"
                rows={2}
                disabled={disabled}
                className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                {...register('note', {
                  validate: (value) =>
                    (value.trim().length >= 3 && value.trim().length <= 500) ||
                    'Nota este obligatorie (3–500 de caractere).',
                })}
              />
              {errors.note ? (
                <p role="alert" className="mt-1 text-sm text-red-700">
                  {errors.note.message}
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        {kind === 'count' ? (
          <>
            {snapshotError ? (
              <p role="alert" className="text-sm text-red-700">
                {snapshotError}
              </p>
            ) : null}
            <dl className="grid grid-cols-3 gap-3 rounded-xl bg-stone-100 p-4 text-sm">
              <div>
                <dt className="text-xs text-stone-500">Așteptat</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {expected === null ? '—' : formatStock(expected)}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Rezervat comenzi</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {snapshot ? formatStock(snapshot.held) : '—'}
                </dd>
              </div>
              <div>
                <dt className="text-xs text-stone-500">Diferență</dt>
                <dd className="mt-1 font-semibold tabular-nums">
                  {difference === null ? '—' : formatStock(difference)}
                </dd>
              </div>
            </dl>
            {snapshot?.posSaleInProgress ? (
              <p role="status" className="text-sm text-amber-800">
                Există o vânzare POS în curs pentru acest produs la târgul
                selectat.
              </p>
            ) : null}
            <div>
              <label
                htmlFor="stock-op-counted"
                className="block text-sm font-medium"
              >
                Numărat
              </label>
              <input
                id="stock-op-counted"
                inputMode="numeric"
                disabled={disabled || !snapshot}
                className="mt-1 w-full rounded-lg border border-stone-300 p-3"
                {...register('counted', {
                  validate: (value) =>
                    (/^\d+$/.test(value) &&
                      Number.isSafeInteger(Number(value)) &&
                      Number(value) >= 0 &&
                      Number(value) <= 1_000_000) ||
                    'Introdu o cantitate numărată validă.',
                })}
              />
              {errors.counted ? (
                <p role="alert" className="mt-1 text-sm text-red-700">
                  {errors.counted.message}
                </p>
              ) : null}
            </div>
          </>
        ) : null}

        {kind === 'threshold' ? (
          <div>
            <label
              htmlFor="stock-op-threshold"
              className="block text-sm font-medium"
            >
              Prag minim Atelier
            </label>
            <input
              id="stock-op-threshold"
              inputMode="numeric"
              disabled={isSubmitting}
              className="mt-1 w-full rounded-lg border border-stone-300 p-3"
              placeholder="Gol = revenire la implicit (5)"
              {...register('threshold', {
                validate: (value) =>
                  value.trim() === '' ||
                  (/^\d+$/.test(value.trim()) &&
                    Number(value) >= 0 &&
                    Number(value) <= 100_000) ||
                  'Introdu un număr întreg între 0 și 100000, sau lasă gol.',
              })}
            />
            {errors.threshold ? (
              <p role="alert" className="mt-1 text-sm text-red-700">
                {errors.threshold.message}
              </p>
            ) : null}
          </div>
        ) : null}

        {!operation.online ? (
          <p role="status" className="text-sm text-red-700">
            Fără conexiune. Operațiunea este blocată.
          </p>
        ) : null}
        {countConflict ? (
          <button
            type="button"
            onClick={() => void loadSnapshot()}
            className="w-full rounded-xl border border-amber-700 px-4 py-3 font-semibold text-amber-800 hover:bg-amber-50"
          >
            Revalidează
          </button>
        ) : null}
        <button
          type="submit"
          disabled={
            disabled ||
            (kind === 'count' && (!snapshot || snapshot.posSaleInProgress))
          }
          className="min-h-12 w-full rounded-xl bg-amber-700 px-4 py-3 font-semibold text-white hover:bg-amber-800 disabled:opacity-40"
        >
          {operation.busy || isSubmitting ? 'Se salvează...' : 'Confirmă'}
        </button>
      </form>
      <StockOperationFeedback operation={{ ...operation, completed: null }} />
    </AdminDialog>
  );
};
