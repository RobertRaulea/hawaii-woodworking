import { useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from 'convex/react';
import {
  Controller,
  useFieldArray,
  useForm,
} from 'react-hook-form';
import { PlusIcon, TrashIcon } from '@heroicons/react/24/outline';
import { api } from '../../../../convex/_generated/api';
import type { Id } from '../../../../convex/_generated/dataModel';
import { useStaffAccess } from '../../../hooks/useStaffAccess';
import { useTransferAction } from '../../../hooks/useTransferAction';
import { SearchableSelect } from '../../../components/SearchableSelect/SearchableSelect';
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

const fieldClass =
  'w-full rounded-md border border-stone-300 bg-white px-3.5 py-2.5 text-sm text-stone-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/40';
const labelClass =
  'block text-xs font-medium uppercase tracking-wide text-stone-500 mb-1.5';

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
      <option value={WORKSHOP}>Atelier</option>
      {fairs.map((fair) => (
        <option key={fair._id} value={fair._id}>
          {fair.name}
        </option>
      ))}
    </>
  );

  if (editing && detail === undefined)
    return <p className="text-sm text-stone-500">Se încarcă…</p>;
  if (editing && detail === null)
    return (
      <p className="text-sm text-stone-500">
        Transferul nu este disponibil pentru acest cont.
      </p>
    );

  return (
    <section className="max-w-3xl space-y-6">
      <div>
        <Link
          to="/admin/transfers"
          className="text-sm text-amber-700 hover:underline"
        >
          ← Transferuri
        </Link>
        <h1 className="mt-1 text-2xl font-semibold text-stone-900">
          {editing
            ? 'Editează transferul'
            : requestMode
              ? 'Solicită reaprovizionare'
              : 'Transfer nou'}
        </h1>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="space-y-5 rounded-lg border border-stone-200 bg-white p-5"
      >
        {requestMode && !editing ? (
          <div>
            <label htmlFor="transfer-to" className={labelClass}>
              Târg destinație
            </label>
            <select
              id="transfer-to"
              className={fieldClass}
              {...register('to', { required: 'Selectează târgul destinație.' })}
            >
              <option value="">Selectează…</option>
              {fairs.map((fair) => (
                <option key={fair._id} value={fair._id}>
                  {fair.name}
                </option>
              ))}
            </select>
            {errors.to && (
              <p className="mt-1 text-xs text-red-600">{errors.to.message}</p>
            )}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="transfer-from" className={labelClass}>
                Sursă
              </label>
              <select
                id="transfer-from"
                className={fieldClass}
                {...register('from', { required: true })}
              >
                {endpointOptions}
              </select>
            </div>
            <div>
              <label htmlFor="transfer-to" className={labelClass}>
                Destinație
              </label>
              <select
                id="transfer-to"
                className={fieldClass}
                {...register('to', { required: 'Selectează destinația.' })}
              >
                <option value="">Selectează…</option>
                {endpointOptions}
              </select>
              {errors.to && (
                <p className="mt-1 text-xs text-red-600">{errors.to.message}</p>
              )}
            </div>
          </div>
        )}

        <fieldset className="space-y-3">
          <legend className={labelClass}>Produse</legend>
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
                      value={controllerField.value}
                      onChange={controllerField.onChange}
                      error={errors.lines?.[index]?.productName?.message}
                      required
                    />
                  )}
                />
              </div>
              <div className="w-28">
                <label
                  htmlFor={`transfer-qty-${index}`}
                  className={labelClass}
                >
                  Cantitate
                </label>
                <input
                  id={`transfer-qty-${index}`}
                  type="number"
                  min={1}
                  max={10000}
                  step={1}
                  className={fieldClass}
                  {...register(`lines.${index}.quantity`, {
                    valueAsNumber: true,
                    required: true,
                    min: 1,
                    max: 10000,
                  })}
                />
              </div>
              <button
                type="button"
                onClick={() => remove(index)}
                disabled={fields.length <= 1}
                aria-label="Șterge produsul"
                className="mt-7 flex h-10 w-10 items-center justify-center rounded-md border border-stone-300 text-stone-500 hover:bg-stone-50 disabled:opacity-30"
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </div>
          ))}
          {errors.lines && (
            <p className="text-xs text-red-600">{errors.lines.message}</p>
          )}
          <button
            type="button"
            onClick={() => append({ productName: '', quantity: 1 })}
            disabled={fields.length >= 50}
            className="inline-flex items-center gap-1.5 rounded-md border border-stone-300 px-3 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            <PlusIcon className="h-4 w-4" /> Adaugă produs
          </button>
        </fieldset>

        <div>
          <label htmlFor="transfer-note" className={labelClass}>
            Notă (opțional)
          </label>
          <textarea
            id="transfer-note"
            rows={2}
            className={fieldClass}
            {...register('note')}
          />
        </div>

        {controller.error && (
          <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            <p>{controller.error}</p>
            {controller.pending && (
              <button
                type="button"
                onClick={() => void controller.retry()}
                className="mt-2 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white"
              >
                Reîncearcă
              </button>
            )}
          </div>
        )}
        {controller.blocked && !controller.error && (
          <p className="text-sm text-amber-700">
            O acțiune anterioară așteaptă confirmarea.
          </p>
        )}

        <div className="flex justify-end gap-2">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-md border border-stone-300 px-4 py-2 text-sm text-stone-700 hover:bg-stone-50"
          >
            Renunță
          </button>
          <button
            type="submit"
            disabled={
              controller.busy || controller.blocked || !controller.online
            }
            className="rounded-md bg-amber-600 px-5 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-40"
          >
            {controller.busy
              ? 'Se trimite…'
              : editing
                ? 'Salvează'
                : requestMode
                  ? 'Trimite solicitarea'
                  : 'Creează transferul'}
          </button>
        </div>
      </form>
    </section>
  );
};

export default TransferForm;
