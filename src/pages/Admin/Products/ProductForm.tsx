import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { Upload, X, ArrowLeft, GripVertical } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';

interface ProductFormValues {
  name: string;
  price: string;
  category: string;
  description: string;
}

interface UploadedImage {
  storageId: Id<'_storage'>;
  url: string;
}

export const ProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const existingProduct = useQuery(
    api.products.getById,
    id ? { id: id as Id<'products'> } : 'skip'
  );

  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const generateUploadUrl = useMutation(api.products.generateProductImageUploadUrl);

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormValues>({
    defaultValues: {
      name: '',
      price: '',
      category: '',
      description: '',
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingProduct) {
      reset({
        name: existingProduct.name,
        price: String(existingProduct.price),
        category: existingProduct.category ?? '',
        description: existingProduct.description ?? '',
      });

      if (existingProduct.imageStorageIds && existingProduct.imageUrls) {
        const loaded: UploadedImage[] = existingProduct.imageStorageIds
          .map((storageId, i) => ({
            storageId,
            url: existingProduct.imageUrls[i] ?? '',
          }))
          .filter((img) => img.url.length > 0);
        setImages(loaded);
      }
    }
  }, [existingProduct, reset]);

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const newImages: UploadedImage[] = [];

      for (const file of Array.from(files)) {
        const postUrl = await generateUploadUrl({});

        const uploadResponse = await fetch(postUrl, {
          method: 'POST',
          headers: { 'Content-Type': file.type },
          body: file,
        });

        if (!uploadResponse.ok) {
          throw new Error(`Upload failed: ${uploadResponse.statusText}`);
        }

        const json = (await uploadResponse.json()) as { storageId: string };
        const storageId = json.storageId as Id<'_storage'>;

        // Get the URL for preview
        const previewUrl = URL.createObjectURL(file);
        newImages.push({ storageId, url: previewUrl });
      }

      setImages((prev) => [...prev, ...newImages]);
    } catch (err) {
      console.error('Image upload failed:', err);
      setSubmitError(err instanceof Error ? err.message : 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDragIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;

    setImages((prev) => {
      const updated = [...prev];
      const [moved] = updated.splice(dragIndex, 1);
      updated.splice(index, 0, moved);
      return updated;
    });
    setDragIndex(index);
  };

  const handleDragEnd = () => {
    setDragIndex(null);
  };

  const onSubmit = async (values: ProductFormValues) => {
    setSubmitError(null);

    const price = parseFloat(values.price);
    if (isNaN(price) || price < 0) {
      setSubmitError('Price must be a valid positive number.');
      return;
    }

    const imageStorageIds = images.map((img) => img.storageId);

    try {
      if (isEditing && id) {
        await updateProduct({
          id: id as Id<'products'>,
          name: values.name,
          price,
          category: values.category || undefined,
          description: values.description || undefined,
          imageStorageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
        });
      } else {
        await createProduct({
          name: values.name,
          price,
          category: values.category || undefined,
          description: values.description || undefined,
          imageStorageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
        });
      }

      navigate('/admin/products');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to save product';
      setSubmitError(message);
    }
  };

  const isLoading = isEditing && existingProduct === undefined;

  const pageTitle = useMemo(() => {
    if (isEditing) {
      return existingProduct ? `Edit: ${existingProduct.name}` : 'Edit Product';
    }
    return 'New Product';
  }, [isEditing, existingProduct]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Loading product...</p>
      </div>
    );
  }

  if (isEditing && existingProduct === null) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">Product not found.</p>
        <button
          onClick={() => navigate('/admin/products')}
          className="text-amber-600 hover:text-amber-700 font-medium text-sm"
        >
          Back to products
        </button>
      </div>
    );
  }

  return (
    <section className="max-w-2xl">
      <button
        onClick={() => navigate('/admin/products')}
        className="inline-flex items-center gap-1 text-sm text-stone-500 hover:text-stone-700 mb-4 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to products
      </button>

      <h1 className="text-2xl font-bold text-stone-900 mb-6">{pageTitle}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">
            Product Name <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              errors.name ? 'border-red-400' : 'border-stone-300'
            }`}
            placeholder="e.g. Oak Cutting Board"
            {...register('name', { required: 'Product name is required' })}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-stone-700 mb-1">
            Price (RON) <span className="text-red-500">*</span>
          </label>
          <input
            id="price"
            type="number"
            step="0.01"
            min="0"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              errors.price ? 'border-red-400' : 'border-stone-300'
            }`}
            placeholder="0.00"
            {...register('price', { required: 'Price is required' })}
          />
          {errors.price && (
            <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-stone-700 mb-1">
            Category
          </label>
          <input
            id="category"
            type="text"
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="e.g. Kitchen"
            {...register('category')}
          />
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            rows={4}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
            placeholder="Describe the product..."
            {...register('description')}
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Images
          </label>

          {/* Image grid */}
          {images.length > 0 && (
            <div className="grid grid-cols-3 gap-3 mb-3 sm:grid-cols-4">
              {images.map((img, index) => (
                <div
                  key={`${img.storageId}-${index}`}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`relative group aspect-square rounded-lg overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all ${
                    dragIndex === index
                      ? 'border-amber-500 opacity-50'
                      : 'border-stone-200 hover:border-stone-300'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={`Product image ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 rounded-full bg-red-600 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Remove image ${index + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-70 transition-opacity">
                    <GripVertical className="h-4 w-4 text-white drop-shadow" />
                  </div>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Main
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload area */}
          <label
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
              uploading
                ? 'border-amber-400 bg-amber-50'
                : 'border-stone-300 hover:border-stone-400 bg-white'
            }`}
          >
            <Upload className="h-6 w-6 text-stone-400 mb-2" />
            <span className="text-sm text-stone-500">
              {uploading ? 'Uploading...' : 'Click to upload images'}
            </span>
            <span className="text-xs text-stone-400 mt-1">PNG, JPG, WebP</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading}
              onChange={(e) => handleFileUpload(e.target.files)}
            />
          </label>
        </div>

        {/* Error */}
        {submitError && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{submitError}</p>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            type="submit"
            disabled={isSubmitting || uploading}
            className="rounded-lg bg-amber-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 transition-colors"
          >
            {isSubmitting
              ? 'Saving...'
              : isEditing
                ? 'Update Product'
                : 'Create Product'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="rounded-lg border border-stone-300 px-6 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
};
