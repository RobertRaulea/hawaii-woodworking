import type React from 'react';
import { useEffect, useMemo, useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useMutation, useQuery } from 'convex/react';
import { Upload, X, ArrowLeft, GripVertical, AlertCircle } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { compressImages } from '../../../utils/imageCompression.utils';

interface ProductFormValues {
  name: string;
  name_en: string;
  name_de: string;
  price: string;
  sku: string;
  category: string;
  description: string;
  description_en: string;
  description_de: string;
  lowStockThreshold: string;
  trackStock: boolean;
}

interface UploadedImage {
  storageId: Id<'_storage'>;
  url: string;
}

export const ProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const isEditing = Boolean(id);
  const navigate = useNavigate();

  const catalog = useQuery(api.products.listAdmin);
  const existingProduct = isEditing
    ? catalog?.find((product) => product._id === id)
    : undefined;

  const categories = useQuery(api.categories.getAll);
  const categoriesLoading = categories === undefined;

  const createProduct = useMutation(api.products.createProduct);
  const updateProduct = useMutation(api.products.updateProduct);
  const generateUploadUrl = useMutation(api.products.generateProductImageUploadUrl);

  const [images, setImages] = useState<UploadedImage[]>([]);
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
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
      name_en: '',
      name_de: '',
      price: '',
      sku: '',
      category: '',
      description: '',
      description_en: '',
      description_de: '',
      lowStockThreshold: '5',
      trackStock: true,
    },
  });

  // Populate form when editing
  useEffect(() => {
    if (existingProduct) {
      reset({
        name: existingProduct.name,
        name_en: existingProduct.name_en ?? '',
        name_de: existingProduct.name_de ?? '',
        price: String(existingProduct.price),
        sku: existingProduct.sku ?? '',
        category: existingProduct.category ?? '',
        description: existingProduct.description ?? '',
        description_en: existingProduct.description_en ?? '',
        description_de: existingProduct.description_de ?? '',
        lowStockThreshold: String(existingProduct.lowStockThreshold ?? 5),
        trackStock: existingProduct.trackStock ?? true,
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

    setCompressing(true);
    setSubmitError(null);

    try {
      const fileArray = Array.from(files);
      const compressedFiles = await compressImages(fileArray);

      setCompressing(false);
      setUploading(true);

      const newImages: UploadedImage[] = [];

      for (const file of compressedFiles) {
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
      setSubmitError(err instanceof Error ? err.message : 'Încărcarea imaginii a eșuat.');
    } finally {
      setCompressing(false);
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
      setSubmitError('Prețul trebuie să fie un număr pozitiv valid.');
      return;
    }

    const lowStockThreshold = parseInt(values.lowStockThreshold);
    if (isNaN(lowStockThreshold) || lowStockThreshold < 0) {
      setSubmitError('Pragul de stoc minim trebuie să fie un număr valid, mai mare sau egal cu zero.');
      return;
    }

    const imageStorageIds = images.map((img) => img.storageId);

    try {
      if (isEditing && id) {
        await updateProduct({
          id: id as Id<'products'>,
          name: values.name,
          name_ro: values.name || undefined,
          name_en: values.name_en || undefined,
          name_de: values.name_de || undefined,
          price,
          sku: values.sku,
          category: values.category || undefined,
          description: values.description || undefined,
          description_ro: values.description || undefined,
          description_en: values.description_en || undefined,
          description_de: values.description_de || undefined,
          imageStorageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
          lowStockThreshold,
          trackStock: values.trackStock,
        });
      } else {
        await createProduct({
          name: values.name,
          name_en: values.name_en || undefined,
          name_de: values.name_de || undefined,
          price,
          sku: values.sku,
          category: values.category || undefined,
          description: values.description || undefined,
          description_en: values.description_en || undefined,
          description_de: values.description_de || undefined,
          imageStorageIds: imageStorageIds.length > 0 ? imageStorageIds : undefined,
          lowStockThreshold,
          trackStock: values.trackStock,
        });
      }

      navigate('/admin/products');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Salvarea produsului a eșuat.';
      setSubmitError(message);
    }
  };

  const isLoading = isEditing && catalog === undefined;

  const pageTitle = useMemo(() => {
    if (isEditing) {
      return existingProduct ? `Editează: ${existingProduct.name}` : 'Editează produs';
    }
    return 'Produs nou';
  }, [isEditing, existingProduct]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-stone-500">Se încarcă produsul...</p>
      </div>
    );
  }

  if (isEditing && !existingProduct) {
    return (
      <div className="text-center py-20">
        <p className="text-red-600 mb-4">Produsul nu a fost găsit.</p>
        <button
          onClick={() => navigate('/admin/products')}
          className="text-amber-600 hover:text-amber-700 font-medium text-sm"
        >
          Înapoi la produse
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
        Înapoi la produse
      </button>

      <h1 className="text-2xl font-bold text-stone-900 mb-6">{pageTitle}</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Name */}
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-stone-700 mb-1">
            Numele produsului (română) <span className="text-red-500">*</span>
          </label>
          <input
            id="name"
            type="text"
            className={`w-full rounded-lg border px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 ${
              errors.name ? 'border-red-400' : 'border-stone-300'
            }`}
            placeholder="de ex. Tocător din Stejar"
            {...register('name', { required: 'Numele produsului este obligatoriu' })}
          />
          {errors.name && (
            <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
          )}
        </div>

        {/* English Name */}
        <div>
          <label htmlFor="name_en" className="block text-sm font-medium text-stone-700 mb-1">
            Numele produsului (engleză)
          </label>
          <input
            id="name_en"
            type="text"
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="de ex. Oak Cutting Board"
            {...register('name_en')}
          />
        </div>

        {/* German Name */}
        <div>
          <label htmlFor="name_de" className="block text-sm font-medium text-stone-700 mb-1">
            Numele produsului (germană)
          </label>
          <input
            id="name_de"
            type="text"
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="de ex. Eichen Schneidebrett"
            {...register('name_de')}
          />
        </div>

        {/* SKU */}
        <div>
          <label htmlFor="sku" className="block text-sm font-medium text-stone-700 mb-1">
            SKU
          </label>
          <input
            id="sku"
            type="text"
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            placeholder="de ex. TCDS-01"
            {...register('sku')}
          />
          <p className="mt-1 text-xs text-stone-500">
            {isEditing
              ? 'Se normalizează automat la majuscule.'
              : 'Lăsat gol, se generează automat din numele produsului (de ex. TCDS-01).'}
          </p>
        </div>

        {/* Price */}
        <div>
          <label htmlFor="price" className="block text-sm font-medium text-stone-700 mb-1">
            Preț (RON) <span className="text-red-500">*</span>
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
            {...register('price', { required: 'Prețul este obligatoriu' })}
          />
          {errors.price && (
            <p className="mt-1 text-xs text-red-600">{errors.price.message}</p>
          )}
        </div>

        {/* Stock Management */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-stone-50 rounded-lg border border-stone-200">
          <div className="sm:col-span-2">
            <h3 className="text-sm font-semibold text-stone-900 mb-3">Gestionare stoc</h3>
          </div>
          
          {isEditing && existingProduct ? (
            <div className="sm:col-span-2">
              <span className="block text-sm font-medium text-stone-700 mb-1">
                Stare
              </span>
              <p className="w-full rounded-lg border border-stone-200 bg-stone-100 px-3 py-2.5 text-sm text-stone-700">
                {existingProduct.status === 'archived'
                  ? 'Arhivat'
                  : existingProduct.status === 'inactive'
                    ? 'Inactiv'
                    : 'Activ'}
              </p>
            </div>
          ) : null}

          <div>
            <span className="block text-sm font-medium text-stone-700 mb-1">
              Stoc disponibil online
            </span>
            {isEditing ? (
              <p className="w-full rounded-lg border border-stone-200 bg-stone-100 px-3 py-2.5 text-sm text-stone-700 tabular-nums">
                {existingProduct?.stock ?? 0}
              </p>
            ) : null}
            <p className="mt-1 text-xs text-stone-500">
              Stocul se gestionează din{' '}
              <Link to="/admin/inventory" className="text-amber-700 underline">
                Stocuri
              </Link>{' '}
              (intrare, ajustare, inventariere).
            </p>
          </div>

          <div>
            <label htmlFor="lowStockThreshold" className="block text-sm font-medium text-stone-700 mb-1">
              Prag stoc minim
            </label>
            <input
              id="lowStockThreshold"
              type="number"
              min="0"
              step="1"
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
              placeholder="5"
              {...register('lowStockThreshold')}
            />
            <p className="mt-1 text-xs text-stone-500">Alertă când stocul scade sub acest număr</p>
          </div>

          <div className="sm:col-span-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                className="w-4 h-4 rounded border-stone-300 text-amber-600 focus:ring-2 focus:ring-amber-500"
                {...register('trackStock')}
              />
              <span className="text-sm font-medium text-stone-700">Evidențiază stocul pentru acest produs</span>
            </label>
            <p className="mt-1 ml-6 text-xs text-stone-500">Debifează pentru produse nelimitate/digitale</p>
          </div>
        </div>

        {/* Category */}
        <div>
          <label htmlFor="category" className="block text-sm font-medium text-stone-700 mb-1">
            Categorie
          </label>
          {categoriesLoading ? (
            <div className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-400">
              Se încarcă categoriile...
            </div>
          ) : categories && categories.length > 0 ? (
            <select
              id="category"
              className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 focus:outline-none focus:ring-2 focus:ring-amber-500 bg-white"
              {...register('category')}
            >
              <option value="">Alege o categorie</option>
              {categories.map((cat) => (
                <option key={cat._id} value={cat.name}>
                  {cat.name}
                </option>
              ))}
            </select>
          ) : (
            <div className="flex items-center gap-2 w-full rounded-lg border border-amber-300 bg-amber-50 px-3 py-2.5 text-sm text-amber-700">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <span>Nu există categorii. Creează mai întâi o categorie în secțiunea Categorii.</span>
            </div>
          )}
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-medium text-stone-700 mb-1">
            Descriere (română)
          </label>
          <textarea
            id="description"
            rows={4}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
            placeholder="Descriere produs..."
            {...register('description')}
          />
        </div>

        {/* English Description */}
        <div>
          <label htmlFor="description_en" className="block text-sm font-medium text-stone-700 mb-1">
            Descriere (engleză)
          </label>
          <textarea
            id="description_en"
            rows={4}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
            placeholder="Descriere produs în engleză..."
            {...register('description_en')}
          />
        </div>

        {/* German Description */}
        <div>
          <label htmlFor="description_de" className="block text-sm font-medium text-stone-700 mb-1">
            Descriere (germană)
          </label>
          <textarea
            id="description_de"
            rows={4}
            className="w-full rounded-lg border border-stone-300 px-3 py-2.5 text-sm text-stone-900 placeholder:text-stone-400 focus:outline-none focus:ring-2 focus:ring-amber-500 resize-y"
            placeholder="Descriere produs în germană..."
            {...register('description_de')}
          />
        </div>

        {/* Images */}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-2">
            Imagini
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
                    alt={`Imagine produs ${index + 1}`}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
                  <button
                    type="button"
                    onClick={() => removeImage(index)}
                    className="absolute top-1 right-1 rounded-full bg-red-600 p-1 text-white opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label={`Șterge imaginea ${index + 1}`}
                  >
                    <X className="h-3 w-3" />
                  </button>
                  <div className="absolute top-1 left-1 opacity-0 group-hover:opacity-70 transition-opacity">
                    <GripVertical className="h-4 w-4 text-white drop-shadow" />
                  </div>
                  {index === 0 && (
                    <span className="absolute bottom-1 left-1 rounded bg-amber-600 px-1.5 py-0.5 text-[10px] font-medium text-white">
                      Principală
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Upload area */}
          <label
            className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-6 cursor-pointer transition-colors ${
              uploading || compressing
                ? 'border-amber-400 bg-amber-50'
                : 'border-stone-300 hover:border-stone-400 bg-white'
            }`}
          >
            <Upload className="h-6 w-6 text-stone-400 mb-2" />
            <span className="text-sm text-stone-500">
              {compressing ? 'Se comprimă imaginile...' : uploading ? 'Se încarcă...' : 'Apasă pentru a încărca imagini'}
            </span>
            <span className="text-xs text-stone-400 mt-1">PNG, JPG, WebP</span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              disabled={uploading || compressing}
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
              ? 'Se salvează...'
              : isEditing
                ? 'Actualizează produsul'
                : 'Creează produsul'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/admin/products')}
            className="rounded-lg border border-stone-300 px-6 py-2.5 text-sm font-medium text-stone-700 hover:bg-stone-50 transition-colors"
          >
            Anulează
          </button>
        </div>
      </form>
    </section>
  );
};
