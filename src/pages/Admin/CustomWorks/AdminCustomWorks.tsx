import type React from 'react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery } from 'convex/react';
import { ImagePlus, Pencil, X } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { compressImage } from '../../../utils/imageCompression.utils';

interface CustomWorkFormValues {
 title: string;
 price: number;
 description: string;
}

interface CatalogAsset {
 _id: Id<'siteAssets'>;
 name: string;
 category: string;
 url: string;
 title?: string;
 description?: string;
 price?: number;
}

const legacyTitles: Record<string, string> = {
 'test.jpeg': 'Platou 5 locașuri',
 'test (1).jpeg': 'Tavă din lemn',
 'test (2).jpeg': 'Tavă 4 locașuri',
 'test (3).jpeg': 'Icoană',
 'test (4).jpeg': 'Icoană pe CNC',
 'test (5).jpeg': 'Icoană Iisus',
};

export const AdminCustomWorks: React.FC = () => {
 const assets = useQuery(api.siteAssets.getByCategory, { category: 'catalog' });
 const generateUploadUrl = useMutation(api.siteAssets.generateAssetUploadUrl);
 const saveSiteAsset = useMutation(api.siteAssets.saveSiteAsset);
 const [editingAsset, setEditingAsset] = useState<CatalogAsset | null>(null);
 const [selectedFile, setSelectedFile] = useState<File | null>(null);
 const [submitError, setSubmitError] = useState<string | null>(null);
 const [previewUrl, setPreviewUrl] = useState<string | null>(null);

 const {
 register,
 handleSubmit,
 reset,
 formState: { errors, isSubmitting },
 } = useForm<CustomWorkFormValues>({
 defaultValues: { title: '', price: 0, description: '' },
 });

 useEffect(() => {
 if (!previewUrl) return;
 return () => URL.revokeObjectURL(previewUrl);
 }, [previewUrl]);

 const startEditing = (asset: CatalogAsset) => {
 setEditingAsset(asset);
 setSelectedFile(null);
 setPreviewUrl(null);
 reset({
 title: asset.title ?? legacyTitles[asset.name] ?? asset.name.replace(/\.[^/.]+$/, ''),
 price: asset.price ?? 0,
 description: asset.description ?? '',
 });
 setSubmitError(null);
 };

 const resetForm = () => {
 setEditingAsset(null);
 setSelectedFile(null);
 setPreviewUrl(null);
 reset({ title: '', price: 0, description: '' });
 setSubmitError(null);
 };

 const handleFileChange = (file: File | undefined) => {
 setSelectedFile(file ?? null);
 setPreviewUrl(file ? URL.createObjectURL(file) : null);
 };

 const onSubmit = async (values: CustomWorkFormValues) => {
 setSubmitError(null);
 if (!editingAsset && !selectedFile) {
 setSubmitError('Alege o fotografie pentru lucrare înainte de publicare.');
 return;
 }

 try {
 let storageId: Id<'_storage'> | undefined;
 let name = editingAsset?.name;

 if (selectedFile) {
 const compressedFile = await compressImage(selectedFile);
 const uploadUrl = await generateUploadUrl({});
 const response = await fetch(uploadUrl, {
 method: 'POST',
 headers: { 'Content-Type': compressedFile.type },
 body: compressedFile,
 });

 if (!response.ok) {
 throw new Error('Încărcarea imaginii a eșuat. Încearcă din nou.');
 }

 const result = (await response.json()) as { storageId: string };
 storageId = result.storageId as Id<'_storage'>;
 name = editingAsset?.name ?? `${Date.now()}-${compressedFile.name}`;
 }

 await saveSiteAsset({
 name: name ?? '',
 category: 'catalog',
 ...(storageId ? { storageId } : {}),
 title: values.title.trim(),
 price: values.price,
 description: values.description.trim(),
 });

 resetForm();
 } catch (error) {
 setSubmitError(error instanceof Error ? error.message : 'Lucrarea nu a putut fi salvată.');
 }
 };

 const displayedAssets = (assets ?? []) as CatalogAsset[];

 return (
 <section className="mx-auto max-w-6xl">
 <div className="mb-8 border-b border-stone-200 dark:border-stone-800 pb-6">
 <p className="text-xs font-semibold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-400 ">Portofoliu</p>
 <h1 className="mt-2 font-serif text-3xl font-medium text-stone-900 dark:text-stone-50 ">Lucrări la comandă</h1>
 <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600 dark:text-stone-300 ">
 Publică proiectele finalizate cu fotografia, prețul și o descriere scurtă. Lucrările vor apărea în secțiunea publică „La comandă”.
 </p>
 </div>

 <div className="grid gap-8 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
 <form onSubmit={handleSubmit(onSubmit)} className="h-fit rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-5 shadow-sm md:p-6">
 <div className="mb-5 flex items-center justify-between">
 <h2 className="font-serif text-xl text-stone-900 dark:text-stone-50 ">
 {editingAsset ? 'Editează lucrarea' : 'Adaugă o lucrare'}
 </h2>
 {editingAsset && (
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={resetForm}
 className="rounded-full text-stone-500 dark:text-stone-400hover:text-stone-900 dark:hover:text-stone-50"
 aria-label="Anulează editarea"
 >
 <X className="h-4 w-4" />
 </Button>
 )}
 </div>

 <label className="mb-5 flex min-h-44 cursor-pointer flex-col items-center justify-center overflow-hidden rounded-lg border border-dashed border-stone-300 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-center transition hover:border-amber-500 hover:bg-amber-50/40 dark:hover:bg-amber-950/60">
 {previewUrl ? (
 <img src={previewUrl} alt="Previzualizare lucrare" className="h-44 w-full object-cover" />
 ) : editingAsset ? (
 <img src={editingAsset.url} alt={editingAsset.title ?? 'Lucrare existentă'} className="h-44 w-full object-cover" />
 ) : (
 <span className="flex flex-col items-center gap-2 px-4 py-8 text-sm text-stone-500 dark:text-stone-400 ">
 <ImagePlus className="h-7 w-7 text-amber-700 dark:text-amber-400 " />
 Încarcă fotografia lucrării
 </span>
 )}
 <input
 type="file"
 accept="image/*"
 className="sr-only"
 onChange={(event) => handleFileChange(event.target.files?.[0])}
 />
 </label>
 {editingAsset && <p className="-mt-3 mb-4 text-xs text-stone-500 dark:text-stone-400 ">Alege o fotografie nouă pentru a o înlocui pe cea actuală.</p>}

 <div className="space-y-4">
 <div>
 <Label htmlFor="work-title" className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300 ">Numele lucrării</Label>
 <Input
 id="work-title"
 {...register('title', { required: 'Adaugă un nume pentru lucrare.' })}
 className="h-auto w-full rounded-lg px-3.5 py-2.5 focus:border-amber-600 focus:ring-amber-100"
 placeholder="Ex: Tavă din stejar cu gravură"
 />
 {errors.title && <p className="mt-1 text-xs text-red-600 dark:text-red-400 ">{errors.title.message}</p>}
 </div>

 <div>
 <Label htmlFor="work-price" className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300 ">Preț (RON)</Label>
 <Input
 id="work-price"
 type="number"
 min="0"
 step="0.01"
 {...register('price', {
 valueAsNumber: true,
 required: 'Adaugă prețul lucrării.',
 min: { value: 0, message: 'Prețul nu poate fi negativ.' },
 })}
 className="h-auto w-full rounded-lg px-3.5 py-2.5 focus:border-amber-600 focus:ring-amber-100"
 placeholder="250"
 />
 {errors.price && <p className="mt-1 text-xs text-red-600 dark:text-red-400 ">{errors.price.message}</p>}
 </div>

 <div>
 <Label htmlFor="work-description" className="mb-1.5 block text-sm font-medium text-stone-700 dark:text-stone-300 ">Descriere scurtă</Label>
 <Textarea
 id="work-description"
 rows={3}
 maxLength={240}
 {...register('description', {
 required: 'Scrie câteva cuvinte despre lucrare.',
 maxLength: { value: 240, message: 'Descrierea poate avea cel mult 240 de caractere.' },
 })}
 className="w-full resize-y rounded-lg px-3.5 py-2.5 focus:border-amber-600 focus:ring-amber-100"
 placeholder="Material, finisaj sau detaliul special al comenzii..."
 />
 {errors.description && <p className="mt-1 text-xs text-red-600 dark:text-red-400 ">{errors.description.message}</p>}
 </div>
 </div>

 {submitError && (
 <Alert variant="destructive" className="mt-4">
 <AlertDescription>{submitError}</AlertDescription>
 </Alert>
 )}
 <Button
 variant="secondary"
 type="submit"
 disabled={isSubmitting}
 className="mt-5 h-auto w-full rounded-lg px-4 py-3 text-sm font-medium hover:bg-amber-800 disabled:cursor-wait"
 >
 {isSubmitting ? 'Se publică...' : editingAsset ? 'Salvează modificările' : 'Publică lucrarea'}
 </Button>
 </form>

 <div>
 <div className="mb-4 flex items-end justify-between">
 <h2 className="font-serif text-xl text-stone-900 dark:text-stone-50 ">Lucrări publicate</h2>
 <span className="text-xs text-stone-500 dark:text-stone-400 ">{displayedAssets.length} în galerie</span>
 </div>
 {assets === undefined ? (
 <div className="rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-8 text-center text-sm text-stone-500 dark:text-stone-400 ">Se încarcă lucrările...</div>
 ) : displayedAssets.length === 0 ? (
 <div className="rounded-xl border border-dashed border-stone-300 dark:border-stone-700 bg-white dark:bg-stone-900 p-8 text-center text-sm text-stone-500 dark:text-stone-400 ">
 Nu ai publicat încă nicio lucrare.
 </div>
 ) : (
 <div className="space-y-3">
 {displayedAssets.map((asset) => (
 <article key={asset._id} className="flex gap-4 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 p-3 shadow-sm">
 <img src={asset.url} alt={asset.title ?? asset.name} className="h-20 w-24 shrink-0 rounded-lg object-cover" />
 <div className="min-w-0 flex-1 py-1">
 <h3 className="truncate font-medium text-stone-900 dark:text-stone-50 ">{asset.title ?? asset.name}</h3>
 <p className="mt-1 text-sm font-semibold text-amber-800 dark:text-amber-300 ">
 {asset.price === undefined ? 'Preț necompletat' : `${asset.price.toFixed(2)} RON`}
 </p>
 {asset.description && <p className="mt-1 line-clamp-2 text-xs leading-5 text-stone-500 dark:text-stone-400 ">{asset.description}</p>}
 </div>
 <Button
 type="button"
 variant="ghost"
 size="icon"
 onClick={() => startEditing(asset)}
 className="h-auto w-auto self-start rounded-md p-2 text-stone-500 dark:text-stone-400hover:text-stone-900 dark:hover:text-stone-50"
 aria-label={`Editează ${asset.title ?? asset.name}`}
 >
 <Pencil className="h-4 w-4" />
 </Button>
 </article>
 ))}
 </div>
 )}
 </div>
 </div>
 </section>
 );
};
