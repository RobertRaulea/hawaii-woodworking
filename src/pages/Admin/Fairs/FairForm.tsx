import { useRef, useState } from 'react';
import { useMutation } from 'convex/react';
import { useForm } from 'react-hook-form';
import { api } from '../../../../convex/_generated/api';
import type { Doc, Id } from '../../../../convex/_generated/dataModel';
import { inventoryError } from '../../../utils/inventory.utils';

interface FairFormValues {
  name: string;
  startsOn: string;
  endsOn: string;
}

interface FairFormProps {
  disabled: boolean;
  onCreated: (id: Id<'fairs'>) => void;
  fair?: Doc<'fairs'>;
}

export const FairForm = ({ disabled, onCreated, fair }: FairFormProps) => {
  const createFair = useMutation(api.pos.createFair);
  const updateFair = useMutation(api.pos.updateFair);
  const lock = useRef(false);
  const [error, setError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FairFormValues>({
    defaultValues: {
      name: fair?.name ?? '',
      startsOn: fair?.startsOn ?? '',
      endsOn: fair?.endsOn ?? '',
    },
  });
  return (
    <form
      onSubmit={handleSubmit(async ({ name, startsOn, endsOn }) => {
        if (lock.current || disabled) return;
        lock.current = true;
        setError('');
        try {
          const args = {
            name,
            ...(startsOn ? { startsOn } : {}),
            ...(endsOn ? { endsOn } : {}),
          };
          if (fair) {
            onCreated(await updateFair({ fairId: fair._id, ...args }));
          } else {
            onCreated(await createFair(args));
          }
        } catch (cause) {
          setError(inventoryError(cause));
        } finally {
          lock.current = false;
        }
      })}
    >
      <p className="mb-5 text-sm leading-6 text-stone-500">
        Fiecare târg are propriul stoc. {fair ? 'Modificarea' : 'Crearea'} unui
        târg nu mută automat produse din online.
      </p>
      <label htmlFor="fair-name" className="block text-sm font-medium">
        Numele târgului
      </label>
      <input
        id="fair-name"
        autoFocus
        disabled={disabled || isSubmitting}
        placeholder="De exemplu, Târg Crăciun 2026"
        className="mt-2 w-full rounded-lg border border-stone-300 p-3"
        {...register('name', {
          validate: (name) =>
            (name.trim().length > 0 && name.trim().length <= 100) ||
            'Introdu un nume de cel mult 100 de caractere.',
        })}
      />
      {errors.name ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {errors.name.message}
        </p>
      ) : null}
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="fair-starts-on" className="block text-sm font-medium">
            Început
          </label>
          <input
            id="fair-starts-on"
            type="date"
            disabled={disabled || isSubmitting}
            className="mt-2 w-full rounded-lg border border-stone-300 p-3"
            {...register('startsOn')}
          />
        </div>
        <div>
          <label htmlFor="fair-ends-on" className="block text-sm font-medium">
            Sfârșit
          </label>
          <input
            id="fair-ends-on"
            type="date"
            disabled={disabled || isSubmitting}
            className="mt-2 w-full rounded-lg border border-stone-300 p-3"
            {...register('endsOn')}
          />
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}
      <button
        disabled={disabled || isSubmitting}
        className="mt-5 min-h-12 w-full rounded-xl bg-stone-900 px-4 py-3 font-semibold text-white disabled:opacity-40"
      >
        {isSubmitting
          ? 'Se salvează...'
          : fair
            ? 'Salvează târg'
            : 'Creează târg'}
      </button>
    </form>
  );
};
