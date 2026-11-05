import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import {
 Controller,
 useFieldArray,
 useForm,
} from 'react-hook-form';
import { Plus, Trash2 } from 'lucide-react';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useStaffAccess } from '../../../hooks/useStaffAccess';
import { useTransferAction } from '../../../hooks/useTransferAction';
import { SearchableSelect } from '../../../components/SearchableSelect/SearchableSelect';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { FieldLabel } from '@/components/ui/field';
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select';
import { Textarea } from '@/components/ui/textarea';
import {
 endpointFromValue,
 endpointValue,
 WORKSHOP,
} from '../../../utils/transfer.utils';

interface LineForm {
 productName: string;
 quantity: number;
}

interface TransferFormValues {
 from: string;
 to: string;
 note: string;
 lines: LineForm[];
}


const TransferForm = () => {
 const { id } = useParams();
 const navigate = useNavigate();
 const [searchParams] = useSearchParams();
 const { can, userId } = useStaffAccess();
 const controller = useTransferAction(userId);
 const overview = useQuery(api.pos.getStockOverview);
 const products = useQuery(api.products.getAll);
 const detail = useQuery(
 api.transfers.get,
 id ? { transferId: id as Id<'transfers'> } : 'skip',
 );
 const editing = Boolean(id);
 const requestMode =
 searchParams.get('mode') === 'request' || !can('transfers.execute');
 const fairs = useMemo(
 () => (overview?.fairs ?? []).filter((fair) => fair.active),
 [overview],
 );
 const tracked = useMemo(
 () =>
 (products ?? [])
 .filter((product) => product.trackStock !== false)
 .map((product) => ({
 name: product.name_ro || product.name,
 id: product._id,
 image: product.imageUrls?.[0] ?? product.images?.[0] ?? null,
 })),
 [products],
 );
 const productNames = useMemo(
 () => tracked.map((product) => product.name),
 [tracked],
 );
 const idByName = useMemo(
 () => new Map(tracked.map((product) => [product.name, product.id])),
 [tracked],
 );
 const nameById = useMemo(
 () => new Map(tracked.map((product) => [product.id, product.name])),
 [tracked],
 );
 const imageByName = useMemo(
 () => new Map(tracked.map((product) => [product.name, product.image])),
 [tracked],
 );

 const {
 register,
 control,
 handleSubmit,
 setError,
 reset,
 formState: { errors },
 } = useForm<TransferFormValues>({
 defaultValues: {
 from: WORKSHOP,
 to: '',
 note: '',
 lines: [{ productName: '', quantity: 1 }],
 },
 });
 const { fields, append, remove } = useFieldArray({ control, name: 'lines' });

 const prefilled = useRef(false);
 const paramProductId = searchParams.get('productId');
 const paramFrom = searchParams.get('from');
 const paramTo = searchParams.get('to');
 useEffect(() => {
 if (editing) {
 const transfer = detail?.transfer;
 if (!transfer || prefilled.current) return;
 prefilled.current = true;
 reset({
 from: endpointValue(transfer.fromLocation, transfer.fromFairId),
 to: endpointValue(transfer.toLocation, transfer.toFairId),
 note: transfer.note ?? '',
 lines: transfer.lines.map((line) => ({
 productName: line.productName,
 quantity: line.quantity,
 })),
 });
 return;
 }
 if (prefilled.current) return;
 if (paramProductId && nameById.size === 0) return;
 prefilled.current = true;
 reset({
 from: paramFrom ?? WORKSHOP,
 to: paramTo ?? '',
 note: '',
 lines: [
 {
 productName: paramProductId
 ? (nameById.get(paramProductId as Id<'products'>) ?? '')
 : '',
 quantity: 1,
 },
 ],
 });
 }, [editing, detail, reset, paramProductId, paramFrom, paramTo, nameById]);

 useEffect(() => {
 if (controller.completed)
 navigate(`/admin/transfers/${controller.completed.transferId}`, {
 replace: true,
 });
 }, [controller.completed, navigate]);

 const onSubmit = (values: TransferFormValues) => {
 const names = values.lines.map((line) => line.productName);
 if (new Set(names).size !== names.length) {
 setError('lines', {
 type: 'duplicate',
 message: 'Un produs nu poate apărea de două ori.',
 });
 return;
 }
 const lines = values.lines.map((line) => ({
 productId: idByName.get(line.productName) as Id<'products'>,
 quantity: Number(line.quantity),
 }));
 const note = values.note.trim() || undefined;
 if (requestMode && !editing) {
 if (!values.to || values.to === WORKSHOP) {
 setError('to', {
 type: 'required',
 message: 'Selectează târgul destinație.',
 });
 return;
 }
 void controller.start({
 kind: 'requested',
 toFairId: values.to as Id<'fairs'>,
 lines,
 note,
 });
 return;
 }
 if (values.from === values.to || !values.to) {
 setError('to', {
 type: 'same',
 message: 'Sursa și destinația trebuie să difere.',
 });
 return;
 }
 const from = endpointFromValue(values.from) as
 | { location: 'workshop' }
 | { location: 'fair'; fairId: Id<'fairs'> };
 const to = endpointFromValue(values.to) as
 | { location: 'workshop' }
 | { location: 'fair'; fairId: Id<'fairs'> };
 if (editing && id) {
 void controller.start({
 kind: 'updated',
 transferId: id as Id<'transfers'>,
 from,
 to,
 lines,
 note,
 });
 return;
 }
 void controller.start({ kind: 'created', from, to, lines, note });
 };

 const endpointOptions = (
 <>
 <NativeSelectOption value={WORKSHOP}>Atelier</NativeSelectOption>
 {fairs.map((fair) => (
 <NativeSelectOption key={fair._id} value={fair._id}>
 {fair.name}
 </NativeSelectOption>
 ))}
 </>
 );

 if (editing && detail === undefined)
 return <p className="text-sm text-muted-foreground">Se încarcă…</p>;
 if (editing && detail === null)
 return (
 <p className="text-sm text-muted-foreground">
 Transferul nu este disponibil pentru acest cont.
 </p>
 );

 return (
 <section className="max-w-3xl space-y-6">
 <div>
 <Link
 to="/admin/transfers"
 className="text-sm text-amber-700 dark:text-amber-400 hover:underline"
 >
 ← Transferuri
 </Link>
 <h1 className="mt-1 text-2xl md:text-3xl font-medium font-serif text-foreground">
 {editing
 ? 'Editează transferul'
 : requestMode
 ? 'Solicită reaprovizionare'
 : 'Transfer nou'}
 </h1>
 </div>

 <form
 onSubmit={handleSubmit(onSubmit)}
 className="space-y-5 rounded-lg border border-border bg-card p-5"
 >
 {requestMode && !editing ? (
 <div>
 <FieldLabel variant="caps" htmlFor="transfer-to">
 Târg destinație
 </FieldLabel>
 <NativeSelect
 id="transfer-to"
 wrapperClassName="w-full"
 {...register('to', { required: 'Selectează târgul destinație.' })}
 >
 <NativeSelectOption value="">Selectează…</NativeSelectOption>
 {fairs.map((fair) => (
 <NativeSelectOption key={fair._id} value={fair._id}>
 {fair.name}
 </NativeSelectOption>
 ))}
 </NativeSelect>
 {errors.to && (
 <p className="mt-1 text-xs text-red-600 dark:text-red-400 ">{errors.to.message}</p>
 )}
 </div>
 ) : (
 <div className="grid gap-4 md:grid-cols-2">
 <div>
 <FieldLabel variant="caps" htmlFor="transfer-from">
 Sursă
 </FieldLabel>
 <NativeSelect
 id="transfer-from"
 wrapperClassName="w-full"
 {...register('from', { required: true })}
 >
 {endpointOptions}
 </NativeSelect>
 </div>
 <div>
 <FieldLabel variant="caps" htmlFor="transfer-to">
 Destinație
 </FieldLabel>
 <NativeSelect
 id="transfer-to"
 wrapperClassName="w-full"
 {...register('to', { required: 'Selectează destinația.' })}
 >
 <NativeSelectOption value="">Selectează…</NativeSelectOption>
 {endpointOptions}
 </NativeSelect>
 {errors.to && (
 <p className="mt-1 text-xs text-red-600 dark:text-red-400 ">{errors.to.message}</p>
 )}
 </div>
 </div>
 )}

 <fieldset className="space-y-3">
 <legend className="block text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5">Produse</legend>
 {fields.map((field, index) => (
 <div key={field.id} className="flex items-start gap-3">
 <div className="grow">
 <Controller
 control={control}
 name={`lines.${index}.productName`}
 rules={{ required: 'Selectează un produs.' }}
 render={({ field: controllerField }) => (
 <SearchableSelect
 label={index === 0 ? 'Produs' : ' '}
 id={`transfer-line-${index}`}
 options={productNames}
 optionImages={imageByName}
 value={controllerField.value}
 onChange={controllerField.onChange}
 error={errors.lines?.[index]?.productName?.message}
 required
 />
 )}
 />
 </div>
 <div className="w-28">
 <FieldLabel variant="caps"
 htmlFor={`transfer-qty-${index}`}
 >
 Cantitate
 </FieldLabel>
 <Input
 id={`transfer-qty-${index}`}
 type="number"
 min={1}
 max={10000}
 step={1}
 className="h-auto w-full rounded-md px-3.5 py-2.5"
 {...register(`lines.${index}.quantity`, {
 valueAsNumber: true,
 required: true,
 min: 1,
 max: 10000,
 })}
 />
 </div>
 <Button
 type="button"
 variant="outline"
 size="icon"
 onClick={() => remove(index)}
 disabled={fields.length <= 1}
 aria-label="Șterge produsul"
 className="mt-7 size-10 rounded-md"
 >
 <Trash2 className="size-4" />
 </Button>
 </div>
 ))}
 {errors.lines && (
 <p className="text-xs text-red-600 dark:text-red-400 ">{errors.lines.message}</p>
 )}
 <Button
 type="button"
 variant="outline"
 onClick={() => append({ productName: '', quantity: 1 })}
 disabled={fields.length >= 50}
 className="gap-1.5 rounded-md px-3 py-2 text-sm"
 >
 <Plus className="size-4" /> Adaugă produs
 </Button>
 </fieldset>

 <div>
 <FieldLabel variant="caps" htmlFor="transfer-note">
 Notă (opțional)
 </FieldLabel>
 <Textarea
 id="transfer-note"
 rows={2}
 className="w-full rounded-md px-3.5 py-2.5"
 {...register('note')}
 />
 </div>

 {controller.error && (
 <Alert variant="destructive" className="rounded-md">
 <AlertDescription>
 {controller.error}
 {controller.pending && (
 <Button
 type="button"
 variant="destructive"
 size="sm"
 onClick={() => void controller.retry()}
 className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium hover:bg-red-700"
 >
 Reîncearcă
 </Button>
 )}
 </AlertDescription>
 </Alert>
 )}
 {controller.blocked && !controller.error && (
 <p className="text-sm text-amber-700 dark:text-amber-400 ">
 O acțiune anterioară așteaptă confirmarea.
 </p>
 )}

 <div className="flex justify-end gap-2">
 <Button
 type="button"
 variant="outline"
 onClick={() => navigate(-1)}
 className="rounded-md"
 >
 Renunță
 </Button>
 <Button variant="brand"
 type="submit"
 disabled={
 controller.busy || controller.blocked || !controller.online
 }
 className="rounded-md px-5"
 >
 {controller.busy
 ? 'Se trimite…'
 : editing
 ? 'Salvează'
 : requestMode
 ? 'Trimite solicitarea'
 : 'Creează transferul'}
 </Button>
 </div>
 </form>
 </section>
 );
};

export default TransferForm;
