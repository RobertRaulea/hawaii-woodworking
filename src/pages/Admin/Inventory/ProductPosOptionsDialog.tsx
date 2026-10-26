import { useState } from 'react';
import { useMutation } from 'convex/react';
import { Controller, useForm } from 'react-hook-form';
import { api } from '../../../../convex/_generated/api';
import { AdminDialog } from '../../../components/AdminDialog/AdminDialog';
import { ProductThumb } from '../../../components/ProductThumb';
import { useProductThumbnails } from '../../../hooks/useProductThumbnails';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
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
 const thumbnails = useProductThumbnails();
 const [error, setError] = useState('');
 const {
 register,
 handleSubmit,
 control,
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
 <div className="mb-5 flex items-center gap-3">
 <ProductThumb
 src={thumbnails.get(product.id)}
 alt={product.name}
 />
 <p className="min-w-0 text-sm text-stone-500 dark:text-stone-400 ">{product.name}</p>
 </div>
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
 <Input
 id="inventory-sku"
 disabled={isSubmitting}
 maxLength={80}
 className="mt-2 h-auto w-full rounded-lg p-3"
 {...register('sku')}
 />
 </label>
 <label htmlFor="pos-favorite" className="flex min-h-11 cursor-pointer items-center gap-3 text-sm">
 <Controller
 name="favorite"
 control={control}
 render={({ field }) => (
 <Checkbox
 id="pos-favorite"
 checked={field.value}
 onCheckedChange={field.onChange}
 onBlur={field.onBlur}
 ref={field.ref}
 disabled={isSubmitting}
 className="h-4 w-4"
 />
 )}
 />{' '}
 Produs rapid în POS (favorit)
 </label>
 {error ? (
 <p role="alert" className="text-sm text-red-700 dark:text-red-400 ">
 {error}
 </p>
 ) : null}
 <Button
 type="submit"
 variant="secondary"
 disabled={!online || isSubmitting}
 className="min-h-12 w-full rounded-xl px-4 py-3 font-semibold"
 >
 Salvează opțiunile
 </Button>
 </form>
 </AdminDialog>
 );
};
