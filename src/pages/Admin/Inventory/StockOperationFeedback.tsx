import { Toast } from '../../../components/Toast';
import type {
  StockOperationController,
  StockOperationReceipt,
} from '../../../types/inventory.types';

interface StockOperationFeedbackProps {
  operation: StockOperationController;
}

const KIND_LABELS: Record<StockOperationReceipt['kind'], string> = {
  receipt: 'Intrare',
  adjustment: 'Ajustare',
  count: 'Inventariere',
};

const notice = (operation: StockOperationReceipt) => {
  const delta = operation.delta > 0 ? `+${operation.delta}` : `${operation.delta}`;
  const location =
    operation.location === 'fair'
      ? `la ${operation.fairName ?? 'târg'}`
      : 'în Atelier';
  return `${KIND_LABELS[operation.kind]}: ${operation.productName} ${delta} buc. ${location}. Sold nou: ${operation.quantityAfter}.`;
};

export const StockOperationFeedback = ({
  operation,
}: StockOperationFeedbackProps) => (
  <>
    {operation.pending ? (
      <section
        aria-label="Operațiune de stoc de verificat"
        className="my-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-amber-950"
      >
        <p className="font-semibold">
          {operation.busy
            ? 'Se salvează operațiunea...'
            : 'Operațiune de verificat'}
        </p>
        <p className="mt-1 text-sm">
          Nu porni o altă operațiune de stoc. Verifică sau reia aceeași
          referință.
        </p>
        <p className="mt-2 break-all font-mono text-xs">
          {operation.pending.requestId}
        </p>
        <button
          type="button"
          disabled={operation.busy || !operation.online}
          onClick={operation.retry}
          className="mt-3 min-h-11 rounded-lg border border-amber-800 px-4 py-2 text-sm font-semibold disabled:opacity-40"
        >
          Verifică aceeași operațiune
        </button>
      </section>
    ) : null}
    {operation.error ? (
      <p
        role="alert"
        className="my-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
      >
        {operation.error}
      </p>
    ) : null}
    {operation.completed ? (
      <Toast
        message={notice(operation.completed)}
        duration={10000}
        onClose={operation.dismissCompleted}
      />
    ) : null}
  </>
);
