import { useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';

import { useMutation, useQuery } from 'convex/react';
import type { Id } from '../../../convex/_generated/dataModel';
import { api } from '../../../convex/_generated/api';

interface FormValues {
  productId: string;
  file: FileList;
}

export const DevProductImages: React.FC = () => {
  const products = useQuery(api.products.getAll);

  const generateUploadUrl = useMutation(api.products.generateProductImageUploadUrl);
  const addProductImage = useMutation(api.products.addProductImage);

  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { isSubmitting },
    reset,
    watch,
  } = useForm<FormValues>({
    defaultValues: {
      productId: '',
    },
  });

  const selectedFile = watch('file')?.[0] ?? null;

  const isReady = useMemo(() => {
    return Boolean(products && products.length > 0);
  }, [products]);

  const onSubmit = async (values: FormValues) => {
    setStatus(null);
    setError(null);

    const file = values.file?.[0];
    if (!file) {
      setError('Please select an image file.');
      return;
    }

    if (!values.productId) {
      setError('Please select a product.');
      return;
    }

    try {
      const postUrl = await generateUploadUrl({});

      const uploadResponse = await fetch(postUrl, {
        method: 'POST',
        headers: {
          'Content-Type': file.type,
        },
        body: file,
      });

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`);
      }

      const uploadJson: unknown = await uploadResponse.json();
      const storageId = (uploadJson as { storageId?: string }).storageId;

      if (!storageId) {
        throw new Error('Upload did not return a storageId.');
      }

      await addProductImage({
        productId: values.productId as Id<'products'>,
        storageId: storageId as Id<'_storage'>,
      });

      setStatus('Uploaded and attached image successfully.');
      reset({ productId: values.productId });
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to upload image';
      setError(message);
    }
  };

  return (
    <main className="container mx-auto px-4 py-8">
      <h1 className="text-2xl font-bold">Dev: Product Images</h1>
      <p className="mt-2 text-sm text-gray-600">
        Upload an image to Convex File Storage and attach it to a product.
      </p>

      {!isReady && <p className="mt-6">Loading products...</p>}

      {products && products.length === 0 && (
        <p className="mt-6 text-amber-700">
          No products found. Seed products first, then return here.
        </p>
      )}

      {isReady && (
        <form onSubmit={handleSubmit(onSubmit)} className="mt-6 space-y-4 max-w-xl">
          <label className="block">
            <span className="block text-sm font-medium text-gray-900">Product</span>
            <select
              className="mt-1 block w-full rounded-md border border-gray-300 bg-white px-3 py-2"
              {...register('productId', { required: true })}
            >
              <option value="">Select a product...</option>
              {products?.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="block text-sm font-medium text-gray-900">Image file</span>
            <input
              className="mt-1 block w-full text-sm"
              type="file"
              accept="image/*"
              {...register('file', { required: true })}
            />
          </label>

          {selectedFile && (
            <p className="text-sm text-gray-600">
              Selected: <span className="font-medium">{selectedFile.name}</span>
            </p>
          )}

          {status && <p className="text-sm text-green-700">{status}</p>}
          {error && <p className="text-sm text-red-700">{error}</p>}

          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center justify-center rounded-lg bg-amber-700 px-4 py-2 text-white disabled:opacity-50"
          >
            {isSubmitting ? 'Uploading...' : 'Upload & Attach'}
          </button>
        </form>
      )}
    </main>
  );
};
