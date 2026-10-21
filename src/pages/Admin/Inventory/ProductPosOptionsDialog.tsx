import { useState } from 'react';
import { useMutation } from 'convex/react';
import { useForm } from 'react-hook-form';
import { api } from '../../../../convex/_generated/api';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { inventoryError } from '../../../utils/inventory.utils';
import type { InventoryProduct } from '../../../types/inventory.types';

interface ProductPosOptionsDialogProps {
  product: InventoryProduct;
  online: boolean;
  onClose: () => void;
}

export const ProductPosOptionsDialog = ({
  product,
  online,
  onClose,
}: ProductPosOptionsDialogProps) => {
  const save = useMutation(api.pos.setProductOptions);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
  } = useForm<{ sku: string; favorite: boolean }>({
    defaultValues: { sku: product.sku, favorite: product.favorite },
  });
  return (
    <AdminDialog
      title="Opțiuni produs pentru POS"
      locked={isSubmitting}
      onClose={onClose}
    >
      <p className="mb-5 text-sm text-stone-500">{product.name}</p>
      <form
        className="space-y-4"
        onSubmit={handleSubmit(async (values) => {
          if (!online) return;
          setError('');
          try {
            await save({ productId: product.id, ...values });
            onClose();
          } catch (cause) {
            setError(inventoryError(cause));
          }
        })}
      >
        <label htmlFor="inventory-sku" className="block text-sm font-medium">
          SKU / cod scanabil
          <input
            id="inventory-sku"
            disabled={isSubmitting}
            maxLength={80}
            className="mt-2 w-full rounded-lg border border-stone-300 p-3"
            {...register('sku')}
          />
        </label>
        <label className="flex min-h-11 items-center gap-3 text-sm">
          <input
            type="checkbox"
            disabled={isSubmitting}
            {...register('favorite')}
            className="h-4 w-4 accent-amber-700"
          />{' '}
          Produs rapid în POS (favorit)
        </label>
        {error ? (
          <p role="alert" className="text-sm text-red-700">
            {error}
          </p>
        ) : null}
        <button
          disabled={!online || isSubmitting}
          className="min-h-12 w-full rounded-xl bg-stone-900 px-4 py-3 font-semibold text-white disabled:opacity-40"
        >
          Salvează opțiunile
        </button>
      </form>
    </AdminDialog>
  );
};
